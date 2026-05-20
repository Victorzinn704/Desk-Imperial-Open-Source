import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CaixaPanel } from './caixa-panel'
import { openCashSession } from '@/lib/api'

vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
  openCashSession: vi.fn(),
  closeCashClosure: vi.fn(),
}))

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

describe('CaixaPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('abre e fecha o modal de caixa pelo backdrop nativo', async () => {
    const queryClient = createTestQueryClient()
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <CaixaPanel operations={undefined} />
      </QueryClientProvider>,
    )

    await user.click(screen.getAllByRole('button', { name: /abrir caixa/i })[0]!)
    expect(screen.getByLabelText(/fechar modal do caixa/i)).toBeInTheDocument()

    await user.click(screen.getByLabelText(/fechar modal do caixa/i))

    expect(screen.queryByText(/valor inicial no caixa/i)).not.toBeInTheDocument()
  })

  it('valida o valor inicial antes de abrir o caixa', async () => {
    const queryClient = createTestQueryClient()
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <CaixaPanel operations={undefined} />
      </QueryClientProvider>,
    )

    await user.click(screen.getAllByRole('button', { name: /abrir caixa/i })[0]!)
    await user.type(screen.getByPlaceholderText('0,00'), '-10')
    await user.click(screen.getAllByRole('button', { name: /^abrir caixa$/i })[1]!)

    expect(screen.getByText(/não pode ser negativo/i)).toBeInTheDocument()
    expect(openCashSession).not.toHaveBeenCalled()
  })
})
