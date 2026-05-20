import { Injectable, Optional } from '@nestjs/common'
import type { Request } from 'express'
import type { RequestContext } from '../../common/utils/request-context.util'
import { CacheService } from '../../common/services/cache.service'
import { PrismaService } from '../../database/prisma.service'
import type { AuthContext } from '../auth/auth.types'
import { AdminPinService } from '../admin-pin/admin-pin.service'
import { CurrencyService } from '../currency/currency.service'
import type { FinanceService } from '../finance/finance.service'
import { GeocodingService } from '../geocoding/geocoding.service'
import { AuditLogService } from '../monitoring/audit-log.service'
import type { CreateOrderDto } from './dto/create-order.dto'
import type { ListOrdersQueryDto } from './dto/list-orders.query'
import { cancelOrderForUser } from './orders-cancel.command'
import { invalidateOrdersCache } from './orders-cache.utils'
import { createOrderForUser } from './orders-create.command'
import { listOrdersForUser } from './orders-list.query'
import type { OrdersServiceDependencies } from './orders-service.types'

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
    return listOrdersForUser(this.deps, { auth, query })
  }

  async invalidateOrdersCache(userId: string) {
    await invalidateOrdersCache(this.deps, userId)
  }

  async createForUser(auth: AuthContext, dto: CreateOrderDto, context: RequestContext, request: Request) {
    return createOrderForUser(this.deps, { auth, dto, context, request })
  }

  async cancelForUser(auth: AuthContext, orderId: string, context: RequestContext) {
    return cancelOrderForUser(this.deps, { auth, orderId, context })
  }

  private get deps(): OrdersServiceDependencies {
    return {
      prisma: this.prisma,
      currencyService: this.currencyService,
      geocodingService: this.geocodingService,
      auditLogService: this.auditLogService,
      adminPinService: this.adminPinService,
      cache: this.cache,
      financeService: this.financeService,
    }
  }
}
