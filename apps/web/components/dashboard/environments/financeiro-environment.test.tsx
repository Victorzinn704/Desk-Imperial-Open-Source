import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FinanceiroEnvironment } from './financeiro-environment'

const mockUseDashboardQueries = vi.fn()

vi.mock('@/components/dashboard/hooks/useDashboardQueries', () => ({
  useDashboardQueries: () => mockUseDashboardQueries(),
}))

vi.mock('@/components/dashboard/finance-orders-table', () => ({
  FinanceOrdersTable: () => <div data-testid="finance-orders-table">orders-table</div>,
}))

describe('FinanceiroEnvironment', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockUseDashboardQueries.mockReturnValue({
      sessionQuery: {
        data: {
          user: {
            preferredCurrency: 'BRL',
          },
        },
      },
      financeQuery: {
        data: {
          displayCurrency: 'BRL',
          totals: {
            realizedRevenue: 30120,
            realizedCost: 18240,
            realizedProfit: 11880,
            currentMonthRevenue: 32410,
            currentMonthProfit: 14170,
            previousMonthRevenue: 26540,
            previousMonthProfit: 10210,
            revenueGrowthPercent: 22.1,
            profitGrowthPercent: 18.4,
            averageMarkupPercent: 64.2,
            completedOrders: 261,
            averageMarginPercent: 36.4,
            lowStockItems: 2,
          },
          revenueTimeline: [
            { label: '08h', revenue: 3200, profit: 1200, orders: 18 },
            { label: '10h', revenue: 3800, profit: 1420, orders: 24 },
          ],
          recentOrders: [
            {
              id: 'ord-1',
              customerName: 'Mesa 1',
              totalItems: 3,
              totalRevenue: 128.5,
              totalProfit: 42.3,
              originalTotalRevenue: 128.5,
              originalTotalProfit: 42.3,
              currency: 'BRL',
              channel: 'Balcão',
              status: 'COMPLETED',
              createdAt: new Date('2026-04-20T12:00:00.000Z').toISOString(),
            },
          ],
          salesByChannel: [
            { channel: 'Balcão', revenue: 18800, profit: 6500, orders: 140 },
            { channel: 'Delivery', revenue: 9610, profit: 3380, orders: 84 },
          ],
          topCustomers: [{ customerName: 'Ana', revenue: 1800, profit: 620, orders: 12, buyerDocument: null, buyerType: 'PERSON' }],
          topEmployees: [{ employeeId: '1', employeeCode: 'VD-001', employeeName: 'Pedro', orders: 24, revenue: 3800, profit: 1200, averageTicket: 158.3 }],
          topProducts: [{ id: 'p1', name: 'Gin', category: 'Bebidas', stock: 12, currency: 'BRL', displayCurrency: 'BRL', originalInventorySalesValue: 1400, originalPotentialProfit: 640, inventoryCostValue: 760, inventorySalesValue: 1400, potentialProfit: 640, marginPercent: 45 }],
          categoryBreakdown: [
            {
              category: 'Bebidas',
              products: 12,
              units: 82,
              inventoryCostValue: 3200,
              inventorySalesValue: 11800,
              potentialProfit: 8600,
            },
          ],
        },
        error: null,
        isLoading: false,
      },
    })
  })

  it('renders the lab financial hierarchy for movimentacao', () => {
    render(<FinanceiroEnvironment activeTab={null} surface="lab" />)

    expect(screen.getByRole('heading', { name: 'Movimentacao do periodo' })).toBeInTheDocument()
    expect(screen.getByText('visão ativa')).toBeInTheDocument()
    expect(screen.getByText('Radar financeiro')).toBeInTheDocument()
    expect(screen.getByText('Receita realizada total')).toBeInTheDocument()
    expect(screen.getByText('Fechamento por período')).toBeInTheDocument()
    expect(screen.getByTestId('finance-orders-table')).toBeInTheDocument()
  })

  it('renders a dedicated layout for fluxo sem o resumo duplicado antigo', () => {
    render(<FinanceiroEnvironment activeTab="fluxo" surface="lab" />)

    expect(screen.getByRole('heading', { name: 'Entrada e saida por periodo' })).toBeInTheDocument()
    expect(screen.getByText('Janelas do caixa')).toBeInTheDocument()
    expect(screen.getByText('Equipe com maior giro')).toBeInTheDocument()
    expect(screen.queryByText('Pulso do fluxo')).not.toBeInTheDocument()
  })

  it('renders contas com clientes e base consolidada sem KPI duplicado', () => {
    render(<FinanceiroEnvironment activeTab="contas" surface="lab" />)

    expect(screen.getByRole('heading', { name: 'Receber e acompanhamento' })).toBeInTheDocument()
    expect(screen.getByText('Clientes que mais pesam')).toBeInTheDocument()
    expect(screen.getByText('Base de recebimento')).toBeInTheDocument()
    expect(screen.queryByText('Recebíveis e concentração')).not.toBeInTheDocument()
  })
})
