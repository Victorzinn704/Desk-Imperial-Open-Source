import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { FinanceSummaryResponse } from '@contracts/contracts'
import { OverviewTopProducts } from './overview-top-products'

function makeFinanceSummary(): FinanceSummaryResponse {
  return {
    displayCurrency: 'BRL',
    ratesUpdatedAt: null,
    ratesSource: 'fallback',
    ratesNotice: null,
    totals: {
      activeProducts: 2,
      inventoryUnits: 12,
      inventoryCostValue: 100,
      inventorySalesValue: 220,
      potentialProfit: 120,
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
    categoryBreakdown: [],
    topProducts: [
      {
        id: 'prod-1',
        name: 'Deher Garrafa',
        category: 'Bebidas',
        stock: 42,
        currency: 'BRL',
        displayCurrency: 'BRL',
        originalInventorySalesValue: 1050,
        originalPotentialProfit: 420,
        inventoryCostValue: 630,
        inventorySalesValue: 1050,
        potentialProfit: 420,
        marginPercent: 40,
      },
      {
        id: 'prod-2',
        name: 'Gin Dose',
        category: 'Destilados',
        stock: 64,
        currency: 'BRL',
        displayCurrency: 'BRL',
        originalInventorySalesValue: 896,
        originalPotentialProfit: 384,
        inventoryCostValue: 512,
        inventorySalesValue: 896,
        potentialProfit: 384,
        marginPercent: 42.9,
      },
    ],
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

describe('OverviewTopProducts', () => {
  it('renderiza a variante lab como lista densa, sem pilha de cards altos', () => {
    render(<OverviewTopProducts finance={makeFinanceSummary()} surface="lab" />)

    expect(screen.getByRole('heading', { name: 'Top produtos' })).toBeInTheDocument()
    expect(screen.getByTestId('overview-top-products-list')).toBeInTheDocument()
    expect(screen.getByText('Deher Garrafa')).toBeInTheDocument()
    expect(screen.getByText('Gin Dose')).toBeInTheDocument()
    expect(screen.getByText('margem 40.0%')).toBeInTheDocument()
  })
})
