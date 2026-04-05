import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginForm } from './login-form'
import { fetchCurrentUser, fetchFinanceSummary, fetchOrders, fetchProducts, login, loginDemo } from '@/lib/api'

const routerReplace = vi.fn()
const routerPush = vi.fn()
const routerPrefetch = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: routerReplace,
    push: routerPush,
    prefetch: routerPrefetch,
  }),
}))

vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
  fetchCurrentUser: vi.fn(),
  fetchFinanceSummary: vi.fn(),
  fetchOrders: vi.fn(),
  fetchProducts: vi.fn(),
  login: vi.fn(),
  loginDemo: vi.fn(),
}))

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('liga os labels aos campos corretos para empresa e funcionário', async () => {
    const user = userEvent.setup()
    const queryClient = createTestQueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <LoginForm />
      </QueryClientProvider>,
    )

    expect(screen.getByLabelText(/email corporativo/i)).toHaveAttribute('id', 'login-email')
    expect(screen.getByLabelText(/senha de acesso/i)).toHaveAttribute('id', 'login-password')

    await user.click(screen.getByRole('button', { name: /funcionário/i }))

    expect(screen.getByLabelText(/email da empresa/i)).toHaveAttribute('id', 'login-company-email')
    expect(screen.getByLabelText(/id do funcionário/i)).toHaveAttribute('id', 'login-employee-code')
    expect(screen.getByLabelText(/pin de acesso/i)).toHaveAttribute('id', 'login-password')
  })

  it('envia credenciais do owner e aciona o fluxo demo do staff', async () => {
    const user = userEvent.setup()
    const queryClient = createTestQueryClient()

    vi.mocked(fetchCurrentUser).mockResolvedValue({ user: { role: 'OWNER' } } as never)
    vi.mocked(fetchFinanceSummary).mockResolvedValue({ totals: {} } as never)
    vi.mocked(fetchProducts).mockResolvedValue({ products: [], totals: { activeProducts: 0 } } as never)
    vi.mocked(fetchOrders).mockResolvedValue({ totals: { completedOrders: 0 }, orders: [] } as never)
    vi.mocked(login).mockResolvedValue({ user: { role: 'OWNER' } } as never)
    vi.mocked(loginDemo).mockResolvedValue({ user: { role: 'STAFF' } } as never)

    render(
      <QueryClientProvider client={queryClient}>
        <LoginForm />
      </QueryClientProvider>,
    )

    await user.type(screen.getByLabelText(/email corporativo/i), 'ceo@empresa.com')
    await user.type(screen.getByLabelText(/senha de acesso/i), '12345678')
    await user.click(screen.getByRole('button', { name: /entrar no portal/i }))

    expect(login).toHaveBeenCalledWith({
      loginMode: 'OWNER',
      email: 'ceo@empresa.com',
      password: '12345678',
    })
    expect(routerReplace).toHaveBeenCalledWith('/dashboard')

    await user.click(screen.getByRole('button', { name: /funcionário/i }))
    await user.click(screen.getByRole('button', { name: /acessar sessão demo funcionário/i }))

    expect(loginDemo).toHaveBeenCalledWith(
      { loginMode: 'STAFF', employeeCode: 'VD-001' },
      expect.anything(),
    )
  })
})
