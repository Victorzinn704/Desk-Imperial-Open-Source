'use client'

import type { FinanceSummaryResponse } from '@contracts/contracts'
import { FinanceCategoryFlowPanel } from '@/components/dashboard/finance-category-flow-panel'

export function OwnerFinanceCategoryMix({
  categoryBreakdown,
  displayCurrency,
  financeSummary,
}: Readonly<{
  categoryBreakdown: FinanceSummaryResponse['categoryBreakdown']
  displayCurrency: FinanceSummaryResponse['displayCurrency']
  financeSummary?: FinanceSummaryResponse
}>) {
  const finance = buildMobileMixFinance(financeSummary ?? buildFallbackFinance(categoryBreakdown, displayCurrency))

  if (finance.categoryBreakdown.length === 0) {
    return null
  }

  return <FinanceCategoryFlowPanel finance={finance} title="Registro de fluxo por categoria" />
}

function buildMobileMixFinance(finance: FinanceSummaryResponse): FinanceSummaryResponse {
  const categoryBreakdown = finance.salesCategoryBreakdown?.length
    ? finance.salesCategoryBreakdown
    : finance.categoryBreakdown

  return {
    ...finance,
    categoryBreakdown,
  }
}

function buildFallbackFinance(
  categoryBreakdown: FinanceSummaryResponse['categoryBreakdown'],
  displayCurrency: FinanceSummaryResponse['displayCurrency'],
): FinanceSummaryResponse {
  return {
    displayCurrency,
    ratesUpdatedAt: null,
    ratesSource: 'fallback',
    ratesNotice: null,
    totals: {
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
    },
    categoryBreakdown,
    topProducts: [],
    recentOrders: [],
    revenueTimeline: [],
    salesByChannel: [],
    topCustomers: [],
    topEmployees: [],
    salesMap: [],
    topRegions: [],
    categoryTopProducts: {},
  }
}
