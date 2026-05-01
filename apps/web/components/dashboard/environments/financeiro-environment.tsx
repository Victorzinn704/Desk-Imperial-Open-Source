'use client'

import type { FinanceSummaryResponse } from '@contracts/contracts'
import type { DashboardTabId } from '@/components/dashboard/dashboard-navigation'
import { LabPanel } from '@/components/design-lab/lab-primitives'
import { useDashboardQueries } from '@/components/dashboard/hooks/useDashboardQueries'
import { ApiError } from '@/lib/api'
import { type FinanceiroSurface, type FinanceiroView, resolveFinanceView } from './financeiro-model'
import { FinanceiroAuthState, FinanceiroHeader, FinanceiroLabSummary, type FinanceSnapshot } from './financeiro-summary-panels'
import { FinanceiroTabBody } from './financeiro-tab-panels'

export function FinanceiroEnvironment({
  activeTab,
  surface = 'legacy',
}: Readonly<{ activeTab: DashboardTabId | null; surface?: FinanceiroSurface }>) {
  const { sessionQuery, financeQuery, productsQuery } = useDashboardQueries({ section: 'financeiro' })
  const user = sessionQuery.data?.user
  const view = resolveFinanceView(activeTab)

  if (!user) {
    return <FinanceiroAuthState view={view} />
  }

  const finance = financeQuery.data
  const displayCurrency = (finance?.displayCurrency ?? user.preferredCurrency) as FinanceSummaryResponse['displayCurrency']
  const products = productsQuery.data?.items ?? []
  const snapshot = buildFinanceSnapshot(finance, displayCurrency, view)
  const financeError = financeQuery.error instanceof ApiError ? financeQuery.error.message : null

  return (
    <section className="space-y-5">
      <FinanceiroHeader snapshot={snapshot} />

      {!financeError && surface === 'lab' ? (
        <FinanceiroLabSummary finance={finance} products={products} snapshot={snapshot} />
      ) : null}

      {financeError ? (
        <LabPanel padding="md">
          <p className="text-sm text-[var(--danger)]">{financeError}</p>
        </LabPanel>
      ) : null}

      {!financeError ? (
        <FinanceiroTabBody
          displayCurrency={displayCurrency}
          finance={finance}
          isLoading={financeQuery.isLoading}
          products={products}
          view={view}
        />
      ) : null}
    </section>
  )
}

function buildFinanceSnapshot(
  finance: FinanceSummaryResponse | undefined,
  displayCurrency: FinanceSummaryResponse['displayCurrency'],
  view: FinanceiroView,
): FinanceSnapshot {
  const totals = finance?.totals
  const revenue = totals?.currentMonthRevenue ?? 0
  const profit = totals?.currentMonthProfit ?? 0
  const completedOrders = totals?.completedOrders ?? 0
  const averageTicket = completedOrders > 0 ? revenue / Math.max(1, completedOrders) : 0
  const timeline = finance?.revenueTimeline ?? []
  const peakWindow = timeline.reduce<(typeof timeline)[number] | null>(
    (current, row) => (!current || row.revenue > current.revenue ? row : current),
    null,
  )
  const cancelledOrders = (finance?.recentOrders ?? []).filter((order) => order.status === 'CANCELLED').length
  const topCustomer = finance?.topCustomers[0]

  return {
    averageMargin: totals?.averageMarginPercent ?? 0,
    averageMarkup: totals?.averageMarkupPercent ?? 0,
    averageRevenuePerWindow:
      timeline.length > 0 ? timeline.reduce((sum, row) => sum + row.revenue, 0) / timeline.length : 0,
    averageTicket,
    cancelledOrders,
    completedOrders,
    displayCurrency,
    expenses: Math.max(0, revenue - profit),
    lowStockItems: totals?.lowStockItems ?? 0,
    peakRevenueLabel: peakWindow?.label ?? 'sem leitura',
    peakRevenueValue: peakWindow?.revenue ?? 0,
    profit,
    profitGrowthPercent: totals?.profitGrowthPercent ?? 0,
    realizedCost: totals?.realizedCost ?? 0,
    realizedProfit: totals?.realizedProfit ?? 0,
    realizedRevenue: totals?.realizedRevenue ?? 0,
    revenue,
    revenueGrowthPercent: totals?.revenueGrowthPercent ?? 0,
    salesWindowCount: timeline.length,
    topCategory: finance?.categoryBreakdown[0]?.category ?? 'sem leitura',
    topChannel: finance?.salesByChannel[0]?.channel ?? 'sem leitura',
    topCustomer: topCustomer?.customerName ?? 'sem leitura',
    topCustomerRevenue: topCustomer?.revenue ?? 0,
    view,
  }
}
