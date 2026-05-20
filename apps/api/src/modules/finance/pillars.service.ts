import { Injectable } from '@nestjs/common'
import { CurrencyCode } from '@prisma/client'
import { assertOwnerRole, resolveWorkspaceOwnerUserId } from '../../common/utils/workspace-access.util'
import { PrismaService } from '../../database/prisma.service'
import { CacheService } from '../../common/services/cache.service'
import type { AuthContext } from '../auth/auth.types'
import { CurrencyService } from '../currency/currency.service'
import {
  buildPillarPeriods,
  buildPillarsResponse,
  type PillarOrderGroups,
  type PillarPeriods,
  PILLARS_STALE_TTL_SECONDS,
  type PillarsOrder,
  pillarsOrderSelect,
  type PillarsResponse,
} from './pillars-summary.builder'

export type { PillarMetric, PillarsResponse } from './pillars-summary.builder'

@Injectable()
export class PillarsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currencyService: CurrencyService,
    private readonly cache: CacheService,
  ) {}

  static pillarsKey(userId: string): string {
    return `finance:pillars:${userId}`
  }

  async invalidatePillarsCache(userId: string): Promise<void> {
    await this.cache.del(PillarsService.pillarsKey(userId))
  }

  async getPillarsForUser(auth: AuthContext): Promise<PillarsResponse> {
    assertOwnerRole(auth, 'Apenas o dono pode acessar os indicadores executivos.')
    const workspaceUserId = resolveWorkspaceOwnerUserId(auth)
    const cacheKey = PillarsService.pillarsKey(workspaceUserId)

    const cached = await this.cache.get<PillarsResponse>(cacheKey)
    if (cached) {
      return cached
    }

    const result = await this.buildPillars(workspaceUserId, auth.preferredCurrency || CurrencyCode.BRL)

    await this.cache.set(cacheKey, result, PILLARS_STALE_TTL_SECONDS)

    return result
  }

  private async buildPillars(userId: string, userPref: CurrencyCode): Promise<PillarsResponse> {
    const periods = buildPillarPeriods(new Date())
    const [snapshot, orders] = await Promise.all([
      this.currencyService.getSnapshot(),
      this.loadPillarOrders(userId, periods),
    ])

    return buildPillarsResponse({
      currencyService: this.currencyService,
      displayCurrency: userPref,
      now: periods.now,
      orders,
      snapshot,
    })
  }

  private async loadPillarOrders(userId: string, periods: PillarPeriods): Promise<PillarOrderGroups> {
    const [currentWeekOrders, previousWeekOrders, currentMonthOrders, previousMonthOrders] = await Promise.all([
      this.findCompletedOrders(userId, { gte: periods.currentWeekStart }),
      this.findCompletedOrders(userId, { gte: periods.previousWeekStart, lt: periods.previousWeekEnd }),
      this.findCompletedOrders(userId, { gte: periods.currentMonthStart }),
      this.findCompletedOrders(userId, { gte: periods.previousMonthStart, lt: periods.previousMonthEnd }),
    ])

    return {
      currentWeekOrders,
      previousWeekOrders,
      currentMonthOrders,
      previousMonthOrders,
    }
  }

  private async findCompletedOrders(userId: string, createdAt: { gte: Date; lt?: Date }): Promise<PillarsOrder[]> {
    return this.prisma.order.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        createdAt,
      },
      select: pillarsOrderSelect,
    })
  }
}
