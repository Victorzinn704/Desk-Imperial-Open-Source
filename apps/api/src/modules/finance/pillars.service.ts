import { CurrencyCode, type Order } from '@prisma/client'
import { Injectable } from '@nestjs/common'
import { assertOwnerRole, resolveWorkspaceOwnerUserId } from '../../common/utils/workspace-access.util'
import { roundCurrency } from '../../common/utils/number-rounding.util'
import { PrismaService } from '../../database/prisma.service'
import { CacheService } from '../../common/services/cache.service'
import type { AuthContext } from '../auth/auth.types'
import { CurrencyService } from '../currency/currency.service'

export interface PillarMetric {
  label: string
  value: number
  currency: string
  previousValue: number
  changePercent: number
  trend: number[] // últimos 7 dias para sparkline
}

export interface PillarsResponse {
  weeklyRevenue: PillarMetric
  monthlyRevenue: PillarMetric
  profit: PillarMetric
  eventRevenue: PillarMetric
  normalRevenue: PillarMetric
}

const PILLARS_STALE_TTL_SECONDS = 300

const pillarsOrderSelect = {
  totalRevenue: true,
  totalProfit: true,
  currency: true,
  createdAt: true,
  status: true,
} as const

type PillarsOrder = Pick<Order, 'totalRevenue' | 'totalProfit' | 'currency' | 'createdAt' | 'status'>

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
    const now = new Date()
    const currentWeekStart = this.getWeekStart(now)
    const previousWeekStart = new Date(currentWeekStart)
    previousWeekStart.setDate(previousWeekStart.getDate() - 7)
    const previousWeekEnd = new Date(currentWeekStart)

    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const previousMonthEnd = currentMonthStart

    const snapshot = await this.currencyService.getSnapshot()

    // Semana atual vs semana passada
    const [currentWeekOrders, previousWeekOrders] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          userId,
          status: 'COMPLETED',
          createdAt: { gte: currentWeekStart },
        },
        select: pillarsOrderSelect,
      }),
      this.prisma.order.findMany({
        where: {
          userId,
          status: 'COMPLETED',
          createdAt: { gte: previousWeekStart, lt: previousWeekEnd },
        },
        select: pillarsOrderSelect,
      }),
    ])

    // Mês atual vs mês passado
    const [currentMonthOrders, previousMonthOrders] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          userId,
          status: 'COMPLETED',
          createdAt: { gte: currentMonthStart },
        },
        select: pillarsOrderSelect,
      }),
      this.prisma.order.findMany({
        where: {
          userId,
          status: 'COMPLETED',
          createdAt: { gte: previousMonthStart, lt: previousMonthEnd },
        },
        select: pillarsOrderSelect,
      }),
    ])

    // Vendas em eventos vs vendas normais (semana atual)
    const currentWeekEventOrders = currentWeekOrders.filter((order) => this.isEventHour(order.createdAt))
    const currentWeekNormalOrders = currentWeekOrders.filter((order) => !this.isEventHour(order.createdAt))

    // Calcular métricas
    const currentWeekRevenue = this.sumRevenue(currentWeekOrders, userPref, snapshot)
    const previousWeekRevenue = this.sumRevenue(previousWeekOrders, userPref, snapshot)
    const currentMonthRevenue = this.sumRevenue(currentMonthOrders, userPref, snapshot)
    const previousMonthRevenue = this.sumRevenue(previousMonthOrders, userPref, snapshot)
    const currentWeekProfit = this.sumProfit(currentWeekOrders, userPref, snapshot)
    const eventRevenue = this.sumRevenue(currentWeekEventOrders, userPref, snapshot)
    const normalRevenue = this.sumRevenue(currentWeekNormalOrders, userPref, snapshot)

    // Sparkline (últimos 7 dias) — pre-bucket orders once, O(N) instead of O(7*N)
    const weeklyBuckets = this.bucketByDay(currentWeekOrders, now)
    const monthlyBuckets = this.bucketByDay(currentMonthOrders, now)
    const eventBuckets = this.bucketByDay(currentWeekEventOrders, now)
    const normalBuckets = this.bucketByDay(currentWeekNormalOrders, now)

    const last7DaysWeekly = this.trendFromBuckets(weeklyBuckets, userPref, snapshot)
    const last7DaysMonthly = this.trendFromBuckets(monthlyBuckets, userPref, snapshot)
    const last7DaysProfit = this.profitTrendFromBuckets(weeklyBuckets, userPref, snapshot)
    const last7DaysEvent = this.trendFromBuckets(eventBuckets, userPref, snapshot)
    const last7DaysNormal = this.trendFromBuckets(normalBuckets, userPref, snapshot)

    return {
      weeklyRevenue: {
        label: 'Vendas Semanal',
        value: Math.round(currentWeekRevenue * 100) / 100,
        currency: userPref,
        previousValue: Math.round(previousWeekRevenue * 100) / 100,
        changePercent:
          previousWeekRevenue > 0
            ? Math.round(((currentWeekRevenue - previousWeekRevenue) / previousWeekRevenue) * 100)
            : 0,
        trend: last7DaysWeekly,
      },
      monthlyRevenue: {
        label: 'Vendas Mensal',
        value: Math.round(currentMonthRevenue * 100) / 100,
        currency: userPref,
        previousValue: Math.round(previousMonthRevenue * 100) / 100,
        changePercent:
          previousMonthRevenue > 0
            ? Math.round(((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100)
            : 0,
        trend: last7DaysMonthly,
      },
      profit: {
        label: 'Lucro',
        value: Math.round(currentWeekProfit * 100) / 100,
        currency: userPref,
        previousValue: 0,
        changePercent: 0,
        trend: last7DaysProfit,
      },
      eventRevenue: {
        label: 'Desempenho em Eventos',
        value: Math.round(eventRevenue * 100) / 100,
        currency: userPref,
        previousValue: 0,
        changePercent: 0,
        trend: last7DaysEvent,
      },
      normalRevenue: {
        label: 'Desempenho Normal',
        value: Math.round(normalRevenue * 100) / 100,
        currency: userPref,
        previousValue: 0,
        changePercent: 0,
        trend: last7DaysNormal,
      },
    }
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date)
    const day = d.getDay()
    const mondayIndex = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + mondayIndex)
    d.setHours(0, 0, 0, 0)
    return d
  }

  private isEventHour(timestamp: Date): boolean {
    const date = new Date(timestamp)
    const dayOfWeek = date.getDay()
    const hour = date.getHours()

    // Evento: Sexta, sábado, domingo a partir das 16h
    const isEventDay = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0
    return isEventDay && hour >= 16
  }

  /**
   * Pre-bucket orders into 7 day slots in a single O(N) pass.
   * Returns a Map<dayIndex, PillarsOrder[]> where dayIndex 0 = 6 days ago, 6 = today.
   */
  private bucketByDay(orders: PillarsOrder[], now: Date): Map<number, PillarsOrder[]> {
    const buckets = new Map<number, PillarsOrder[]>()
    for (let i = 0; i < 7; i++) {
      buckets.set(i, [])
    }

    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const sevenDaysAgoStart = new Date(todayStart)
    sevenDaysAgoStart.setDate(sevenDaysAgoStart.getDate() - 6)

    for (const order of orders) {
      const orderDate = new Date(order.createdAt)
      if (orderDate < sevenDaysAgoStart) {
        continue
      }

      const diffMs = orderDate.getTime() - sevenDaysAgoStart.getTime()
      const dayIndex = Math.min(Math.floor(diffMs / 86_400_000), 6)
      buckets.get(dayIndex)!.push(order)
    }

    return buckets
  }

  private trendFromBuckets(
    buckets: Map<number, PillarsOrder[]>,
    displayCurrency: CurrencyCode,
    snapshot: Awaited<ReturnType<CurrencyService['getSnapshot']>>,
  ): number[] {
    const trend: number[] = []
    for (let i = 0; i < 7; i++) {
      const dayOrders = buckets.get(i) ?? []
      const dayRevenue = this.sumRevenue(dayOrders, displayCurrency, snapshot)
      trend.push(Math.round(dayRevenue * 100) / 100)
    }
    return trend
  }

  private profitTrendFromBuckets(
    buckets: Map<number, PillarsOrder[]>,
    displayCurrency: CurrencyCode,
    snapshot: Awaited<ReturnType<CurrencyService['getSnapshot']>>,
  ): number[] {
    const trend: number[] = []
    for (let i = 0; i < 7; i++) {
      const dayOrders = buckets.get(i) ?? []
      const dayProfit = this.sumProfit(dayOrders, displayCurrency, snapshot)
      trend.push(Math.round(dayProfit * 100) / 100)
    }
    return trend
  }

  private sumRevenue(
    orders: PillarsOrder[],
    displayCurrency: CurrencyCode,
    snapshot: Awaited<ReturnType<CurrencyService['getSnapshot']>>,
  ): number {
    return roundCurrency(
      orders.reduce(
        (sum, order) =>
          sum +
          this.currencyService.convert(Number(order.totalRevenue ?? 0), order.currency, displayCurrency, snapshot),
        0,
      ),
    )
  }

  private sumProfit(
    orders: PillarsOrder[],
    displayCurrency: CurrencyCode,
    snapshot: Awaited<ReturnType<CurrencyService['getSnapshot']>>,
  ): number {
    return roundCurrency(
      orders.reduce(
        (sum, order) =>
          sum + this.currencyService.convert(Number(order.totalProfit ?? 0), order.currency, displayCurrency, snapshot),
        0,
      ),
    )
  }
}
