import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { AuditSeverity, OrderStatus } from '@prisma/client'
import type { RequestContext } from '../../common/utils/request-context.util'
import { PrismaService } from '../../database/prisma.service'
import type { AuthContext } from '../auth/auth.types'
import { AuditLogService } from '../monitoring/audit-log.service'
import { CreateOrderDto } from './dto/create-order.dto'
import { ListOrdersQueryDto } from './dto/list-orders.query'
import { roundCurrency, toOrderRecord } from './orders.types'

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async listForUser(auth: AuthContext, query: ListOrdersQueryDto) {
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

    const completedOrders = totalsBase.filter((order) => order.status === OrderStatus.COMPLETED)
    const cancelledOrders = totalsBase.filter((order) => order.status === OrderStatus.CANCELLED)

    return {
      items: orders.map(toOrderRecord),
      totals: {
        completedOrders: completedOrders.length,
        cancelledOrders: cancelledOrders.length,
        realizedRevenue: roundCurrency(completedOrders.reduce((total, order) => total + Number(order.totalRevenue), 0)),
        realizedProfit: roundCurrency(completedOrders.reduce((total, order) => total + Number(order.totalProfit), 0)),
        soldUnits: completedOrders.reduce(
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

    const unitCost = Number(product.unitCost)
    const unitPrice = Number(product.unitPrice)
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
          customerName: dto.customerName?.trim() || null,
          channel: dto.channel?.trim() || null,
          notes: dto.notes?.trim() || null,
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
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return {
      order: toOrderRecord(order),
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

    return {
      order: toOrderRecord(cancelledOrder),
    }
  }
}
