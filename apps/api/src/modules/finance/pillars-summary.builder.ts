import { CurrencyCode, type Order } from '@prisma/client'
import { roundCurrency } from '../../common/utils/number-rounding.util'
import type { CurrencyService, ExchangeRatesSnapshot } from '../currency/currency.service'

export interface PillarMetric {
  label: string
  value: number
  currency: string
  previousValue: number
  changePercent: number
  trend: number[]
}

export interface PillarsResponse {
  weeklyRevenue: PillarMetric
  monthlyRevenue: PillarMetric
  profit: PillarMetric
  eventRevenue: PillarMetric
  normalRevenue: PillarMetric
}

export const PILLARS_STALE_TTL_SECONDS = 300

export const pillarsOrderSelect = {
  totalRevenue: true,
  totalProfit: true,
  currency: true,
  createdAt: true,
  status: true,
} as const

export type PillarsOrder = Pick<Order, 'totalRevenue' | 'totalProfit' | 'currency' | 'createdAt' | 'status'>

export type PillarPeriods = ReturnType<typeof buildPillarPeriods>

export type PillarOrderGroups = {
  currentWeekOrders: PillarsOrder[]
  previousWeekOrders: PillarsOrder[]
  currentMonthOrders: PillarsOrder[]
  previousMonthOrders: PillarsOrder[]
}

type PillarBuildInput = {
  currencyService: CurrencyService
  displayCurrency: CurrencyCode
  now: Date
  orders: PillarOrderGroups
  snapshot: ExchangeRatesSnapshot
}

type PillarTotals = {
  currentMonthRevenue: number
  currentWeekProfit: number
  currentWeekRevenue: number
  eventRevenue: number
  normalRevenue: number
  previousMonthRevenue: number
  previousWeekRevenue: number
}

type PillarTrends = {
  eventRevenue: number[]
  monthlyRevenue: number[]
  normalRevenue: number[]
  profit: number[]
  weeklyRevenue: number[]
}

type PillarMetricInput = {
  currency: CurrencyCode
  label: string
  previousValue: number
  trend: number[]
  value: number
}
type PillarMetricAmounts = {
  current: number
  previous: number
}
type PillarMetricDraft = {
  amounts: PillarMetricAmounts
  currency: CurrencyCode
  label: string
  trend: number[]
}

export function buildPillarPeriods(now: Date) {
  const currentWeekStart = getWeekStart(now)
  const previousWeekStart = addDays(currentWeekStart, -7)
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  return {
    now,
    currentWeekStart,
    previousWeekStart,
    previousWeekEnd: new Date(currentWeekStart),
    currentMonthStart,
    previousMonthStart: new Date(now.getFullYear(), now.getMonth() - 1, 1),
    previousMonthEnd: currentMonthStart,
  }
}

export function buildPillarsResponse(input: PillarBuildInput): PillarsResponse {
  const eventSplit = splitWeekOrdersByEventHour(input.orders.currentWeekOrders)
  const totals = buildPillarTotals(input, eventSplit)
  const trends = buildPillarTrends(input, eventSplit)

  return {
    weeklyRevenue: buildRevenueMetric({
      label: 'Vendas Semanal',
      value: totals.currentWeekRevenue,
      previousValue: totals.previousWeekRevenue,
      trend: trends.weeklyRevenue,
      currency: input.displayCurrency,
    }),
    monthlyRevenue: buildRevenueMetric({
      label: 'Vendas Mensal',
      value: totals.currentMonthRevenue,
      previousValue: totals.previousMonthRevenue,
      trend: trends.monthlyRevenue,
      currency: input.displayCurrency,
    }),
    profit: buildFlatMetric({
      label: 'Lucro',
      value: totals.currentWeekProfit,
      trend: trends.profit,
      currency: input.displayCurrency,
    }),
    eventRevenue: buildFlatMetric({
      label: 'Desempenho em Eventos',
      value: totals.eventRevenue,
      trend: trends.eventRevenue,
      currency: input.displayCurrency,
    }),
    normalRevenue: buildFlatMetric({
      label: 'Desempenho Normal',
      value: totals.normalRevenue,
      trend: trends.normalRevenue,
      currency: input.displayCurrency,
    }),
  }
}

function buildPillarTotals(
  input: PillarBuildInput,
  eventSplit: ReturnType<typeof splitWeekOrdersByEventHour>,
): PillarTotals {
  return {
    currentWeekRevenue: sumRevenue(input.orders.currentWeekOrders, input),
    previousWeekRevenue: sumRevenue(input.orders.previousWeekOrders, input),
    currentMonthRevenue: sumRevenue(input.orders.currentMonthOrders, input),
    previousMonthRevenue: sumRevenue(input.orders.previousMonthOrders, input),
    currentWeekProfit: sumProfit(input.orders.currentWeekOrders, input),
    eventRevenue: sumRevenue(eventSplit.eventOrders, input),
    normalRevenue: sumRevenue(eventSplit.normalOrders, input),
  }
}

function buildPillarTrends(
  input: PillarBuildInput,
  eventSplit: ReturnType<typeof splitWeekOrdersByEventHour>,
): PillarTrends {
  const weeklyBuckets = bucketByDay(input.orders.currentWeekOrders, input.now)
  const monthlyBuckets = bucketByDay(input.orders.currentMonthOrders, input.now)

  return {
    weeklyRevenue: revenueTrendFromBuckets(weeklyBuckets, input),
    monthlyRevenue: revenueTrendFromBuckets(monthlyBuckets, input),
    profit: profitTrendFromBuckets(weeklyBuckets, input),
    eventRevenue: revenueTrendFromBuckets(bucketByDay(eventSplit.eventOrders, input.now), input),
    normalRevenue: revenueTrendFromBuckets(bucketByDay(eventSplit.normalOrders, input.now), input),
  }
}

function buildRevenueMetric({ label, value, previousValue, trend, currency }: PillarMetricInput): PillarMetric {
  return buildPillarMetric({
    label,
    currency,
    trend,
    amounts: {
      current: value,
      previous: previousValue,
    },
  })
}

function buildPillarMetric({ label, currency, amounts, trend }: PillarMetricDraft): PillarMetric {
  return {
    label,
    value: roundPillarValue(amounts.current),
    currency,
    previousValue: roundPillarValue(amounts.previous),
    changePercent: calculateChangePercent(amounts),
    trend,
  }
}

function buildFlatMetric(input: Omit<PillarMetricInput, 'previousValue'>): PillarMetric {
  return buildRevenueMetric({
    ...input,
    previousValue: 0,
  })
}

function splitWeekOrdersByEventHour(orders: PillarsOrder[]) {
  return {
    eventOrders: orders.filter(isEventHour),
    normalOrders: orders.filter((order) => !isEventHour(order)),
  }
}

function isEventHour(order: PillarsOrder): boolean {
  const date = new Date(order.createdAt)
  const dayOfWeek = date.getDay()
  const hour = date.getHours()
  return isWeekendEventDay(dayOfWeek) && hour >= 16
}

function isWeekendEventDay(dayOfWeek: number) {
  return dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0
}

function bucketByDay(orders: PillarsOrder[], now: Date): Map<number, PillarsOrder[]> {
  const buckets = buildEmptyDayBuckets()
  const sevenDaysAgoStart = getSevenDaysAgoStart(now)

  for (const order of orders) {
    appendOrderToBucket(order, buckets, sevenDaysAgoStart)
  }

  return buckets
}

function buildEmptyDayBuckets() {
  const buckets = new Map<number, PillarsOrder[]>()
  for (let i = 0; i < 7; i++) {
    buckets.set(i, [])
  }
  return buckets
}

function appendOrderToBucket(order: PillarsOrder, buckets: Map<number, PillarsOrder[]>, sevenDaysAgoStart: Date) {
  const orderDate = new Date(order.createdAt)
  if (orderDate < sevenDaysAgoStart) {
    return
  }

  const diffMs = orderDate.getTime() - sevenDaysAgoStart.getTime()
  buckets.get(Math.min(Math.floor(diffMs / 86_400_000), 6))?.push(order)
}

function getSevenDaysAgoStart(now: Date) {
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  return addDays(todayStart, -6)
}

function revenueTrendFromBuckets(buckets: Map<number, PillarsOrder[]>, input: PillarBuildInput): number[] {
  return trendFromBuckets(buckets, input, sumRevenue)
}

function profitTrendFromBuckets(buckets: Map<number, PillarsOrder[]>, input: PillarBuildInput): number[] {
  return trendFromBuckets(buckets, input, sumProfit)
}

function trendFromBuckets(
  buckets: Map<number, PillarsOrder[]>,
  input: PillarBuildInput,
  reducer: (orders: PillarsOrder[], input: PillarBuildInput) => number,
): number[] {
  return Array.from({ length: 7 }, (_, index) => roundPillarValue(reducer(buckets.get(index) ?? [], input)))
}

function sumRevenue(orders: PillarsOrder[], input: PillarBuildInput): number {
  return sumConvertedOrderAmount(orders, input, (order) => Number(order.totalRevenue ?? 0))
}

function sumProfit(orders: PillarsOrder[], input: PillarBuildInput): number {
  return sumConvertedOrderAmount(orders, input, (order) => Number(order.totalProfit ?? 0))
}

function sumConvertedOrderAmount(
  orders: PillarsOrder[],
  input: PillarBuildInput,
  selector: (order: PillarsOrder) => number,
): number {
  return roundCurrency(
    orders.reduce(
      (sum, order) =>
        sum +
        input.currencyService.convert({
          source: { amount: selector(order), currency: order.currency },
          targetCurrency: input.displayCurrency,
          snapshot: input.snapshot,
        }),
      0,
    ),
  )
}

function getWeekStart(date: Date): Date {
  const weekStart = new Date(date)
  const day = weekStart.getDay()
  weekStart.setDate(weekStart.getDate() + (day === 0 ? -6 : 1 - day))
  weekStart.setHours(0, 0, 0, 0)
  return weekStart
}

function addDays(date: Date, days: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function calculateChangePercent({ current, previous }: PillarMetricAmounts) {
  return previous > 0 ? Math.round(((current - previous) / previous) * 100) : 0
}

function roundPillarValue(value: number) {
  return Math.round(value * 100) / 100
}
