import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { AuditSeverity, BuyerType, OrderStatus, Prisma } from '@prisma/client'
import type { Request } from 'express'
import {
  isValidCnpj,
  isValidCpf,
  sanitizeDocument,
} from '../../common/utils/document-validation.util'
import { assertOwnerRole, resolveWorkspaceOwnerUserId } from '../../common/utils/workspace-access.util'
import { sanitizePlainText } from '../../common/utils/input-hardening.util'
import type { RequestContext } from '../../common/utils/request-context.util'
import { PrismaService } from '../../database/prisma.service'
import type { AuthContext } from '../auth/auth.types'
import { AdminPinService } from '../admin-pin/admin-pin.service'
import { CurrencyService } from '../currency/currency.service'
import { GeocodingService } from '../geocoding/geocoding.service'
import { AuditLogService } from '../monitoring/audit-log.service'
import { CreateOrderDto } from './dto/create-order.dto'
import { ListOrdersQueryDto } from './dto/list-orders.query'
import { roundCurrency, roundPercent } from '../../common/utils/number-rounding.util'
import { toOrderRecord } from './orders.types'
import { CacheService } from '../../common/services/cache.service'

const MAX_STAFF_DISCOUNT_PERCENT = 15

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currencyService: CurrencyService,
    private readonly geocodingService: GeocodingService,
    private readonly auditLogService: AuditLogService,
    private readonly adminPinService: AdminPinService,
    private readonly cache: CacheService,
  ) {}

  async listForUser(auth: AuthContext, query: ListOrdersQueryDto) {
    const workspaceUserId = resolveWorkspaceOwnerUserId(auth)
    const limit = query.limit ?? 10
    const hasFilters = !!(query.includeCancelled || (query.limit && query.limit !== 10))

    if (!hasFilters) {
      const cached = await this.cache.get<{ items: ReturnType<typeof toOrderRecord>[]; totals: { completedOrders: number; cancelledOrders: number; realizedRevenue: number; realizedProfit: number; soldUnits: number } }>(
        CacheService.ordersKey(workspaceUserId),
      )
      if (cached) return cached
    }

    const snapshot = await this.currencyService.getSnapshot()
    const where = {
      userId: workspaceUserId,
      ...(query.includeCancelled ? {} : { status: OrderStatus.COMPLETED }),
    }

    const [orders, completedAgg, cancelledCount, soldUnitsAgg] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          items: true,
        },
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
      toOrderRecord(order, {
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

    if (!hasFilters) {
      void this.cache.set(CacheService.ordersKey(workspaceUserId), result, 90)
    }

    return result
  }

  async invalidateOrdersCache(userId: string) {
    await this.cache.del(CacheService.ordersKey(userId))
  }


  async createForUser(
    auth: AuthContext,
    dto: CreateOrderDto,
    context: RequestContext,
    request: Request,
  ) {
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
    })
    const productsById = new Map(products.map((product) => [product.id, product]))

    for (const item of requestedItems) {
      const product = productsById.get(item.productId)

      if (!product) {
        throw new NotFoundException(`O item ${item.index + 1} referencia um produto que nao existe nesta conta.`)
      }
    }

    const requestedStockByProduct = new Map<string, number>()
    for (const item of requestedItems) {
      requestedStockByProduct.set(
        item.productId,
        (requestedStockByProduct.get(item.productId) ?? 0) + item.quantity,
      )
    }

    this.assertRequestedStockAvailability(productsById, requestedStockByProduct)

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
    const buyerCountry = sanitizePlainText(dto.buyerCountry ?? 'Brasil', 'Pais da venda', {
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

    const seller =
      auth.role === 'STAFF'
        ? await this.prisma.employee.findFirst({
            where: {
              userId: workspaceUserId,
              loginUserId: auth.userId,
              active: true,
            },
          })
        : dto.sellerEmployeeId
          ? await this.prisma.employee.findFirst({
              where: {
                id: dto.sellerEmployeeId,
                userId: workspaceUserId,
                active: true,
              },
            })
          : null

    if (auth.role === 'STAFF' && !seller) {
      throw new ForbiddenException(
        'Seu acesso de funcionario precisa estar vinculado a um colaborador ativo para registrar vendas.',
      )
    }

    if (auth.role !== 'STAFF' && dto.sellerEmployeeId && !seller) {
      throw new BadRequestException('Selecione um funcionario ativo para registrar esta venda.')
    }

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

      const unitCost = this.currencyService.convert(
        Number(product.unitCost),
        product.currency,
        orderCurrency,
        snapshot,
      )
      const defaultUnitPrice = this.currencyService.convert(
        Number(product.unitPrice),
        product.currency,
        orderCurrency,
        snapshot,
      )
      const unitPrice = item.unitPrice ?? defaultUnitPrice
      const discounted = unitPrice < defaultUnitPrice
      const discountPercent =
        discounted && defaultUnitPrice > 0
          ? roundPercent(((defaultUnitPrice - unitPrice) / defaultUnitPrice) * 100)
          : 0
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
    const totalRevenue = roundCurrency(
      preparedItems.reduce((total, item) => total + item.lineRevenue, 0),
    )
    const totalCost = roundCurrency(preparedItems.reduce((total, item) => total + item.lineCost, 0))
    const totalProfit = roundCurrency(totalRevenue - totalCost)
    const totalItems = preparedItems.reduce((total, item) => total + item.quantity, 0)

    const order = await this.prisma.$transaction(async (transaction) => {
      for (const [productId, requestedQuantity] of requestedStockByProduct.entries()) {
        const product = productsById.get(productId)
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
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    })

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
          geocodedLocation?.label ??
          [buyerDistrict, buyerCity, buyerState, buyerCountry].filter(Boolean).join(', '),
        sellerCode: seller?.employeeCode,
        sellerName: seller?.displayName,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    void this.cache.del(this.cache.financeKey(workspaceUserId))
    void this.invalidateOrdersCache(workspaceUserId)

    return {
      order: toOrderRecord(order, {
        displayCurrency: auth.preferredCurrency,
        currencyService: this.currencyService,
        snapshot,
      }),
    }
  }

  async cancelForUser(auth: AuthContext, orderId: string, context: RequestContext) {
    assertOwnerRole(auth, 'Apenas o dono pode cancelar vendas ja registradas.')
    const workspaceUserId = resolveWorkspaceOwnerUserId(auth)
    const order = await this.prisma.order.findFirst({
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
      throw new BadRequestException('Este pedido ja foi cancelado.')
    }

    const cancelledOrder = await this.prisma.$transaction(async (transaction) => {
      for (const item of order.items) {
        await transaction.product.updateMany({
          where: {
            id: item.productId,
            userId: workspaceUserId,
          },
          data: {
            stock: {
              increment: item.quantity,
            },
          },
        })
      }

      return transaction.order.update({
        where: {
          id: order.id,
        },
        data: {
          status: OrderStatus.CANCELLED,
          cancelledAt: new Date(),
        },
        include: {
          items: true,
        },
      })
    })

    await this.auditLogService.record({
      actorUserId: auth.userId,
      event: 'order.cancelled',
      resource: 'order',
      resourceId: cancelledOrder.id,
      severity: AuditSeverity.WARN,
      metadata: {
        totalItems: cancelledOrder.totalItems,
        totalRevenue: Number(cancelledOrder.totalRevenue),
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    const snapshot = await this.currencyService.getSnapshot()

    void this.cache.del(this.cache.financeKey(workspaceUserId))
    void this.invalidateOrdersCache(workspaceUserId)

    return {
      order: toOrderRecord(cancelledOrder, {
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

    const maxDiscountPercent = discountedItems.reduce(
      (current, item) => Math.max(current, item.discountPercent),
      0,
    )

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
