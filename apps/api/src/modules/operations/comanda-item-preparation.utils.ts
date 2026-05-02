import { BadRequestException, NotFoundException } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { roundCurrency } from '../../common/utils/number-rounding.util'
import { sanitizePlainText } from '../../common/utils/input-hardening.util'
import { isKitchenCategory } from '../../common/utils/is-kitchen-category.util'
import type { PrismaService } from '../../database/prisma.service'
import type { AddComandaItemDto, AddComandaItemsBatchDto } from './operations.schemas'
import { toNumberOrZero } from './operations-domain.utils'

type ComandaItemProduct = {
  id: string
  name: string
  unitPrice: Prisma.Decimal | number | null
  category: string
  requiresKitchen: boolean
}

type PreparedComandaItem = {
  productId: string | null
  productName: string
  quantity: number
  unitPrice: number
  totalAmount: number
  notes: string | null
  requiresKitchen: boolean
  kitchenQueuedAt: Date | null
}

export async function prepareComandaItemForCreate(
  prisma: PrismaService,
  workspaceOwnerUserId: string,
  dto: AddComandaItemDto,
): Promise<PreparedComandaItem> {
  const product = dto.productId
    ? await prisma.product.findFirst({
        where: {
          id: dto.productId,
          userId: workspaceOwnerUserId,
          active: true,
        },
        select: {
          id: true,
          name: true,
          unitPrice: true,
          category: true,
          requiresKitchen: true,
        },
      })
    : null

  if (dto.productId && !product) {
    throw new NotFoundException('Produto nao encontrado para esta conta.')
  }

  return buildPreparedComandaItem(dto, product, new Date())
}

export async function prepareComandaItemsForBatchCreate(
  prisma: PrismaService,
  workspaceOwnerUserId: string,
  items: AddComandaItemsBatchDto['items'],
): Promise<PreparedComandaItem[]> {
  const uniqueProductIds = Array.from(
    new Set(items.map((item) => item.productId).filter((productId): productId is string => Boolean(productId))),
  )
  const products = uniqueProductIds.length
    ? await prisma.product.findMany({
        where: {
          id: { in: uniqueProductIds },
          userId: workspaceOwnerUserId,
          active: true,
        },
        select: {
          id: true,
          name: true,
          unitPrice: true,
          category: true,
          requiresKitchen: true,
        },
      })
    : []
  const productMap = new Map(products.map((product) => [product.id, product]))
  const missingProductId = uniqueProductIds.find((productId) => !productMap.has(productId))
  if (missingProductId) {
    throw new NotFoundException('Produto nao encontrado para esta conta.')
  }

  const now = new Date()
  return items.map((item) =>
    buildPreparedComandaItem(item, item.productId ? productMap.get(item.productId) : null, now),
  )
}

export function selectDraftProductIds(items: Array<{ productId?: string | null | undefined }>) {
  return items.flatMap((item) => (item.productId ? [item.productId] : []))
}

export function selectDraftStockSelections(items: Array<{ productId?: string | null | undefined; quantity: number }>) {
  return items.flatMap((item) => (item.productId ? [{ productId: item.productId, quantity: item.quantity }] : []))
}

function buildPreparedComandaItem(
  item: AddComandaItemDto,
  product: ComandaItemProduct | null | undefined,
  now: Date,
): PreparedComandaItem {
  const { productId, productName, unitPrice } = product ? resolveLinkedItem(item, product) : resolveManualItem(item)
  const requiresKitchen = product ? product.requiresKitchen || isKitchenCategory(product.category) : false
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
    requiresKitchen,
    kitchenQueuedAt: requiresKitchen ? now : null,
  }
}

function resolveLinkedItem(item: AddComandaItemDto, product: ComandaItemProduct) {
  return {
    productId: product.id,
    productName: product.name,
    unitPrice: resolveComandaItemUnitPrice(product, item.unitPrice),
  }
}

function resolveManualItem(item: AddComandaItemDto) {
  const productName = sanitizePlainText(item.productName, 'Nome do item da comanda', {
    allowEmpty: false,
    rejectFormula: true,
  })

  if (!productName) {
    throw new BadRequestException('Informe o nome do item quando o produto nao estiver vinculado ao catalogo.')
  }

  return {
    productId: null,
    productName,
    unitPrice: resolveComandaItemUnitPrice(undefined, item.unitPrice),
  }
}

function resolveComandaItemUnitPrice(
  product: { unitPrice: Prisma.Decimal | number | null } | undefined,
  unitPrice: number | undefined,
) {
  if (product) {
    return roundCurrency(unitPrice ?? toNumberOrZero(product.unitPrice))
  }

  if (unitPrice === undefined) {
    throw new BadRequestException('Informe o valor unitario quando o item nao estiver vinculado ao catalogo.')
  }

  return roundCurrency(unitPrice)
}
