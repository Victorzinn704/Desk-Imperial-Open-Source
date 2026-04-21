import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { FinanceSummaryResponse } from '@contracts/contracts'
import { MapSection } from './map-section'

vi.mock('next/dynamic', () => ({
  default: () => {
    return function MockDynamicComponent() {
      return <div data-testid="mock-map-canvas">mock-map-canvas</div>
    }
  },
}))

describe('MapSection', () => {
  it('renders the lab-native territorial shell when no mapped sales exist', () => {
    render(
      <MapSection
        displayCurrency="BRL"
        finance={buildFinance({ salesMap: [], topRegions: [] })}
        isLoading={false}
        totalOrderCount={0}
      />,
    )

    expect(screen.getByText('Cobertura geográfica')).toBeInTheDocument()
    expect(screen.getByText('Ranking territorial')).toBeInTheDocument()
    expect(screen.getByText('Nenhuma venda mapeada')).toBeInTheDocument()
  })

  it('changes the ranking metric through the territorial filters', () => {
    render(
      <MapSection
        displayCurrency="BRL"
        finance={buildFinance({
          salesMap: [
            {
              label: 'Centro',
              district: 'Centro',
              city: 'São Paulo',
              state: 'SP',
              country: 'BR',
              latitude: -23.5,
              longitude: -46.6,
              orders: 10,
              revenue: 2000,
              profit: 740,
            },
          ],
          topRegions: [
            { label: 'Centro', city: 'São Paulo', state: 'SP', country: 'BR', orders: 10, revenue: 2000, profit: 740 },
          ],
        })}
        isLoading={false}
        totalOrderCount={12}
      />,
    )

    const rankingPanel = screen.getByText('Ranking territorial').closest('section')
    expect(rankingPanel).not.toBeNull()
    expect(within(rankingPanel as HTMLElement).getByText((content) => content.includes('2.000,00'))).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Pedidos' }))
    expect(within(rankingPanel as HTMLElement).getByText(/^10$/)).toBeInTheDocument()
  })
})

function buildFinance(overrides: Partial<FinanceSummaryResponse>): FinanceSummaryResponse {
  return {
    displayCurrency: 'BRL',
    ratesUpdatedAt: null,
    ratesSource: 'live',
    ratesNotice: null,
    totals: {
      activeProducts: 0,
      inventoryUnits: 0,
      inventoryCostValue: 0,
      inventorySalesValue: 0,
      potentialProfit: 0,
      realizedRevenue: 1200,
      realizedCost: 400,
      realizedProfit: 800,
      completedOrders: 12,
      currentMonthRevenue: 1200,
      currentMonthProfit: 800,
      previousMonthRevenue: 1000,
      previousMonthProfit: 700,
      revenueGrowthPercent: 20,
      profitGrowthPercent: 14.3,
      averageMarginPercent: 35,
      averageMarkupPercent: 60,
      lowStockItems: 0,
    },
    categoryBreakdown: [],
    topProducts: [],
    recentOrders: [],
    revenueTimeline: [],
    salesByChannel: [],
    topCustomers: [],
    topEmployees: [],
    salesMap: [],
    topRegions: [],
    categoryTopProducts: {},
    ...overrides,
  }
}
