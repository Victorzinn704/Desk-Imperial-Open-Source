import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OwnerMobileShell } from './owner-mobile-shell'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as api from '@/lib/api'
import { buildMesaRecord, buildOperationsSnapshot } from '@/test/operations-fixtures'
import { OPERATIONS_LIVE_COMPACT_QUERY_KEY } from '@/lib/operations'

// Mock das dependências
vi.mock('@/lib/api', () => ({
  fetchOperationsLive: vi.fn(),
  fetchOrders: vi.fn(),
  fetchProducts: vi.fn(),
  logout: vi.fn(),
  openComanda: vi.fn(),
  addComandaItem: vi.fn(),
  closeComanda: vi.fn(),
  updateComandaStatus: vi.fn(),
  openCashSession: vi.fn(),
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

// Mock do QueryClient
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

describe('OwnerMobileShell', () => {
  const mockUser = {
    name: 'Wilson',
    fullName: 'Wilson Owner',
    companyName: 'Desk Imperial',
  }

  let testQueryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    testQueryClient = createTestQueryClient()

    const mockSnapshot = buildOperationsSnapshot({
      closure: {
        grossRevenueAmount: 320,
        realizedProfitAmount: 140,
        expectedCashAmount: 500,
        openComandasCount: 2,
      },
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
      unassigned: { comandas: [] },
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

    ;(api.fetchOperationsLive as any).mockResolvedValue(mockSnapshot)
    ;(api.fetchOrders as any).mockResolvedValue({
      items: [
        { id: 'o-1', createdAt: new Date().toISOString(), status: 'COMPLETED', totalRevenue: 100 },
        { id: 'o-2', createdAt: new Date().toISOString(), status: 'COMPLETED', totalRevenue: 200 },
      ],
      total: 2,
    })
    ;(api.fetchProducts as any).mockResolvedValue({ items: [], total: 0 })

    // Pré-popula o cache para evitar estados de "loading" nos testes
    testQueryClient.setQueryData(OPERATIONS_LIVE_COMPACT_QUERY_KEY, mockSnapshot)
    testQueryClient.setQueryData(['orders'], {
      items: [
        { id: 'o-1', createdAt: new Date().toISOString(), status: 'COMPLETED', totalRevenue: 100 },
        { id: 'o-2', createdAt: new Date().toISOString(), status: 'COMPLETED', totalRevenue: 200 },
      ],
      total: 2,
    })
    testQueryClient.setQueryData(['products'], { items: [], total: 0 })
  })

  const renderWithClient = (ui: React.ReactElement) => {
    return render(<QueryClientProvider client={testQueryClient}>{ui}</QueryClientProvider>)
  }

  it('deve renderizar o nome do usuário e da empresa', () => {
    renderWithClient(<OwnerMobileShell currentUser={mockUser} />)

    expect(screen.getByTestId('user-display-name')).toHaveTextContent('Wilson')
    expect(screen.getByText('Desk Imperial')).toBeInTheDocument()
  })

  it('deve trocar de aba ao clicar nos botões de navegação', async () => {
    const user = userEvent.setup()
    renderWithClient(<OwnerMobileShell currentUser={mockUser} />)

    // Verifica se a navegação está presente
    expect(screen.getByTestId('nav-mesas')).toBeInTheDocument()
    expect(screen.getByTestId('nav-cozinha')).toBeInTheDocument()

    const kitchenTab = screen.getByTestId('nav-cozinha')
    await user.click(kitchenTab)

    await waitFor(() => {
      expect(screen.getByText('Na fila')).toBeInTheDocument()
    })
  })

  it('deve chamar a API de logout ao clicar no botão de saída', async () => {
    const user = userEvent.setup()
    ;(api.logout as any).mockResolvedValue({ success: true })

    renderWithClient(<OwnerMobileShell currentUser={mockUser} />)

    const logoutBtn = screen.getByTestId('logout-button')
    await user.click(logoutBtn)

    await waitFor(() => {
      expect(api.logout).toHaveBeenCalled()
    })
  })

  it('deve exibir o resumo executivo na aba resumo', async () => {
    const user = userEvent.setup()

    renderWithClient(<OwnerMobileShell currentUser={mockUser} />)

    await user.click(screen.getByTestId('nav-resumo'))

    await waitFor(() => {
      expect(screen.getByTestId('owner-kpi-receita')).toHaveTextContent('320,00')
      expect(screen.getByTestId('owner-kpi-pedidos')).toHaveTextContent('2')
      expect(screen.getByTestId('owner-kpi-comandas')).toHaveTextContent('2')
      expect(screen.getByText('Ranking garçons')).toBeInTheDocument()
    })
  })
})
