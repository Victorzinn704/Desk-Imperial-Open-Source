import { CurrencyCode, type Order } from '@prisma/client'
import { Injectable } from '@nestjs/common'
import { assertOwnerRole } from '../../common/utils/workspace-access.util'
import { roundCurrency } from '../../common/utils/number-rounding.util'
import { PrismaService } from '../../database/prisma.service'
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

@Injectable()
export class PillarsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currencyService: CurrencyService,
  ) {}

  async getPillarsForUser(auth: AuthContext): Promise<PillarsResponse> {
    assertOwnerRole(auth, 'Apenas o dono pode acessar os indicadores executivos.')
    const now = new Date()
    const currentWeekStart = this.getWeekStart(now)
    const previousWeekStart = new Date(currentWeekStart)
    previousWeekStart.setDate(previousWeekStart.getDate() - 7)
    const previousWeekEnd = new Date(currentWeekStart)

    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const previousMonthEnd = currentMonthStart

    const userId = auth.userId
    const userPref = auth.preferredCurrency || CurrencyCode.BRL
    const snapshot = await this.currencyService.getSnapshot()

    // Semana atual vs semana passada
    const [currentWeekOrders, previousWeekOrders] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          userId,
          status: 'COMPLETED',
          createdAt: { gte: currentWeekStart },
        },
      }),
      this.prisma.order.findMany({
        where: {
          userId,
          status: 'COMPLETED',
          createdAt: { gte: previousWeekStart, lt: previousWeekEnd },
        },
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
      }),
      this.prisma.order.findMany({
        where: {
          userId,
          status: 'COMPLETED',
          createdAt: { gte: previousMonthStart, lt: previousMonthEnd },
        },
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

    // Sparkline (últimos 7 dias)
    const last7DaysWeekly = this.getLast7DaysTrend(currentWeekOrders, userPref, snapshot)
    const last7DaysMonthly = this.getLast7DaysTrend(currentMonthOrders, userPref, snapshot)
    const last7DaysProfit = this.getLast7DaysProfitTrend(currentWeekOrders, userPref, snapshot)
    const last7DaysEvent = this.getLast7DaysTrend(currentWeekEventOrders, userPref, snapshot)
    const last7DaysNormal = this.getLast7DaysTrend(currentWeekNormalOrders, userPref, snapshot)

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
    const diff = d.getDate() - day
    return new Date(d.setDate(diff))
  }

  private isEventHour(timestamp: Date): boolean {
    const date = new Date(timestamp)
    const dayOfWeek = date.getDay()
    const hour = date.getHours()

    // Evento: Sexta, sábado, domingo a partir das 16h
    const isEventDay = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0
    return isEventDay && hour >= 16
  }

  private sumRevenue(
    orders: Order[],
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
    orders: Order[],
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

  private getLast7DaysTrend(
    orders: Order[],
    displayCurrency: CurrencyCode,
    snapshot: Awaited<ReturnType<CurrencyService['getSnapshot']>>,
  ): number[] {
    const trend: number[] = []
    const now = new Date()

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)

      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)

      const dayOrders = orders.filter((order) => {
        const orderDate = new Date(order.createdAt)
        return orderDate >= date && orderDate < nextDate
      })

      const dayRevenue = this.sumRevenue(dayOrders, displayCurrency, snapshot)
      trend.push(Math.round(dayRevenue * 100) / 100)
    }

    return trend
  }

  private getLast7DaysProfitTrend(
    orders: Order[],
    displayCurrency: CurrencyCode,
    snapshot: Awaited<ReturnType<CurrencyService['getSnapshot']>>,
  ): number[] {
    const trend: number[] = []
    const now = new Date()

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)

      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)

      const dayOrders = orders.filter((order) => {
        const orderDate = new Date(order.createdAt)
        return orderDate >= date && orderDate < nextDate
      })

      const dayProfit = this.sumProfit(dayOrders, displayCurrency, snapshot)
      trend.push(Math.round(dayProfit * 100) / 100)
    }

    return trend
  }
}
