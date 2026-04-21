import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { OrderRecord } from '@contracts/contracts'
import { PedidosEnvironment } from './pedidos-environment'

const mockUseDashboardQueries = vi.fn()
const mockUseQuery = vi.fn()

vi.mock('@/components/dashboard/hooks/useDashboardQueries', () => ({
  useDashboardQueries: () => mockUseDashboardQueries(),
}))

vi.mock('@tanstack/react-query', () => ({
  keepPreviousData: Symbol('keepPreviousData'),
  useQuery: () => mockUseQuery(),
}))

function makeOrder(overrides: Partial<OrderRecord> = {}): OrderRecord {
  return {
    id: 'ord-1',
    comandaId: 'com-1',
    customerName: 'Mesa 7',
    buyerType: null,
    buyerDocument: null,
    buyerDistrict: 'Centro',
    buyerCity: 'Sao Paulo',
    buyerState: 'SP',
    buyerCountry: 'Brasil',
    buyerLatitude: null,
    buyerLongitude: null,
    employeeId: 'emp-1',
    sellerCode: 'VD-1',
    sellerName: 'Marina',
    channel: 'balcao',
    notes: null,
    currency: 'BRL',
    displayCurrency: 'BRL',
    status: 'COMPLETED',
    totalRevenue: 120,
    totalCost: 68,
    totalProfit: 52,
    originalTotalRevenue: 120,
    originalTotalCost: 68,
    originalTotalProfit: 52,
    totalItems: 3,
    createdAt: '2026-04-19T12:30:00.000Z',
    updatedAt: '2026-04-19T12:30:00.000Z',
    cancelledAt: null,
    items: [
      {
        id: 'item-1',
        productId: 'prod-1',
        productName: 'Deher Garrafa',
        category: 'Bebidas',
        quantity: 3,
        currency: 'BRL',
        unitPrice: 40,
        unitCost: 22.67,
        lineRevenue: 120,
        lineCost: 68,
        lineProfit: 52,
        originalUnitPrice: 40,
        originalUnitCost: 22.67,
        originalLineRevenue: 120,
        originalLineCost: 68,
        originalLineProfit: 52,
      },
    ],
    ...overrides,
  }
}

describe('PedidosEnvironment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza um estado travado especifico para timeline quando nao ha sessao', () => {
    mockUseDashboardQueries.mockReturnValue({
      sessionQuery: {
        data: {
          user: null,
        },
        isLoading: false,
      },
    })

    mockUseQuery.mockReturnValue({
      data: undefined,
      error: null,
    })

    render(<PedidosEnvironment activeTab="timeline" surface="lab" />)

    expect(screen.getByRole('heading', { name: 'Sequencia de eventos' })).toBeInTheDocument()
    expect(screen.getByText('Preview travado · timeline')).toBeInTheDocument()
    expect(screen.getByText('O que abre na timeline')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Entrar para liberar pedidos/i })).toBeInTheDocument()
  })

  it('renderiza um resumo dedicado para kanban no lab', () => {
    mockUseDashboardQueries.mockReturnValue({
      sessionQuery: {
        data: {
          user: {
            preferredCurrency: 'BRL',
          },
        },
        isLoading: false,
      },
    })

    mockUseQuery.mockReturnValue({
      data: {
        items: [
          makeOrder(),
          makeOrder({
            id: 'ord-2',
            customerName: 'Delivery Ana',
            sellerName: 'Joao',
            channel: 'delivery',
            totalRevenue: 85,
            totalCost: 42,
            totalProfit: 43,
            originalTotalRevenue: 85,
            originalTotalCost: 42,
            originalTotalProfit: 43,
            totalItems: 2,
            createdAt: '2026-04-19T13:10:00.000Z',
            updatedAt: '2026-04-19T13:10:00.000Z',
          }),
          makeOrder({
            id: 'ord-3',
            customerName: 'Mesa 2',
            status: 'CANCELLED',
            channel: 'balcao',
            totalRevenue: 64,
            totalCost: 30,
            totalProfit: 34,
            originalTotalRevenue: 64,
            originalTotalCost: 30,
            originalTotalProfit: 34,
            totalItems: 2,
            createdAt: '2026-04-19T14:45:00.000Z',
            updatedAt: '2026-04-19T14:45:00.000Z',
            cancelledAt: '2026-04-19T14:46:00.000Z',
          }),
        ],
        totals: {
          completedOrders: 2,
          cancelledOrders: 1,
          realizedRevenue: 205,
          realizedProfit: 95,
          soldUnits: 5,
        },
      },
      error: null,
    })

    render(<PedidosEnvironment activeTab="kanban" surface="lab" />)

    expect(screen.getByRole('heading', { name: 'Status dos pedidos' })).toBeInTheDocument()
    expect(screen.getByText('Pressao por status')).toBeInTheDocument()
    expect(screen.getByText('Fila comercial')).toBeInTheDocument()
    expect(screen.getByText('Quadro por status')).toBeInTheDocument()
    expect(screen.getByText('Concluidos')).toBeInTheDocument()
    expect(screen.getByText('Cancelados')).toBeInTheDocument()
  })

  it('mantem colunas vazias do kanban compactas', () => {
    mockUseDashboardQueries.mockReturnValue({
      sessionQuery: {
        data: {
          user: {
            preferredCurrency: 'BRL',
          },
        },
        isLoading: false,
      },
    })

    mockUseQuery.mockReturnValue({
      data: {
        items: [makeOrder(), makeOrder({ id: 'ord-2', customerName: 'Mesa 8' })],
        totals: {
          completedOrders: 2,
          cancelledOrders: 0,
          realizedRevenue: 240,
          realizedProfit: 104,
          soldUnits: 6,
        },
      },
      error: null,
    })

    render(<PedidosEnvironment activeTab="kanban" surface="lab" />)

    expect(screen.getByText('Cancelados vazio')).toBeInTheDocument()
    expect(screen.getByTestId('orders-kanban-grid')).toHaveTextContent('Quadro por status')
  })

  it('limita a lista do kanban e direciona volume completo para tabela', () => {
    mockUseDashboardQueries.mockReturnValue({
      sessionQuery: {
        data: {
          user: {
            preferredCurrency: 'BRL',
          },
        },
        isLoading: false,
      },
    })

    mockUseQuery.mockReturnValue({
      data: {
        items: Array.from({ length: 8 }, (_, index) =>
          makeOrder({
            id: `ord-${index + 1}`,
            customerName: `Cliente ${index + 1}`,
            createdAt: `2026-04-19T${String(10 + index).padStart(2, '0')}:00:00.000Z`,
            updatedAt: `2026-04-19T${String(10 + index).padStart(2, '0')}:00:00.000Z`,
          }),
        ),
        totals: {
          completedOrders: 8,
          cancelledOrders: 0,
          realizedRevenue: 960,
          realizedProfit: 416,
          soldUnits: 24,
        },
      },
      error: null,
    })

    render(<PedidosEnvironment activeTab="kanban" surface="lab" />)

    expect(screen.getByText('Cliente 8')).toBeInTheDocument()
    expect(screen.getByText('Cliente 3')).toBeInTheDocument()
    expect(screen.queryByText('Cliente 2')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /2 pedidos adicionais - abrir tabela/i })).toHaveAttribute(
      'href',
      '/design-lab/pedidos?tab=tabela',
    )
  })

  it('renderiza contexto proprio para detalhe no lab', () => {
    mockUseDashboardQueries.mockReturnValue({
      sessionQuery: {
        data: {
          user: {
            preferredCurrency: 'BRL',
          },
        },
        isLoading: false,
      },
    })

    mockUseQuery.mockReturnValue({
      data: {
        items: [
          makeOrder({
            customerName: 'Cliente Premium',
            notes: 'Entregar na portaria',
            channel: 'delivery',
            sellerName: 'Ana',
          }),
        ],
        totals: {
          completedOrders: 1,
          cancelledOrders: 0,
          realizedRevenue: 120,
          realizedProfit: 52,
          soldUnits: 3,
        },
      },
      error: null,
    })

    render(<PedidosEnvironment activeTab="detalhe" surface="lab" />)

    expect(screen.getByRole('heading', { name: 'Pedido selecionado' })).toBeInTheDocument()
    expect(screen.getByText('Pedido em foco')).toBeInTheDocument()
    expect(screen.getByText('Contexto do pedido')).toBeInTheDocument()
    expect(screen.getByText('Detalhe do ultimo pedido')).toBeInTheDocument()
    expect(screen.getByText(/Entregar na portaria/i)).toBeInTheDocument()
  })
})
