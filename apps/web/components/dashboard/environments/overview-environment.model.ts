import type { CurrencyCode, FinanceSummaryResponse, ProductRecord } from '@contracts/contracts'

export type OverviewVariant = 'principal' | 'layout' | 'meta' | 'operacional' | 'editorial'

export type OverviewSnapshot = {
  companyName: string
  currentRevenue: number
  currentProfit: number
  completedOrders: number
  averageMargin: number
  averageTicket: number
  lowStockItems: number
  revenueGrowth: number
  profitGrowth: number
  displayCurrency: CurrencyCode
  topProductName: string | null
}

export type OverviewViewProps = {
  finance?: FinanceSummaryResponse
  financeError: string | null
  isLoading: boolean
  products: ProductRecord[]
  snapshot: OverviewSnapshot
}

type OverviewUser = {
  companyName?: string | null
}

type OverviewOrdersTotals = {
  completedOrders?: number | null
}

type OverviewFinanceTotals = FinanceSummaryResponse['totals']

export function buildOverviewSnapshot({
  finance,
  ordersTotals,
  user,
}: Readonly<{
  finance?: FinanceSummaryResponse
  ordersTotals?: OverviewOrdersTotals | null
  user?: OverviewUser | null
}>): OverviewSnapshot {
  const financeTotals = normalizeFinanceTotals(finance?.totals)
  const completedOrders = resolveCompletedOrders(ordersTotals, financeTotals)

  return {
    companyName: resolveCompanyName(user),
    currentRevenue: financeTotals.currentRevenue,
    currentProfit: financeTotals.currentProfit,
    completedOrders,
    averageMargin: financeTotals.averageMargin,
    averageTicket: resolveAverageTicket(financeTotals.currentRevenue, completedOrders),
    lowStockItems: financeTotals.lowStockItems,
    revenueGrowth: financeTotals.revenueGrowth,
    profitGrowth: financeTotals.profitGrowth,
    displayCurrency: resolveDisplayCurrency(finance),
    topProductName: resolveTopProductName(finance),
  }
}

function resolveCompletedOrders(
  ordersTotals: OverviewOrdersTotals | null | undefined,
  financeTotals: ReturnType<typeof normalizeFinanceTotals>,
) {
  return ordersTotals?.completedOrders ?? financeTotals.completedOrders
}

function resolveAverageTicket(currentRevenue: number, completedOrders: number) {
  return completedOrders > 0 ? currentRevenue / Math.max(1, completedOrders) : 0
}

function normalizeFinanceTotals(financeTotals: OverviewFinanceTotals | undefined) {
  return {
    currentRevenue: financeTotals?.currentMonthRevenue ?? 0,
    currentProfit: financeTotals?.currentMonthProfit ?? 0,
    completedOrders: financeTotals?.completedOrders ?? 0,
    averageMargin: financeTotals?.averageMarginPercent ?? 0,
    lowStockItems: financeTotals?.lowStockItems ?? 0,
    revenueGrowth: financeTotals?.revenueGrowthPercent ?? 0,
    profitGrowth: financeTotals?.profitGrowthPercent ?? 0,
  }
}

function resolveCompanyName(user: OverviewUser | null | undefined) {
  return user?.companyName ?? 'Desk Imperial'
}

function resolveDisplayCurrency(finance: FinanceSummaryResponse | undefined) {
  return finance?.displayCurrency ?? 'BRL'
}

function resolveTopProductName(finance: FinanceSummaryResponse | undefined) {
  return finance?.topProducts?.[0]?.name ?? null
}

export function formatPercent(value: number) {
  return `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: Math.abs(value) < 10 ? 1 : 0,
    maximumFractionDigits: 1,
  }).format(value)}%`
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function daysLeftInMonth() {
  const today = new Date()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  return Math.max(daysInMonth - today.getDate(), 1)
}
