import type { FinanceSummaryResponse } from '@contracts/contracts'
import type { FinanceiroView } from './financeiro-model'
import type { FinanceSnapshot } from './financeiro-summary-panels'

const EMPTY_FINANCE_TOTALS = {
  activeProducts: 0,
  inventoryUnits: 0,
  inventoryCostValue: 0,
  inventorySalesValue: 0,
  potentialProfit: 0,
  realizedRevenue: 0,
  realizedCost: 0,
  realizedProfit: 0,
  completedOrders: 0,
  currentMonthRevenue: 0,
  currentMonthProfit: 0,
  previousMonthRevenue: 0,
  previousMonthProfit: 0,
  revenueGrowthPercent: 0,
  profitGrowthPercent: 0,
  averageMarginPercent: 0,
  averageMarkupPercent: 0,
  lowStockItems: 0,
} satisfies FinanceSummaryResponse['totals']

const EMPTY_LABEL = 'sem leitura'

type FinanceSnapshotSource = {
  totals: FinanceSummaryResponse['totals']
  timeline: FinanceSummaryResponse['revenueTimeline']
  recentOrders: FinanceSummaryResponse['recentOrders']
  topCategory: string
  topChannel: string
  topCustomerName: string
  topCustomerRevenue: number
}

export function buildFinanceSnapshot({
  displayCurrency,
  finance,
  view,
}: Readonly<{
  displayCurrency: FinanceSummaryResponse['displayCurrency']
  finance: FinanceSummaryResponse | undefined
  view: FinanceiroView
}>): FinanceSnapshot {
  const source = resolveFinanceSnapshotSource(finance)
  const totals = source.totals
  const timeline = source.timeline
  const revenue = totals.currentMonthRevenue
  const profit = totals.currentMonthProfit
  const completedOrders = totals.completedOrders
  const peakWindow = findPeakRevenueWindow(timeline)

  return {
    averageMargin: totals.averageMarginPercent,
    averageMarkup: totals.averageMarkupPercent,
    averageRevenuePerWindow: averageRevenuePerWindow(timeline),
    averageTicket: averageTicket({ orders: completedOrders, revenue }),
    cancelledOrders: countCancelledOrders(source.recentOrders),
    completedOrders,
    displayCurrency,
    expenses: Math.max(0, revenue - profit),
    lowStockItems: totals.lowStockItems,
    peakRevenueLabel: peakWindow?.label ?? EMPTY_LABEL,
    peakRevenueValue: peakWindow?.revenue ?? 0,
    profit,
    profitGrowthPercent: totals.profitGrowthPercent,
    realizedCost: totals.realizedCost,
    realizedProfit: totals.realizedProfit,
    realizedRevenue: totals.realizedRevenue,
    revenue,
    revenueGrowthPercent: totals.revenueGrowthPercent,
    salesWindowCount: timeline.length,
    topCategory: source.topCategory,
    topChannel: source.topChannel,
    topCustomer: source.topCustomerName,
    topCustomerRevenue: source.topCustomerRevenue,
    view,
  }
}

function resolveFinanceSnapshotSource(finance: FinanceSummaryResponse | undefined): FinanceSnapshotSource {
  if (!finance) {
    return {
      totals: EMPTY_FINANCE_TOTALS,
      timeline: [],
      recentOrders: [],
      topCategory: EMPTY_LABEL,
      topChannel: EMPTY_LABEL,
      topCustomerName: EMPTY_LABEL,
      topCustomerRevenue: 0,
    }
  }

  const topCustomer = finance.topCustomers[0] ?? null

  return {
    totals: finance.totals,
    timeline: finance.revenueTimeline,
    recentOrders: finance.recentOrders,
    topCategory: finance.categoryBreakdown[0]?.category ?? EMPTY_LABEL,
    topChannel: finance.salesByChannel[0]?.channel ?? EMPTY_LABEL,
    topCustomerName: topCustomer?.customerName ?? EMPTY_LABEL,
    topCustomerRevenue: topCustomer?.revenue ?? 0,
  }
}

function averageTicket({ orders, revenue }: Readonly<{ orders: number; revenue: number }>) {
  return orders > 0 ? revenue / Math.max(1, orders) : 0
}

function averageRevenuePerWindow(timeline: FinanceSummaryResponse['revenueTimeline']) {
  return timeline.length > 0 ? timeline.reduce((sum, row) => sum + row.revenue, 0) / timeline.length : 0
}

function findPeakRevenueWindow(timeline: FinanceSummaryResponse['revenueTimeline']) {
  return timeline.reduce<(typeof timeline)[number] | null>(
    (current, row) => (!current || row.revenue > current.revenue ? row : current),
    null,
  )
}

function countCancelledOrders(orders: FinanceSummaryResponse['recentOrders']) {
  return orders.filter((order) => order.status === 'CANCELLED').length
}
