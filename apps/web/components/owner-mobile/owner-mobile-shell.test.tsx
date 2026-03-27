import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OwnerMobileShell } from './owner-mobile-shell'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as api from '@/lib/api'

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

    const mockSnapshot = { items: [], employees: [], unassigned: { comandas: [] }, cashSession: null }
    ;(api.fetchOperationsLive as any).mockResolvedValue(mockSnapshot)
    ;(api.fetchOrders as any).mockResolvedValue({ items: [], total: 0 })
    ;(api.fetchProducts as any).mockResolvedValue({ items: [], total: 0 })

    // Pré-popula o cache para evitar estados de "loading" nos testes
    testQueryClient.setQueryData(['operations', 'live'], mockSnapshot)
    testQueryClient.setQueryData(['orders'], { items: [], total: 0 })
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
      expect(screen.getByTestId('kitchen-view-empty')).toBeInTheDocument()
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
})
