import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common'
import { AuditSeverity, BuyerType, OrderStatus, Prisma } from '@prisma/client'
import type { Request } from 'express'
import { isValidCnpj, isValidCpf, sanitizeDocument } from '../../common/utils/document-validation.util'
import { assertOwnerRole, resolveWorkspaceOwnerUserId } from '../../common/utils/workspace-access.util'
import { sanitizePlainText } from '../../common/utils/input-hardening.util'
import type { RequestContext } from '../../common/utils/request-context.util'
import { PrismaService } from '../../database/prisma.service'
import type { AuthContext } from '../auth/auth.types'
import { AdminPinService } from '../admin-pin/admin-pin.service'
import { CurrencyService } from '../currency/currency.service'
import { GeocodingService } from '../geocoding/geocoding.service'
import { AuditLogService } from '../monitoring/audit-log.service'
import type { CreateOrderDto } from './dto/create-order.dto'
import type { ListOrdersQueryDto } from './dto/list-orders.query'
import { roundCurrency, roundPercent } from '../../common/utils/number-rounding.util'
import { toOrderRecord } from './orders.types'
import { CacheService } from '../../common/services/cache.service'
import { FinanceService } from '../finance/finance.service'
import {
  buildInventoryProductsById,
  buildProductConsumptionMap,
  calculateEffectiveUnitCost,
} from '../products/product-combo-consumption.util'

const orderProductInventoryInclude = {
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
} as const

const MAX_STAFF_DISCOUNT_PERCENT = 15

const orderItemSelect = {
  id: true,
  productId: true,
  productName: true,
  category: true,
  quantity: true,
  currency: true,
  unitPrice: true,
  unitCost: true,
  lineRevenue: true,
  lineCost: true,
  lineProfit: true,
} as const

const orderListSelect = {
  id: true,
  comandaId: true,
  customerName: true,
  buyerType: true,
  buyerDocument: true,
  buyerDistrict: true,
  buyerCity: true,
  buyerState: true,
  buyerCountry: true,
  employeeId: true,
  sellerCode: true,
  sellerName: true,
  channel: true,
  notes: true,
  currency: true,
  status: true,
  totalRevenue: true,
  totalCost: true,
  totalProfit: true,
  totalItems: true,
  createdAt: true,
  updatedAt: true,
  cancelledAt: true,
} as const

const orderListWithItemsSelect = {
  ...orderListSelect,
  items: {
    select: orderItemSelect,
  },
} as const

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currencyService: CurrencyService,
    private readonly geocodingService: GeocodingService,
    private readonly auditLogService: AuditLogService,
    private readonly adminPinService: AdminPinService,
    private readonly cache: CacheService,
    @Optional() private readonly financeService?: FinanceService,
  ) {}

  async listForUser(auth: AuthContext, query: ListOrdersQueryDto) {
    const workspaceUserId = resolveWorkspaceOwnerUserId(auth)
    const limit = query.limit ?? 10
    const includeCancelled = query.includeCancelled ?? false
    const includeItems = query.includeItems ?? false
    const cacheKey = this.buildOrdersCacheKey(workspaceUserId, includeCancelled, limit, includeItems)

    const cached = await this.cache.get<{
      items: ReturnType<typeof toOrderRecord>[]
      totals: {
        completedOrders: number
        cancelledOrders: number
        realizedRevenue: number
        realizedProfit: number
        soldUnits: number
      }
    }>(cacheKey)
    if (cached) {
      return cached
    }

    const snapshot = await this.currencyService.getSnapshot()
    const where = {
      userId: workspaceUserId,
      ...(includeCancelled ? {} : { status: OrderStatus.COMPLETED }),
    }

    const [orders, completedAgg, cancelledCount, soldUnitsAgg] = await Promise.all([
      this.prisma.order.findMany({
        where,
        select: includeItems ? orderListWithItemsSelect : orderListSelect,
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
      }),
      this.prisma.order.aggregate({
        where: {
          userId: workspaceUserId,
          status: OrderStatus.COMPLETED,
        },
        _count: true,
        _sum: {
          totalRevenue: true,
          totalProfit: true,
          totalItems: true,
        },
      }),
      this.prisma.order.count({
        where: {
          userId: workspaceUserId,
          status: OrderStatus.CANCELLED,
        },
      }),
      this.prisma.orderItem.aggregate({
        where: {
          order: {
            userId: workspaceUserId,
            status: OrderStatus.COMPLETED,
          },
        },
        _sum: {
          quantity: true,
        },
      }),
    ])

    const orderRecords = orders.map((order) =>
      toOrderRecord(order as Parameters<typeof toOrderRecord>[0], {
        displayCurrency: auth.preferredCurrency,
        currencyService: this.currencyService,
        snapshot,
      }),
    )

    const result = {
      items: orderRecords,
      totals: {
        completedOrders: completedAgg._count,
        cancelledOrders: cancelledCount,
        realizedRevenue: roundCurrency(Number(completedAgg._sum.totalRevenue ?? 0)),
        realizedProfit: roundCurrency(Number(completedAgg._sum.totalProfit ?? 0)),
        soldUnits: soldUnitsAgg._sum.quantity ?? 0,
      },
    }

    void this.cache.set(cacheKey, result, 90)

    return result
  }

  async invalidateOrdersCache(userId: string) {
    await Promise.all([
      this.cache.del(CacheService.ordersKey(userId)),
      this.cache.delByPrefix(`${CacheService.ordersKey(userId)}:`),
    ])
  }

  private refreshFinanceSummary(workspaceUserId: string) {
    if (this.financeService) {
      void this.financeService.invalidateAndWarmSummary(workspaceUserId)
      return
    }

    void this.cache.del(CacheService.financeKey(workspaceUserId))
  }

  private buildOrdersCacheKey(
    workspaceUserId: string,
    includeCancelled: boolean,
    limit: number,
    includeItems: boolean,
  ) {
    return `${CacheService.ordersKey(workspaceUserId)}:${includeCancelled ? 'cancelled' : 'completed'}:${includeItems ? 'full' : 'summary'}:${limit}`
  }

  async createForUser(auth: AuthContext, dto: CreateOrderDto, context: RequestContext, request: Request) {
    const workspaceUserId = resolveWorkspaceOwnerUserId(auth)
    const requestedItems = dto.items.map((item, index) => ({
      ...item,
      index,
    }))

    if (!requestedItems.length) {
      throw new BadRequestException('Adicione pelo menos um produto ao pedido.')
    }

    const uniqueProductIds = [...new Set(requestedItems.map((item) => item.productId))]
    const products = await this.prisma.product.findMany({
      where: {
        id: {
          in: uniqueProductIds,
        },
        userId: workspaceUserId,
        active: true,
      },
      include: orderProductInventoryInclude,
    })
    const productsById = new Map(products.map((product) => [product.id, product]))

    for (const item of requestedItems) {
      const product = productsById.get(item.productId)

      if (!product) {
        throw new NotFoundException(`O item ${item.index + 1} referencia um produto que nao existe nesta conta.`)
      }
    }

    const requestedStockByProduct = buildProductConsumptionMap(requestedItems, productsById)
    this.assertRequestedStockAvailability(buildInventoryProductsById(products), requestedStockByProduct)

    const customerName = sanitizePlainText(dto.customerName, 'Comprador', {
      allowEmpty: false,
      rejectFormula: true,
    })!
    const buyerDocument = sanitizeDocument(dto.buyerDocument)
    const buyerDistrict = sanitizePlainText(dto.buyerDistrict, 'Bairro ou regiao', {
      allowEmpty: true,
      rejectFormula: true,
    })
    const buyerCity = sanitizePlainText(dto.buyerCity, 'Cidade da venda', {
      allowEmpty: false,
      rejectFormula: true,
    })!
    const buyerState = sanitizePlainText(dto.buyerState, 'Estado da venda', {
      allowEmpty: true,
      rejectFormula: true,
    })
    const buyerCountry =
      sanitizePlainText(dto.buyerCountry ?? 'Brasil', 'Pais da venda', {
        allowEmpty: false,
        rejectFormula: true,
      }) ?? 'Brasil'
    const channel = sanitizePlainText(dto.channel, 'Canal', {
      allowEmpty: true,
      rejectFormula: true,
    })
    const notes = sanitizePlainText(dto.notes, 'Observacoes', {
      allowEmpty: true,
      rejectFormula: false,
    })
    const orderCurrency = dto.currency ?? auth.preferredCurrency
    const snapshot = await this.currencyService.getSnapshot()

    if (dto.buyerType === BuyerType.PERSON && !isValidCpf(buyerDocument)) {
      throw new BadRequestException('Informe um CPF valido para a compra em nome de pessoa.')
    }

    if (dto.buyerType === BuyerType.COMPANY && !isValidCnpj(buyerDocument)) {
      throw new BadRequestException('Informe um CNPJ valido para a compra em nome de empresa.')
    }

    const seller = await this.resolveOrderSeller(auth, workspaceUserId, dto.sellerEmployeeId)

    const geocodedLocation = await this.resolveBuyerLocation({
      userId: workspaceUserId,
      district: buyerDistrict,
      city: buyerCity,
      state: buyerState,
      country: buyerCountry,
    })
    const preparedItems = requestedItems.map((item) => {
      const product = productsById.get(item.productId)

      if (!product) {
        throw new NotFoundException(`Produto nao encontrado para o item ${item.index + 1}.`)
      }

      const unitCost = calculateEffectiveUnitCost(product, {
        currencyService: this.currencyService,
        displayCurrency: orderCurrency,
        snapshot,
      })
      const defaultUnitPrice = this.currencyService.convert(
        Number(product.unitPrice),
        product.currency,
        orderCurrency,
        snapshot,
      )
      const unitPrice = item.unitPrice ?? defaultUnitPrice
      const discounted = unitPrice < defaultUnitPrice
      const discountPercent =
        discounted && defaultUnitPrice > 0 ? roundPercent(((defaultUnitPrice - unitPrice) / defaultUnitPrice) * 100) : 0
      const lineRevenue = roundCurrency(unitPrice * item.quantity)
      const lineCost = roundCurrency(unitCost * item.quantity)
      const lineProfit = roundCurrency(lineRevenue - lineCost)

      return {
        product,
        quantity: item.quantity,
        unitCost,
        defaultUnitPrice,
        unitPrice,
        discounted,
        discountPercent,
        lineRevenue,
        lineCost,
        lineProfit,
      }
    })
    const discountAuthorization = await this.assertDiscountAuthorization({
      workspaceUserId,
      auth,
      preparedItems,
      request,
    })
    const totalRevenue = roundCurrency(preparedItems.reduce((total, item) => total + item.lineRevenue, 0))
    const totalCost = roundCurrency(preparedItems.reduce((total, item) => total + item.lineCost, 0))
    const totalProfit = roundCurrency(totalRevenue - totalCost)
    const totalItems = preparedItems.reduce((total, item) => total + item.quantity, 0)

    const order = await this.prisma.$transaction(
      async (transaction) => {
        const inventoryProductsById = buildInventoryProductsById(products)

        for (const [productId, requestedQuantity] of requestedStockByProduct.entries()) {
          const product = inventoryProductsById.get(productId)
          const stockUpdate = await transaction.product.updateMany({
            where: {
              id: productId,
              userId: workspaceUserId,
              active: true,
              stock: {
                gte: requestedQuantity,
              },
            },
            data: {
              stock: {
                decrement: requestedQuantity,
              },
            },
          })

          if (stockUpdate.count !== 1) {
            throw new BadRequestException(
              `Estoque insuficiente para ${product?.name ?? 'o produto selecionado'}. Revise a quantidade e tente novamente.`,
            )
          }
        }

        return transaction.order.create({
          data: {
            userId: workspaceUserId,
            customerName,
            buyerType: dto.buyerType,
            buyerDocument,
            buyerDistrict: geocodedLocation?.district ?? buyerDistrict,
            buyerCity: geocodedLocation?.city ?? buyerCity,
            buyerState: geocodedLocation?.state ?? buyerState,
            buyerCountry: geocodedLocation?.country ?? buyerCountry,
            buyerLatitude: geocodedLocation?.latitude,
            buyerLongitude: geocodedLocation?.longitude,
            employeeId: seller?.id,
            sellerCode: seller?.employeeCode,
            sellerName: seller?.displayName,
            channel,
            notes,
            currency: orderCurrency,
            status: OrderStatus.COMPLETED,
            totalRevenue,
            totalCost,
            totalProfit,
            totalItems,
            items: {
              create: preparedItems.map((item) => ({
                productId: item.product.id,
                productName: item.product.name,
                category: item.product.category,
                quantity: item.quantity,
                currency: orderCurrency,
                unitCost: item.unitCost,
                unitPrice: item.unitPrice,
                lineRevenue: item.lineRevenue,
                lineCost: item.lineCost,
                lineProfit: item.lineProfit,
              })),
            },
          },
          include: {
            items: true,
          },
        })
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    )

    await this.auditLogService.record({
      actorUserId: auth.userId,
      event: 'order.created',
      resource: 'order',
      resourceId: order.id,
      metadata: {
        itemCount: preparedItems.length,
        items: preparedItems.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          discounted: item.discounted,
          discountPercent: item.discountPercent,
        })),
        totalRevenue,
        totalProfit,
        totalItems,
        buyerType: dto.buyerType,
        currency: orderCurrency,
        initiatedByRole: auth.role,
        adminPinValidated: discountAuthorization.adminPinValidated,
        discountItemCount: discountAuthorization.discountedItems.length,
        maxDiscountPercent: discountAuthorization.maxDiscountPercent,
        buyerLocation:
          geocodedLocation?.label ?? [buyerDistrict, buyerCity, buyerState, buyerCountry].filter(Boolean).join(', '),
        sellerCode: seller?.employeeCode,
        sellerName: seller?.displayName,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    this.refreshFinanceSummary(workspaceUserId)
    void this.invalidateOrdersCache(workspaceUserId)

    return {
      order: toOrderRecord(order, {
        displayCurrency: auth.preferredCurrency,
        currencyService: this.currencyService,
        snapshot,
      }),
    }
  }

  private async resolveOrderSeller(auth: AuthContext, workspaceUserId: string, sellerEmployeeId?: string) {
    const employeeId = auth.role === 'STAFF' ? auth.employeeId : sellerEmployeeId
    if (!employeeId) {
      return null
    }

    const seller = await this.prisma.employee.findFirst({
      where: { id: employeeId, userId: workspaceUserId, active: true },
    })

    if (auth.role === 'STAFF' && !seller) {
      throw new ForbiddenException(
        'Seu acesso de funcionario precisa estar vinculado a um colaborador ativo para registrar vendas.',
      )
    }

    if (auth.role !== 'STAFF' && sellerEmployeeId && !seller) {
      throw new BadRequestException('Selecione um funcionario ativo para registrar esta venda.')
    }

    return seller
  }

  async cancelForUser(auth: AuthContext, orderId: string, context: RequestContext) {
    assertOwnerRole(auth, 'Apenas o dono pode cancelar vendas ja registradas.')
    const workspaceUserId = resolveWorkspaceOwnerUserId(auth)
    const cancelledAt = new Date()

    const cancellationResult = await this.prisma.$transaction(
      async (transaction) => {
        const order = await transaction.order.findFirst({
          where: {
            id: orderId,
            userId: workspaceUserId,
          },
          include: {
            items: true,
          },
        })

        if (!order) {
          throw new NotFoundException('Pedido nao encontrado para esta conta.')
        }

        if (order.status === OrderStatus.CANCELLED) {
          return {
            order,
            cancelledNow: false,
          }
        }

        const updated = await transaction.order.updateMany({
          where: {
            id: order.id,
            userId: workspaceUserId,
            status: OrderStatus.COMPLETED,
          },
          data: {
            status: OrderStatus.CANCELLED,
            cancelledAt,
          },
        })

        if (updated.count !== 1) {
          const currentOrder = await transaction.order.findFirst({
            where: {
              id: order.id,
              userId: workspaceUserId,
            },
            include: {
              items: true,
            },
          })

          if (currentOrder?.status === OrderStatus.CANCELLED) {
            return {
              order: currentOrder,
              cancelledNow: false,
            }
          }

          throw new ConflictException('Nao foi possivel cancelar este pedido agora. Tente novamente.')
        }

        if (!order.comandaId) {
          const productIds = [
            ...new Set(
              order.items.map((item) => item.productId).filter((productId): productId is string => Boolean(productId)),
            ),
          ]
          const products = productIds.length
            ? await transaction.product.findMany({
                where: {
                  id: { in: productIds },
                  userId: workspaceUserId,
                },
                include: orderProductInventoryInclude,
              })
            : []
          const productsById = new Map(products.map((product) => [product.id, product]))
          const stockToRestore = buildProductConsumptionMap(
            order.items
              .filter((item) => Boolean(item.productId))
              .map((item) => ({
                productId: item.productId!,
                quantity: item.quantity,
              })),
            productsById,
          )

          for (const [productId, quantity] of stockToRestore.entries()) {
            await transaction.product.updateMany({
              where: {
                id: productId,
                userId: workspaceUserId,
              },
              data: {
                stock: {
                  increment: quantity,
                },
              },
            })
          }
        }

        return {
          order: {
            ...order,
            status: OrderStatus.CANCELLED,
            cancelledAt,
          },
          cancelledNow: true,
        }
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    )

    if (cancellationResult.cancelledNow) {
      await this.auditLogService.record({
        actorUserId: auth.userId,
        event: 'order.cancelled',
        resource: 'order',
        resourceId: cancellationResult.order.id,
        severity: AuditSeverity.WARN,
        metadata: {
          totalItems: cancellationResult.order.totalItems,
          totalRevenue: Number(cancellationResult.order.totalRevenue),
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })
    }

    const snapshot = await this.currencyService.getSnapshot()

    if (cancellationResult.cancelledNow) {
      this.refreshFinanceSummary(workspaceUserId)
      void this.invalidateOrdersCache(workspaceUserId)
    }

    return {
      order: toOrderRecord(cancellationResult.order, {
        displayCurrency: auth.preferredCurrency,
        currencyService: this.currencyService,
        snapshot,
      }),
    }
  }

  private assertRequestedStockAvailability(
    productsById: Map<string, { name: string; stock: number }>,
    requestedStockByProduct: Map<string, number>,
  ) {
    for (const [productId, requestedQuantity] of requestedStockByProduct.entries()) {
      const product = productsById.get(productId)

      if (!product) {
        continue
      }

      if (product.stock < requestedQuantity) {
        throw new BadRequestException(
          `Estoque insuficiente para ${product.name}. Disponivel: ${product.stock} und. Solicitado: ${requestedQuantity} und.`,
        )
      }
    }
  }

  private async resolveBuyerLocation(input: {
    userId: string
    district: string | null
    city: string
    state: string | null
    country: string
  }) {
    const existingOrder = await this.prisma.order.findFirst({
      where: {
        userId: input.userId,
        buyerDistrict: input.district,
        buyerCity: input.city,
        buyerState: input.state,
        buyerCountry: input.country,
        buyerLatitude: {
          not: null,
        },
        buyerLongitude: {
          not: null,
        },
      },
      select: {
        buyerDistrict: true,
        buyerCity: true,
        buyerState: true,
        buyerCountry: true,
        buyerLatitude: true,
        buyerLongitude: true,
      },
    })

    if (existingOrder?.buyerLatitude != null && existingOrder?.buyerLongitude != null) {
      return {
        district: existingOrder.buyerDistrict,
        city: existingOrder.buyerCity,
        state: existingOrder.buyerState,
        country: existingOrder.buyerCountry,
        latitude: existingOrder.buyerLatitude,
        longitude: existingOrder.buyerLongitude,
        label: [
          existingOrder.buyerDistrict,
          existingOrder.buyerCity,
          existingOrder.buyerState,
          existingOrder.buyerCountry,
        ]
          .filter(Boolean)
          .join(', '),
      }
    }

    return this.geocodingService.geocodeCityLocation(input)
  }

  private async assertDiscountAuthorization(params: {
    workspaceUserId: string
    auth: AuthContext
    request: Request
    preparedItems: Array<{
      product: {
        id: string
        name: string
      }
      quantity: number
      defaultUnitPrice: number
      unitPrice: number
      discounted: boolean
      discountPercent: number
    }>
  }) {
    const discountedItems = params.preparedItems.filter((item) => item.discounted)

    if (!discountedItems.length) {
      return {
        discountedItems,
        maxDiscountPercent: 0,
        adminPinValidated: false,
      }
    }

    const maxDiscountPercent = discountedItems.reduce((current, item) => Math.max(current, item.discountPercent), 0)

    if (params.auth.role !== 'OWNER' && maxDiscountPercent > MAX_STAFF_DISCOUNT_PERCENT) {
      throw new ForbiddenException('Descontos acima de 15% so podem ser autorizados pelo dono da empresa.')
    }

    const ownerHasPin = await this.adminPinService.hasPinConfigured(params.workspaceUserId)

    if (!ownerHasPin) {
      return {
        discountedItems,
        maxDiscountPercent,
        adminPinValidated: false,
      }
    }

    const proof = this.adminPinService.extractVerificationProof(params.request)
    const valid = await this.adminPinService.validateVerificationProof(params.auth, proof)

    if (!valid) {
      throw new ForbiddenException('Confirme o PIN do dono para aplicar desconto nesta venda.')
    }

    return {
      discountedItems,
      maxDiscountPercent,
      adminPinValidated: true,
    }
  }
}
