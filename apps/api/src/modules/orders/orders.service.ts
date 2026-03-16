import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { AuditSeverity, BuyerType, OrderStatus } from '@prisma/client'
import {
  isValidCnpj,
  isValidCpf,
  sanitizeDocument,
} from '../../common/utils/document-validation.util'
import { sanitizePlainText } from '../../common/utils/input-hardening.util'
import type { RequestContext } from '../../common/utils/request-context.util'
import { PrismaService } from '../../database/prisma.service'
import type { AuthContext } from '../auth/auth.types'
import { CurrencyService } from '../currency/currency.service'
import { GeocodingService } from '../geocoding/geocoding.service'
import { AuditLogService } from '../monitoring/audit-log.service'
import { CreateOrderDto } from './dto/create-order.dto'
import { ListOrdersQueryDto } from './dto/list-orders.query'
import { roundCurrency, toOrderRecord } from './orders.types'

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currencyService: CurrencyService,
    private readonly geocodingService: GeocodingService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async listForUser(auth: AuthContext, query: ListOrdersQueryDto) {
    const snapshot = await this.currencyService.getSnapshot()
    const limit = query.limit ?? 10
    const where = {
      userId: auth.userId,
      ...(query.includeCancelled ? {} : { status: OrderStatus.COMPLETED }),
    }

    const [orders, totalsBase] = await Promise.all([
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
      this.prisma.order.findMany({
        where: {
          userId: auth.userId,
        },
        include: {
          items: true,
        },
        orderBy: {
          createdAt: 'desc',
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
    const completedOrderRecords = totalsBase
      .filter((order) => order.status === OrderStatus.COMPLETED)
      .map((order) =>
        toOrderRecord(order, {
          displayCurrency: auth.preferredCurrency,
          currencyService: this.currencyService,
          snapshot,
        }),
      )
    const cancelledOrders = totalsBase.filter((order) => order.status === OrderStatus.CANCELLED)

    return {
      items: orderRecords,
      totals: {
        completedOrders: completedOrderRecords.length,
        cancelledOrders: cancelledOrders.length,
        realizedRevenue: roundCurrency(
          completedOrderRecords.reduce((total, order) => total + order.totalRevenue, 0),
        ),
        realizedProfit: roundCurrency(
          completedOrderRecords.reduce((total, order) => total + order.totalProfit, 0),
        ),
        soldUnits: completedOrderRecords.reduce(
          (total, order) => total + order.items.reduce((subtotal, item) => subtotal + item.quantity, 0),
          0,
        ),
      },
    }
  }

  async createForUser(auth: AuthContext, dto: CreateOrderDto, context: RequestContext) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: dto.productId,
        userId: auth.userId,
        active: true,
      },
    })

    if (!product) {
      throw new NotFoundException('Produto nao encontrado para esta conta.')
    }

    if (product.stock < dto.quantity) {
      throw new BadRequestException('Estoque insuficiente para concluir a venda.')
    }

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
    const buyerCountry = sanitizePlainText(dto.buyerCountry, 'Pais da venda', {
      allowEmpty: false,
      rejectFormula: true,
    })!
    const channel = sanitizePlainText(dto.channel, 'Canal', {
      allowEmpty: true,
      rejectFormula: true,
    })
    const notes = sanitizePlainText(dto.notes, 'Observacoes', {
      allowEmpty: true,
      rejectFormula: false,
    })
    const orderCurrency = dto.currency ?? product.currency
    const snapshot = await this.currencyService.getSnapshot()
    const unitCost = this.currencyService.convert(
      Number(product.unitCost),
      product.currency,
      orderCurrency,
      snapshot,
    )
    const unitPrice =
      dto.unitPrice ??
      this.currencyService.convert(
        Number(product.unitPrice),
        product.currency,
        orderCurrency,
        snapshot,
      )

    if (dto.buyerType === BuyerType.PERSON && !isValidCpf(buyerDocument)) {
      throw new BadRequestException('Informe um CPF valido para a compra em nome de pessoa.')
    }

    if (dto.buyerType === BuyerType.COMPANY && !isValidCnpj(buyerDocument)) {
      throw new BadRequestException('Informe um CNPJ valido para a compra em nome de empresa.')
    }

    const seller = dto.sellerEmployeeId
      ? await this.prisma.employee.findFirst({
          where: {
            id: dto.sellerEmployeeId,
            userId: auth.userId,
            active: true,
          },
        })
      : null

    if (dto.sellerEmployeeId && !seller) {
      throw new BadRequestException('Selecione um funcionario ativo para registrar esta venda.')
    }

    const geocodedLocation = await this.resolveBuyerLocation({
      district: buyerDistrict,
      city: buyerCity,
      state: buyerState,
      country: buyerCountry,
    })
    const totalRevenue = roundCurrency(unitPrice * dto.quantity)
    const totalCost = roundCurrency(unitCost * dto.quantity)
    const totalProfit = roundCurrency(totalRevenue - totalCost)

    const order = await this.prisma.$transaction(async (transaction) => {
      await transaction.product.update({
        where: { id: product.id },
        data: {
          stock: {
            decrement: dto.quantity,
          },
        },
      })

      return transaction.order.create({
        data: {
          userId: auth.userId,
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
          totalItems: dto.quantity,
          items: {
            create: {
              productId: product.id,
              productName: product.name,
              category: product.category,
              quantity: dto.quantity,
              currency: orderCurrency,
              unitCost,
              unitPrice,
              lineRevenue: totalRevenue,
              lineCost: totalCost,
              lineProfit: totalProfit,
            },
          },
        },
        include: {
          items: true,
        },
      })
    })

    await this.auditLogService.record({
      actorUserId: auth.userId,
      event: 'order.created',
      resource: 'order',
      resourceId: order.id,
      metadata: {
        productId: product.id,
        productName: product.name,
        quantity: dto.quantity,
        totalRevenue,
        totalProfit,
        buyerType: dto.buyerType,
        currency: orderCurrency,
        buyerLocation:
          geocodedLocation?.label ??
          [buyerDistrict, buyerCity, buyerState, buyerCountry].filter(Boolean).join(', '),
        sellerCode: seller?.employeeCode,
        sellerName: seller?.displayName,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return {
      order: toOrderRecord(order, {
        displayCurrency: auth.preferredCurrency,
        currencyService: this.currencyService,
        snapshot,
      }),
    }
  }

  async cancelForUser(auth: AuthContext, orderId: string, context: RequestContext) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId: auth.userId,
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
        await transaction.product.update({
          where: { id: item.productId },
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

    return {
      order: toOrderRecord(cancelledOrder, {
        displayCurrency: auth.preferredCurrency,
        currencyService: this.currencyService,
        snapshot,
      }),
    }
  }

  private async resolveBuyerLocation(input: {
    district: string | null
    city: string
    state: string | null
    country: string
  }) {
    const existingOrder = await this.prisma.order.findFirst({
      where: {
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
}
