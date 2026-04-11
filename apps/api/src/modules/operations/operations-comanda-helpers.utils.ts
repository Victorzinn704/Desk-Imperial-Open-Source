import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'
import { CashClosureStatus, CurrencyCode, OrderStatus, type Prisma } from '@prisma/client'
import { roundCurrency } from '../../common/utils/number-rounding.util'
import { sanitizePlainText } from '../../common/utils/input-hardening.util'
import type { PrismaService } from '../../database/prisma.service'
import type { CurrencyService } from '../currency/currency.service'
import type { ComandaDraftItemDto } from './dto/comanda-draft-item.dto'
import {
  OPEN_COMANDA_STATUSES,
  resolveBuyerTypeFromDocument,
  toNumberOrZero,
} from './operations-domain.utils'
import {
  buildProductConsumptionMap,
  calculateEffectiveUnitCost,
  calculateRawEffectiveUnitCost,
} from '../products/product-combo-consumption.util'

type TransactionClient = Prisma.TransactionClient

export async function resolveComandaBusinessDate(
  transaction: PrismaService | TransactionClient,
  comanda: {
    cashSessionId: string | null
    openedAt: Date
  },
) {
  if (comanda.cashSessionId) {
    const session = await transaction.cashSession.findUnique({
      where: {
        id: comanda.cashSessionId,
      },
      select: {
        businessDate: true,
      },
    })

    if (session) {
      return session.businessDate
    }
  }

  return new Date(comanda.openedAt.getFullYear(), comanda.openedAt.getMonth(), comanda.openedAt.getDate())
}

export async function resolveComandaDraftItems(
  transaction: PrismaService | TransactionClient,
  workspaceOwnerUserId: string,
  items?: ComandaDraftItemDto[],
): Promise<
  Array<{
    productId: string | null
    productName: string
    quantity: number
    unitPrice: number
    totalAmount: number
    notes: string | null
  }>
> {
  if (!items?.length) {
    return []
  }

  const productIds: string[] = []
  const seenProductIds = new Set<string>()
  for (const item of items) {
    if (item.productId && !seenProductIds.has(item.productId)) {
      seenProductIds.add(item.productId)
      productIds.push(item.productId)
    }
  }
  const products = productIds.length
    ? await transaction.product.findMany({
        where: {
          id: {
            in: productIds,
          },
          userId: workspaceOwnerUserId,
          active: true,
        },
        select: {
          id: true,
          name: true,
          unitPrice: true,
        },
      })
    : []
  const productById = new Map(products.map((product) => [product.id, product]))

  const normalizedItems: Array<{
    productId: string | null
    productName: string
    quantity: number
    unitPrice: number
    totalAmount: number
    notes: string | null
  }> = []

  for (const item of items) {
    normalizedItems.push(resolveSingleDraftItem(item, productById))
  }

  return normalizedItems
}

function resolveSingleDraftItem(
  item: ComandaDraftItemDto,
  productById: Map<string, { id: string; name: string; unitPrice: unknown }>,
): {
  productId: string | null
  productName: string
  quantity: number
  unitPrice: number
  totalAmount: number
  notes: string | null
} {
  const { productId, productName, unitPrice } = item.productId
    ? resolveLinkedDraftItem(item, productById)
    : resolveManualDraftItem(item)

  const notes = sanitizePlainText(item.notes, 'Observacoes do item', {
    allowEmpty: true,
    rejectFormula: false,
  })

  return {
    productId,
    productName,
    quantity: item.quantity,
    unitPrice,
    totalAmount: roundCurrency(unitPrice * item.quantity),
    notes,
  }
}

function resolveLinkedDraftItem(
  item: ComandaDraftItemDto,
  productById: Map<string, { id: string; name: string; unitPrice: unknown }>,
) {
  const product = productById.get(item.productId!)
  if (!product) {
    throw new NotFoundException('Produto nao encontrado para esta conta.')
  }
  return {
    productId: product.id as string | null,
    productName: product.name,
    unitPrice: roundCurrency(item.unitPrice ?? toNumberOrZero(product.unitPrice as number)),
  }
}

function resolveManualDraftItem(item: ComandaDraftItemDto) {
  const productName = sanitizePlainText(item.productName, 'Nome do item da comanda', {
    allowEmpty: false,
    rejectFormula: true,
  })!

  if (item.unitPrice === undefined) {
    throw new BadRequestException('Informe o valor unitario quando o item nao estiver vinculado ao catalogo.')
  }

  return {
    productId: null as string | null,
    productName,
    unitPrice: roundCurrency(item.unitPrice),
  }
}

export async function assertOpenTableAvailability(
  transaction: PrismaService | TransactionClient,
  workspaceOwnerUserId: string,
  tableLabel: string,
  currentComandaId?: string,
) {
  const openComanda = await transaction.comanda.findFirst({
    where: {
      companyOwnerId: workspaceOwnerUserId,
      tableLabel,
      status: {
        in: OPEN_COMANDA_STATUSES,
      },
      ...(currentComandaId
        ? {
            id: {
              not: currentComandaId,
            },
          }
        : {}),
    },
    select: {
      id: true,
    },
  })

  if (openComanda) {
    throw new ConflictException('Ja existe uma comanda aberta para esta mesa.')
  }
}

export async function ensureOrderForClosedComanda(
  transaction: TransactionClient,
  workspaceOwnerUserId: string,
  comandaId: string,
  currencyService: CurrencyService | null,
) {
  const existingOrder = await transaction.order.findFirst({
    where: {
      userId: workspaceOwnerUserId,
      comandaId,
    },
    select: {
      id: true,
    },
  })

  if (existingOrder) {
    return existingOrder
  }

  const comanda = await transaction.comanda.findFirst({
    where: {
      id: comandaId,
      companyOwnerId: workspaceOwnerUserId,
    },
    include: {
      currentEmployee: true,
      items: {
        include: {
          product: {
            include: {
              comboComponents: {
                include: {
                  componentProduct: {
                    select: {
                      id: true,
                      name: true,
                      stock: true,
                      unitCost: true,
                      currency: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  })

  if (!comanda) {
    throw new NotFoundException('Comanda nao encontrada para gerar o pedido.')
  }

  const costSnapshot = currencyService ? await currencyService.getSnapshot() : null

  const totalCost = roundCurrency(
    comanda.items.reduce((sum, item) => {
      const unitCost = item.product
        ? currencyService && costSnapshot
          ? calculateEffectiveUnitCost(item.product, {
              currencyService,
              displayCurrency: CurrencyCode.BRL,
              snapshot: costSnapshot,
            })
          : calculateRawEffectiveUnitCost(item.product)
        : 0
      return sum + roundCurrency(unitCost * item.quantity)
    }, 0),
  )
  const totalRevenue = roundCurrency(toNumberOrZero(comanda.totalAmount))
  const totalProfit = roundCurrency(totalRevenue - totalCost)
  const totalItems = comanda.items.reduce((sum, item) => sum + item.quantity, 0)

  const comboAwareProducts = comanda.items
    .map((item) => item.product)
    .filter((product): product is NonNullable<(typeof comanda.items)[number]['product']> => Boolean(product))
  const comboAwareProductsById = new Map(comboAwareProducts.map((product) => [product.id, product]))
  const stockByProduct = buildProductConsumptionMap(
    comanda.items
      .filter((item) => Boolean(item.productId))
      .map((item) => ({
        productId: item.productId!,
        quantity: item.quantity,
      })),
    comboAwareProductsById,
  )

  for (const [productId, qty] of stockByProduct.entries()) {
    await transaction.product.updateMany({
      where: {
        id: productId,
        userId: workspaceOwnerUserId,
        stock: { gte: qty },
      },
      data: { stock: { decrement: qty } },
    })

    await transaction.product.updateMany({
      where: {
        id: productId,
        userId: workspaceOwnerUserId,
        stock: { lt: qty },
      },
      data: { stock: 0 },
    })
  }

  return transaction.order.create({
    data: {
      userId: workspaceOwnerUserId,
      comandaId: comanda.id,
      customerName: comanda.customerName,
      buyerType: resolveBuyerTypeFromDocument(comanda.customerDocument),
      buyerDocument: comanda.customerDocument,
      employeeId: comanda.currentEmployeeId,
      sellerCode: comanda.currentEmployee?.employeeCode ?? null,
      sellerName: comanda.currentEmployee?.displayName ?? null,
      channel: 'COMANDA',
      notes: comanda.notes,
      currency: CurrencyCode.BRL,
      status: OrderStatus.COMPLETED,
      totalRevenue,
      totalCost,
      totalProfit,
      totalItems,
      items: {
        create: comanda.items.map((item) => {
          const unitCost = item.product
            ? currencyService && costSnapshot
              ? calculateEffectiveUnitCost(item.product, {
                  currencyService,
                  displayCurrency: CurrencyCode.BRL,
                  snapshot: costSnapshot,
                })
              : calculateRawEffectiveUnitCost(item.product)
            : 0
          const lineRevenue = roundCurrency(toNumberOrZero(item.totalAmount))
          const lineCost = roundCurrency(unitCost * item.quantity)

          return {
            productId: item.productId,
            productName: item.productName,
            category: item.product?.category ?? 'Comanda manual',
            quantity: item.quantity,
            currency: CurrencyCode.BRL,
            unitCost,
            unitPrice: roundCurrency(toNumberOrZero(item.unitPrice)),
            lineRevenue,
            lineCost,
            lineProfit: roundCurrency(lineRevenue - lineCost),
          }
        }),
      },
    },
  })
}

export async function assertBusinessDayOpen(
  prisma: PrismaService,
  workspaceOwnerUserId: string,
  businessDate: Date,
) {
  const closure = await prisma.cashClosure.findUnique({
    where: {
      companyOwnerId_businessDate: {
        companyOwnerId: workspaceOwnerUserId,
        businessDate,
      },
    },
  })

  if (closure?.status === CashClosureStatus.CLOSED || closure?.status === CashClosureStatus.FORCE_CLOSED) {
    throw new ConflictException('A operacao deste dia ja foi consolidada e nao aceita novas aberturas.')
  }
}
