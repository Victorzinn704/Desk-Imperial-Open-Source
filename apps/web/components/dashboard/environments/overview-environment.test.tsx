import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DesignLabOverviewEnvironment } from './overview-environment'

const mockUseDashboardQueries = vi.fn()

vi.mock('@/components/dashboard/hooks/useDashboardQueries', () => ({
  useDashboardQueries: () => mockUseDashboardQueries(),
}))

vi.mock('@/components/dashboard/sales-performance-card', () => ({
  SalesPerformanceCard: ({ surface }: { surface?: 'default' | 'lab' }) => (
    <div data-testid="sales-performance-card">grafico-{surface ?? 'default'}</div>
  ),
}))

vi.mock('@/components/dashboard/overview-top-products', () => ({
  OverviewTopProducts: ({ surface }: { surface?: 'default' | 'lab' }) => (
    <div data-testid="overview-top-products">top-products-{surface ?? 'default'}</div>
  ),
}))

vi.mock('@/components/dashboard/overview-recent-orders', () => ({
  OverviewRecentOrders: ({ surface }: { surface?: 'default' | 'lab' }) => (
    <div data-testid="overview-recent-orders">recent-orders-{surface ?? 'default'}</div>
  ),
}))

describe('DesignLabOverviewEnvironment', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockUseDashboardQueries.mockReturnValue({
      sessionQuery: {
        data: {
          user: {
            companyName: 'Bar do Pedrão',
          },
        },
      },
      financeQuery: {
        data: {
          displayCurrency: 'BRL',
          totals: {
            currentMonthRevenue: 5730,
            currentMonthProfit: 1993.7,
            completedOrders: 160,
            averageMarginPercent: 36.6,
            lowStockItems: 0,
            revenueGrowthPercent: 224.1,
            profitGrowthPercent: 214.5,
          },
          topProducts: [{ id: 'p1', name: 'Deher Garrafa' }],
          recentOrders: [],
          salesByChannel: [
            { channel: 'Balcão', revenue: 2300 },
            { channel: 'Delivery', revenue: 1800 },
          ],
        },
        error: null,
        isLoading: false,
      },
      ordersQuery: {
        data: {
          totals: {
            completedOrders: 160,
          },
        },
      },
    })
  })

  it('renders the stabilized lab overview hierarchy', () => {
    render(<DesignLabOverviewEnvironment />)

    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument()
    expect(screen.getByText('receita do mês')).toBeInTheDocument()
    expect(screen.getByText('lucro do mês')).toBeInTheDocument()
    expect(screen.getByText('pedidos fechados')).toBeInTheDocument()
    expect(screen.getByText('margem média')).toBeInTheDocument()
    expect(screen.getByText('meta projetada')).toBeInTheDocument()
    expect(screen.getByText('ritmo diário')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Radar comercial' })).toBeInTheDocument()
    expect(screen.getByTestId('sales-performance-card')).toHaveTextContent('grafico-lab')
    expect(screen.getByTestId('overview-recent-orders')).toHaveTextContent('recent-orders-lab')
    expect(screen.getByTestId('overview-top-products')).toHaveTextContent('top-products-lab')
  })
})
