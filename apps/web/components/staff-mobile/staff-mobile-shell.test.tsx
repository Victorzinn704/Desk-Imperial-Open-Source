import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '@/lib/api'
import { buildMesaRecord, buildOperationsSnapshot } from '@/test/operations-fixtures'
import { StaffMobileShell } from './staff-mobile-shell'

vi.mock('@/lib/api', () => ({
  fetchOperationsLive: vi.fn(),
  fetchOperationsKitchen: vi.fn(),
  fetchProducts: vi.fn(),
  logout: vi.fn(),
  openComanda: vi.fn(),
  addComandaItem: vi.fn(),
  addComandaItems: vi.fn(),
  closeComanda: vi.fn(),
  cancelComanda: vi.fn(),
  updateComandaStatus: vi.fn(),
  openCashSession: vi.fn(),
  updateKitchenItemStatus: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
}))

vi.mock('../operations/use-operations-realtime', () => ({
  useOperationsRealtime: vi.fn(() => ({ status: 'connected' })),
}))

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

describe('StaffMobileShell', () => {
  const mockUser = {
    name: 'Marina',
    fullName: 'Marina Garçom',
    employeeId: 'emp-1',
  }

  let testQueryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    testQueryClient = createTestQueryClient()
    const mockFetchOperationsLive = vi.mocked(api.fetchOperationsLive)
    const mockFetchOperationsKitchen = vi.mocked(api.fetchOperationsKitchen)
    const mockFetchProducts = vi.mocked(api.fetchProducts)

    const snapshot = buildOperationsSnapshot({
      employees: [
        {
          employeeId: 'emp-1',
          employeeCode: 'E01',
          displayName: 'Marina',
          comandas: [
            {
              id: 'c-1',
              status: 'CLOSED',
              tableLabel: '1',
              totalAmount: 120,
              openedAt: '2026-03-28T10:00:00.000Z',
              items: [{ id: 'i-1', productName: 'Pão de queijo', quantity: 2, unitPrice: 20, kitchenStatus: 'READY' }],
            },
            {
              id: 'c-2',
              status: 'OPEN',
              tableLabel: '2',
              totalAmount: 80,
              openedAt: '2026-03-28T11:00:00.000Z',
              items: [{ id: 'i-2', productName: 'Café', quantity: 1, unitPrice: 10, kitchenStatus: 'QUEUED' }],
            },
          ],
        },
      ],
      unassigned: {
        comandas: [],
      },
      mesas: [
        buildMesaRecord({
          id: 'mesa-1',
          label: 'Mesa 1',
          capacity: 4,
          status: 'ocupada',
          comandaId: 'c-1',
          currentEmployeeId: 'emp-1',
        }),
        buildMesaRecord({
          id: 'mesa-2',
          label: 'Mesa 2',
          capacity: 4,
          status: 'livre',
          comandaId: null,
          currentEmployeeId: null,
        }),
      ],
    })

    mockFetchOperationsLive.mockResolvedValue(snapshot)
    mockFetchOperationsKitchen.mockResolvedValue({
      businessDate: snapshot.businessDate,
      companyOwnerId: snapshot.companyOwnerId,
      items: [
        {
          itemId: 'i-2',
          comandaId: 'c-2',
          mesaLabel: '2',
          employeeId: 'emp-1',
          employeeName: 'Marina',
          productName: 'Café',
          quantity: 1,
          notes: null,
          kitchenStatus: 'QUEUED',
          kitchenQueuedAt: '2026-03-28T11:00:00.000Z',
          kitchenReadyAt: null,
        },
      ],
      statusCounts: {
        queued: 1,
        inPreparation: 0,
        ready: 0,
      },
    })
    const mockProductsResponse: Awaited<ReturnType<typeof api.fetchProducts>> = {
      displayCurrency: 'BRL',
      ratesUpdatedAt: null,
      ratesSource: 'fallback',
      ratesNotice: null,
      items: [],
      totals: {
        totalProducts: 0,
        activeProducts: 0,
        inactiveProducts: 0,
        stockUnits: 0,
        stockPackages: 0,
        stockLooseUnits: 0,
        stockBaseUnits: 0,
        inventoryCostValue: 0,
        inventorySalesValue: 0,
        potentialProfit: 0,
        averageMarginPercent: 0,
        categories: [],
      },
    }
    mockFetchProducts.mockResolvedValue(mockProductsResponse)

    testQueryClient.setQueryData(['operations', 'live', 'compact'], snapshot)
    testQueryClient.setQueryData(['operations', 'kitchen'], {
      businessDate: snapshot.businessDate,
      companyOwnerId: snapshot.companyOwnerId,
      items: [
        {
          itemId: 'i-2',
          comandaId: 'c-2',
          mesaLabel: '2',
          employeeId: 'emp-1',
          employeeName: 'Marina',
          productName: 'Café',
          quantity: 1,
          notes: null,
          kitchenStatus: 'QUEUED',
          kitchenQueuedAt: '2026-03-28T11:00:00.000Z',
          kitchenReadyAt: null,
        },
      ],
      statusCounts: {
        queued: 1,
        inPreparation: 0,
        ready: 0,
      },
    })
    testQueryClient.setQueryData(['products'], mockProductsResponse)
  })

  const renderWithClient = (ui: React.ReactElement) =>
    render(<QueryClientProvider client={testQueryClient}>{ui}</QueryClientProvider>)

  it('mostra o resumo individual do funcionário na aba de histórico', async () => {
    const user = userEvent.setup()

    renderWithClient(<StaffMobileShell currentUser={mockUser} produtos={[]} />)

    await user.click(screen.getByTestId('nav-historico'))

    await waitFor(() => {
      expect(screen.getByTestId('summary-card-receita-realizada')).toHaveTextContent('120,00')
      expect(screen.getByTestId('summary-card-receita-esperada')).toHaveTextContent('200,00')
      expect(screen.getByText(/1 comanda em aberto no seu atendimento/i)).toBeInTheDocument()
    })
  })
})
