/**
 * @file owner-mobile-shell.test.tsx
 * @module Web/OwnerMobile
 *
 * Documenta comportamento operacional do shell mobile do owner,
 * incluindo carregamento de snapshots, interacoes de fluxo e integracao com query cache.
 */

import { type QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '@/lib/api'
import { OwnerMobileShell } from './owner-mobile-shell'
import { ownerMobileUser, setupOwnerMobileShellTest } from './owner-mobile-shell.test-data'

const { useDashboardMutationsMock, useDashboardQueriesMock, useOperationsRealtimeMock } = vi.hoisted(() => ({
  useDashboardMutationsMock: vi.fn(),
  useDashboardQueriesMock: vi.fn(),
  useOperationsRealtimeMock: vi.fn(() => ({ status: 'connected' })),
}))

vi.mock('@/lib/api', () => ({
  fetchOperationsLive: vi.fn(),
  fetchOperationsKitchen: vi.fn(),
  fetchOperationsSummary: vi.fn(),
  fetchOrders: vi.fn(),
  fetchProducts: vi.fn(),
  fetchFinanceSummary: vi.fn(),
  fetchEmployees: vi.fn(),
  fetchCurrentUser: vi.fn(),
  fetchConsentOverview: vi.fn(),
  fetchActivityFeed: vi.fn(),
  updateProfile: vi.fn(),
  updateCookiePreferences: vi.fn(),
  fetchTelegramIntegrationStatus: vi.fn(),
  createTelegramLinkToken: vi.fn(),
  unlinkTelegramIntegration: vi.fn(),
  fetchWorkspaceNotificationPreferences: vi.fn(),
  updateWorkspaceNotificationPreferences: vi.fn(),
  fetchUserNotificationPreferences: vi.fn(),
  updateUserNotificationPreferences: vi.fn(),
  fetchComandaDetails: vi.fn(),
  logout: vi.fn(),
  openComanda: vi.fn(),
  replaceComanda: vi.fn(),
  addComandaItem: vi.fn(),
  addComandaItems: vi.fn(),
  closeComanda: vi.fn(),
  createComandaPayment: vi.fn(),
  createComandaTerminalPaymentIntent: vi.fn(),
  updateComandaStatus: vi.fn(),
  openCashSession: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
  USER_NOTIFICATION_PREFERENCES_QUERY_KEY: ['notifications', 'preferences', 'me'],
  WORKSPACE_NOTIFICATION_PREFERENCES_QUERY_KEY: ['notifications', 'preferences', 'workspace'],
}))

vi.mock('../operations/use-operations-realtime', () => ({
  useOperationsRealtime: useOperationsRealtimeMock,
}))

vi.mock('@/components/dashboard/hooks/useDashboardQueries', () => ({
  useDashboardQueries: () => useDashboardQueriesMock(),
}))

vi.mock('@/components/dashboard/hooks/useDashboardMutations', () => ({
  useDashboardMutations: () => useDashboardMutationsMock(),
}))

describe('OwnerMobileShell', () => {
  let testQueryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    useOperationsRealtimeMock.mockReturnValue({ status: 'connected' })
    testQueryClient = setupOwnerMobileShellTest({
      useDashboardQueriesMock,
      useDashboardMutationsMock,
    }).queryClient
  })

  const renderWithClient = (ui: React.ReactElement) => {
    return render(<QueryClientProvider client={testQueryClient}>{ui}</QueryClientProvider>)
  }

  it('deve renderizar o nome do usuário e da empresa', () => {
    renderWithClient(<OwnerMobileShell currentUser={ownerMobileUser} />)

    expect(screen.getByTestId('user-display-name')).toHaveTextContent('Wilson')
    expect(screen.getByText('Desk Imperial')).toBeInTheDocument()
  })

  it('deve trocar de aba ao clicar nos botões de navegação', async () => {
    const user = userEvent.setup()
    renderWithClient(<OwnerMobileShell currentUser={ownerMobileUser} />)

    expect(screen.getByTestId('nav-today')).toBeInTheDocument()
    expect(screen.getByTestId('nav-pdv')).toBeInTheDocument()

    await user.click(screen.getByTestId('nav-pdv'))
    await user.click(screen.getByTestId('owner-pdv-cozinha'))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /iniciar preparo/i })).toBeInTheDocument()
    })
  })

  it('deve chamar a API de logout ao clicar no botão de saída', async () => {
    const user = userEvent.setup()
    vi.mocked(api.logout).mockResolvedValue({ success: true })

    renderWithClient(<OwnerMobileShell currentUser={ownerMobileUser} />)

    await user.click(screen.getByTestId('logout-button'))

    await waitFor(() => {
      expect(api.logout).toHaveBeenCalled()
    })
  })

  it('deve exibir o resumo executivo na aba Hoje', async () => {
    renderWithClient(<OwnerMobileShell currentUser={ownerMobileUser} />)

    await waitFor(() => {
      expect(screen.getByTestId('owner-kpi-receita')).toHaveTextContent('320,00')
      expect(screen.getByTestId('owner-kpi-pedidos')).toHaveTextContent('2')
      expect(screen.getByTestId('owner-kpi-comandas')).toHaveTextContent('2')
      expect(screen.getByText('Ranking garçons')).toBeInTheDocument()
    })
  })

  it('abre a configuração real quando a rota usa view=settings e panel', async () => {
    window.history.pushState({}, '', '/app/owner?view=settings&panel=account')

    renderWithClient(<OwnerMobileShell currentUser={ownerMobileUser} />)

    expect(await screen.findByRole('heading', { name: 'Configurações do workspace' })).toBeInTheDocument()
    expect(await screen.findByText('Telegram oficial')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Gerar link do Telegram/i })).toBeInTheDocument()
    expect(screen.queryByText('Operação do turno')).not.toBeInTheDocument()
  })

  it('permite fechar uma comanda aberta pelo mobile do owner', async () => {
    const user = userEvent.setup()
    vi.mocked(api.closeComanda).mockResolvedValue(createClosedComandaResponse())

    renderWithClient(<OwnerMobileShell currentUser={ownerMobileUser} />)

    await user.click(screen.getByTestId('nav-comandas'))
    const comandaCard = await screen.findByTestId('owner-comanda-card-c-2')
    await user.click(comandaCard.querySelector('button') as HTMLButtonElement)
    await user.click(await screen.findByRole('button', { name: /fechar manualmente/i }))

    await waitFor(() => {
      expect(api.closeComanda).toHaveBeenCalledWith(
        'c-2',
        { discountAmount: 0, paymentMethod: 'PIX', serviceFeeAmount: 0 },
        { includeSnapshot: false },
      )
    })
  })

  it('envia a cobrança restante para a maquininha sem fechar a comanda', async () => {
    const user = userEvent.setup()
    vi.mocked(api.createComandaTerminalPaymentIntent).mockResolvedValue({
      terminalPaymentIntent: {
        id: 'intent-1',
        comandaId: 'c-2',
        amount: 80,
        method: 'PIX',
        status: 'PENDING',
        provider: 'MERCADO_PAGO_POINT',
        providerOrderId: 'order-1',
        providerPaymentId: null,
        externalReference: 'comanda:c-2:intent:intent-1',
        terminalId: 'terminal-1',
        expiresAt: null,
        createdAt: '2026-03-28T11:20:00.000Z',
      },
    })

    renderWithClient(<OwnerMobileShell currentUser={ownerMobileUser} />)

    await user.click(screen.getByTestId('nav-comandas'))
    const comandaCard = await screen.findByTestId('owner-comanda-card-c-2')
    await user.click(comandaCard.querySelector('button') as HTMLButtonElement)
    await user.click(await screen.findByRole('button', { name: /enviar para maquininha/i }))

    await waitFor(() => {
      expect(api.createComandaTerminalPaymentIntent).toHaveBeenCalledWith('c-2', {
        amount: 80,
        method: 'PIX',
        replacePending: true,
      })
    })
    expect(api.closeComanda).not.toHaveBeenCalled()
  })

  it('expõe aviso offline na visão de mesas do owner quando a conexão cai', async () => {
    const user = userEvent.setup()
    useOperationsRealtimeMock.mockReturnValue({ status: 'disconnected' })

    renderWithClient(<OwnerMobileShell currentUser={ownerMobileUser} />)
    await user.click(screen.getByTestId('nav-pdv'))

    expect(await screen.findByText(/O PDV pode estar desatualizado até a reconexão/i)).toBeInTheDocument()
  })

  it('abre primeiro a comanda ao tocar em uma mesa ocupada e só depois edita itens', async () => {
    const user = userEvent.setup()

    renderWithClient(<OwnerMobileShell currentUser={ownerMobileUser} />)
    await user.click(screen.getByTestId('nav-pdv'))
    await user.click(await screen.findByTestId('mobile-mesa-mesa-1'))

    await waitFor(() => {
      expect(screen.getByTestId('owner-comanda-card-c-1')).toBeInTheDocument()
    })
    expect(screen.getByTestId('nav-comandas')).toBeInTheDocument()

    await user.click(await screen.findByRole('button', { name: /editar \/ adicionar itens/i }))

    await waitFor(() => {
      expect(screen.getByText('Editar comanda')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Buscar produto...')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('nav-pdv')).not.toBeInTheDocument()
  })
})

function createClosedComandaResponse() {
  return {
    comanda: {
      id: 'c-2',
      companyOwnerId: 'owner-1',
      cashSessionId: 'cash-1',
      mesaId: 'mesa-2',
      currentEmployeeId: 'emp-1',
      tableLabel: '2',
      customerName: null,
      customerDocument: null,
      participantCount: 1,
      status: 'CLOSED',
      subtotalAmount: 80,
      discountAmount: 0,
      serviceFeeAmount: 0,
      totalAmount: 80,
      paidAmount: 80,
      remainingAmount: 0,
      paymentStatus: 'PAID',
      notes: null,
      openedAt: '2026-03-28T11:00:00.000Z',
      closedAt: '2026-03-28T11:20:00.000Z',
      payments: [
        {
          id: 'pay-1',
          amount: 80,
          method: 'PIX',
          note: null,
          paidAt: '2026-03-28T11:20:00.000Z',
          status: 'CONFIRMED',
        },
      ],
      items: [],
    },
  } as Awaited<ReturnType<typeof api.closeComanda>>
}
