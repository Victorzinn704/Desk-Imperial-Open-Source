/**
 * @file owner-mobile-shell.test.tsx
 * @module Web/OwnerMobile
 *
 * Documenta comportamento operacional do shell mobile do owner,
 * incluindo carregamento de snapshots, interacoes de fluxo e integracao com query cache.
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OwnerMobileShell } from './owner-mobile-shell'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as api from '@/lib/api'
import { buildMesaRecord, buildOperationsSnapshot } from '@/test/operations-fixtures'
import {
  OPERATIONS_KITCHEN_QUERY_KEY,
  OPERATIONS_LIVE_COMPACT_QUERY_KEY,
  OPERATIONS_SUMMARY_QUERY_KEY,
} from '@/lib/operations'

const { useDashboardMutationsMock, useDashboardQueriesMock, useOperationsRealtimeMock } = vi.hoisted(() => ({
  useDashboardMutationsMock: vi.fn(),
  useDashboardQueriesMock: vi.fn(),
  useOperationsRealtimeMock: vi.fn(() => ({ status: 'connected' })),
}))

// Mock das dependências
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
    useOperationsRealtimeMock.mockReturnValue({ status: 'connected' })
    testQueryClient = createTestQueryClient()
    const mockFetchOperationsLive = vi.mocked(api.fetchOperationsLive)
    const mockFetchOperationsKitchen = vi.mocked(api.fetchOperationsKitchen)
    const mockFetchOperationsSummary = vi.mocked(api.fetchOperationsSummary)
    const mockFetchOrders = vi.mocked(api.fetchOrders)
    const mockFetchProducts = vi.mocked(api.fetchProducts)
    const mockFetchFinanceSummary = vi.mocked(api.fetchFinanceSummary)
    const mockFetchEmployees = vi.mocked(api.fetchEmployees)
    const mockFetchCurrentUser = vi.mocked(api.fetchCurrentUser)
    const mockFetchConsentOverview = vi.mocked(api.fetchConsentOverview)
    const mockFetchActivityFeed = vi.mocked(api.fetchActivityFeed)
    const mockFetchTelegramIntegrationStatus = vi.mocked(api.fetchTelegramIntegrationStatus)
    const mockFetchWorkspaceNotificationPreferences = vi.mocked(api.fetchWorkspaceNotificationPreferences)
    const mockFetchUserNotificationPreferences = vi.mocked(api.fetchUserNotificationPreferences)
    const mockFetchComandaDetails = vi.mocked(api.fetchComandaDetails)
    window.history.pushState({}, '', '/app/owner')

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
              status: 'OPEN',
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

    const currentUserResponse = {
      user: {
        userId: 'owner-1',
        sessionId: 'session-1',
        role: 'OWNER',
        workspaceOwnerUserId: 'owner-1',
        companyOwnerUserId: null,
        employeeId: null,
        employeeCode: null,
        fullName: 'Wilson Owner',
        companyName: 'Desk Imperial',
        companyLocation: {
          streetLine1: null,
          streetNumber: null,
          addressComplement: null,
          district: null,
          city: null,
          state: null,
          postalCode: null,
          country: null,
          latitude: null,
          longitude: null,
          precision: 'city',
        },
        workforce: {
          hasEmployees: true,
          employeeCount: 2,
        },
        email: 'owner@desk.test',
        emailVerified: true,
        preferredCurrency: 'BRL',
        status: 'ACTIVE',
        evaluationAccess: null,
        cookiePreferences: {
          necessary: true,
          analytics: false,
          marketing: false,
        },
      },
    } as Awaited<ReturnType<typeof api.fetchCurrentUser>>
    const consentOverview = {
      documents: [],
      legalAcceptances: [],
      cookiePreferences: {
        necessary: true,
        analytics: false,
        marketing: false,
      },
    } as Awaited<ReturnType<typeof api.fetchConsentOverview>>

    mockFetchOperationsLive.mockResolvedValue(mockSnapshot)
    mockFetchCurrentUser.mockResolvedValue(currentUserResponse)
    mockFetchEmployees.mockResolvedValue({
      items: [],
    } as unknown as Awaited<ReturnType<typeof api.fetchEmployees>>)
    mockFetchConsentOverview.mockResolvedValue(consentOverview)
    mockFetchActivityFeed.mockResolvedValue([])
    useDashboardQueriesMock.mockReturnValue({
      sessionQuery: {
        data: currentUserResponse,
        error: null,
      },
      consentQuery: {
        data: consentOverview,
        isLoading: false,
      },
    })
    useDashboardMutationsMock.mockReturnValue({
      logoutMutation: { isPending: false, mutate: vi.fn() },
      preferenceMutation: { error: null, isPending: false, mutate: vi.fn() },
      updateProfileMutation: { isPending: false, error: null, mutate: vi.fn() },
    })
    mockFetchTelegramIntegrationStatus.mockResolvedValue({
      enabled: true,
      workspaceEnabled: true,
      restrictionReason: null,
      botUsername: 'Desk_Imperial_bot',
      deeplinkBase: 'https://t.me/Desk_Imperial_bot',
      linked: false,
      account: null,
    })
    mockFetchWorkspaceNotificationPreferences.mockResolvedValue({
      preferences: [
        {
          channel: 'TELEGRAM',
          eventType: 'operations.comanda.status_changed',
          enabled: true,
          inherited: true,
        },
        {
          channel: 'TELEGRAM',
          eventType: 'operations.kitchen_item.status_changed',
          enabled: true,
          inherited: true,
        },
      ],
    })
    mockFetchUserNotificationPreferences.mockResolvedValue({
      preferences: [
        {
          channel: 'WEB_TOAST',
          eventType: 'operations.comanda.status_changed',
          enabled: true,
          inherited: true,
        },
        {
          channel: 'MOBILE_TOAST',
          eventType: 'operations.comanda.status_changed',
          enabled: true,
          inherited: true,
        },
      ],
    })
    mockFetchComandaDetails.mockResolvedValue({
      comanda: {
        id: 'c-2',
        companyOwnerId: mockSnapshot.companyOwnerId,
        cashSessionId: 'cash-1',
        mesaId: 'mesa-2',
        currentEmployeeId: 'emp-1',
        tableLabel: '2',
        customerName: null,
        customerDocument: null,
        participantCount: 1,
        status: 'OPEN',
        subtotalAmount: 80,
        discountAmount: 0,
        serviceFeeAmount: 0,
        totalAmount: 80,
        notes: null,
        openedAt: '2026-03-28T11:00:00.000Z',
        closedAt: null,
        items: [
          {
            id: 'i-2',
            productId: null,
            productName: 'Café',
            quantity: 1,
            unitPrice: 10,
            totalAmount: 10,
            notes: null,
            kitchenStatus: 'QUEUED',
            kitchenQueuedAt: '2026-03-28T11:00:00.000Z',
            kitchenReadyAt: null,
          },
        ],
      },
    })
    mockFetchOperationsKitchen.mockResolvedValue({
      businessDate: mockSnapshot.businessDate,
      companyOwnerId: mockSnapshot.companyOwnerId,
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
        ready: 1,
      },
    })
    mockFetchOperationsSummary.mockResolvedValue({
      businessDate: mockSnapshot.businessDate,
      companyOwnerId: mockSnapshot.companyOwnerId,
      kpis: {
        receitaRealizada: 320,
        faturamentoAberto: 80,
        projecaoTotal: 400,
        lucroRealizado: 140,
        lucroEsperado: 220,
        caixaEsperado: 500,
        openComandasCount: 2,
        openSessionsCount: 0,
      },
      performers: [{ nome: 'Marina', valor: 200, comandas: 2 }],
      topProducts: [
        { nome: 'Pão de queijo', qtd: 2, valor: 40 },
        { nome: 'Café', qtd: 1, valor: 10 },
      ],
    })
    const mockOrdersResponse: Awaited<ReturnType<typeof api.fetchOrders>> = {
      items: [
        {
          id: 'o-1',
          comandaId: null,
          customerName: null,
          buyerType: null,
          buyerDocument: null,
          buyerDistrict: null,
          buyerCity: null,
          buyerState: null,
          buyerCountry: null,
          buyerLatitude: null,
          buyerLongitude: null,
          employeeId: null,
          sellerCode: null,
          sellerName: null,
          channel: null,
          notes: null,
          currency: 'BRL',
          displayCurrency: 'BRL',
          status: 'COMPLETED',
          totalRevenue: 100,
          totalCost: 0,
          totalProfit: 100,
          originalTotalRevenue: 100,
          originalTotalCost: 0,
          originalTotalProfit: 100,
          totalItems: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          cancelledAt: null,
          items: [],
        },
        {
          id: 'o-2',
          comandaId: null,
          customerName: null,
          buyerType: null,
          buyerDocument: null,
          buyerDistrict: null,
          buyerCity: null,
          buyerState: null,
          buyerCountry: null,
          buyerLatitude: null,
          buyerLongitude: null,
          employeeId: null,
          sellerCode: null,
          sellerName: null,
          channel: null,
          notes: null,
          currency: 'BRL',
          displayCurrency: 'BRL',
          status: 'COMPLETED',
          totalRevenue: 200,
          totalCost: 0,
          totalProfit: 200,
          originalTotalRevenue: 200,
          originalTotalCost: 0,
          originalTotalProfit: 200,
          totalItems: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          cancelledAt: null,
          items: [],
        },
      ],
      totals: {
        completedOrders: 2,
        cancelledOrders: 0,
        realizedRevenue: 300,
        realizedProfit: 120,
        soldUnits: 3,
      },
    }
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
    mockFetchOrders.mockResolvedValue(mockOrdersResponse)
    mockFetchProducts.mockResolvedValue(mockProductsResponse)
    mockFetchFinanceSummary.mockResolvedValue({
      displayCurrency: 'BRL',
      ratesUpdatedAt: null,
      ratesSource: 'fallback',
      ratesNotice: null,
      totals: {
        activeProducts: 3,
        inventoryUnits: 30,
        inventoryCostValue: 300,
        inventorySalesValue: 600,
        potentialProfit: 300,
        realizedRevenue: 300,
        realizedCost: 180,
        realizedProfit: 120,
        completedOrders: 2,
        currentMonthRevenue: 300,
        currentMonthProfit: 120,
        previousMonthRevenue: 200,
        previousMonthProfit: 80,
        revenueGrowthPercent: 50,
        profitGrowthPercent: 50,
        averageMarginPercent: 40,
        averageMarkupPercent: 66.6,
        lowStockItems: 0,
      },
      categoryBreakdown: [
        {
          category: 'Petiscos',
          products: 2,
          units: 12,
          inventoryCostValue: 120,
          inventorySalesValue: 240,
          potentialProfit: 120,
        },
        {
          category: 'Cervejas',
          products: 1,
          units: 18,
          inventoryCostValue: 180,
          inventorySalesValue: 360,
          potentialProfit: 180,
        },
      ],
      topProducts: [],
      recentOrders: [],
      revenueTimeline: [],
      salesByChannel: [],
      topCustomers: [],
      topEmployees: [],
      salesMap: [],
      topRegions: [],
      categoryTopProducts: {},
    })

    // Pré-popula o cache para evitar estados de "loading" nos testes
    testQueryClient.setQueryData(OPERATIONS_LIVE_COMPACT_QUERY_KEY, mockSnapshot)
    testQueryClient.setQueryData(OPERATIONS_KITCHEN_QUERY_KEY, {
      businessDate: mockSnapshot.businessDate,
      companyOwnerId: mockSnapshot.companyOwnerId,
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
        ready: 1,
      },
    })
    testQueryClient.setQueryData(OPERATIONS_SUMMARY_QUERY_KEY, {
      businessDate: mockSnapshot.businessDate,
      companyOwnerId: mockSnapshot.companyOwnerId,
      kpis: {
        receitaRealizada: 320,
        faturamentoAberto: 80,
        projecaoTotal: 400,
        lucroRealizado: 140,
        lucroEsperado: 220,
        caixaEsperado: 500,
        openComandasCount: 2,
        openSessionsCount: 0,
      },
      performers: [{ nome: 'Marina', valor: 200, comandas: 2 }],
      topProducts: [
        { nome: 'Pão de queijo', qtd: 2, valor: 40 },
        { nome: 'Café', qtd: 1, valor: 10 },
      ],
    })
    testQueryClient.setQueryData(['orders', 'summary'], {
      items: [
        {
          id: 'o-1',
          comandaId: null,
          customerName: null,
          buyerType: null,
          buyerDocument: null,
          buyerDistrict: null,
          buyerCity: null,
          buyerState: null,
          buyerCountry: null,
          buyerLatitude: null,
          buyerLongitude: null,
          employeeId: null,
          sellerCode: null,
          sellerName: null,
          channel: null,
          notes: null,
          currency: 'BRL',
          displayCurrency: 'BRL',
          status: 'COMPLETED',
          totalRevenue: 100,
          totalCost: 0,
          totalProfit: 100,
          originalTotalRevenue: 100,
          originalTotalCost: 0,
          originalTotalProfit: 100,
          totalItems: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          cancelledAt: null,
          items: [],
        },
        {
          id: 'o-2',
          comandaId: null,
          customerName: null,
          buyerType: null,
          buyerDocument: null,
          buyerDistrict: null,
          buyerCity: null,
          buyerState: null,
          buyerCountry: null,
          buyerLatitude: null,
          buyerLongitude: null,
          employeeId: null,
          sellerCode: null,
          sellerName: null,
          channel: null,
          notes: null,
          currency: 'BRL',
          displayCurrency: 'BRL',
          status: 'COMPLETED',
          totalRevenue: 200,
          totalCost: 0,
          totalProfit: 200,
          originalTotalRevenue: 200,
          originalTotalCost: 0,
          originalTotalProfit: 200,
          totalItems: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          cancelledAt: null,
          items: [],
        },
      ],
      totals: {
        completedOrders: 2,
        cancelledOrders: 0,
        realizedRevenue: 300,
        realizedProfit: 120,
        soldUnits: 3,
      },
    } as unknown as Awaited<ReturnType<typeof api.fetchOrders>>)
    testQueryClient.setQueryData(['products'], {
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
    } as unknown as Awaited<ReturnType<typeof api.fetchProducts>>)
    testQueryClient.setQueryData(['finance', 'summary', 'owner-mobile'], {
      displayCurrency: 'BRL',
      ratesUpdatedAt: null,
      ratesSource: 'fallback',
      ratesNotice: null,
      totals: {
        activeProducts: 3,
        inventoryUnits: 30,
        inventoryCostValue: 300,
        inventorySalesValue: 600,
        potentialProfit: 300,
        realizedRevenue: 300,
        realizedCost: 180,
        realizedProfit: 120,
        completedOrders: 2,
        currentMonthRevenue: 300,
        currentMonthProfit: 120,
        previousMonthRevenue: 200,
        previousMonthProfit: 80,
        revenueGrowthPercent: 50,
        profitGrowthPercent: 50,
        averageMarginPercent: 40,
        averageMarkupPercent: 66.6,
        lowStockItems: 0,
      },
      categoryBreakdown: [
        {
          category: 'Petiscos',
          products: 2,
          units: 12,
          inventoryCostValue: 120,
          inventorySalesValue: 240,
          potentialProfit: 120,
        },
        {
          category: 'Cervejas',
          products: 1,
          units: 18,
          inventoryCostValue: 180,
          inventorySalesValue: 360,
          potentialProfit: 180,
        },
      ],
      topProducts: [],
      recentOrders: [],
      revenueTimeline: [],
      salesByChannel: [],
      topCustomers: [],
      topEmployees: [],
      salesMap: [],
      topRegions: [],
      categoryTopProducts: {},
    } as unknown as Awaited<ReturnType<typeof api.fetchFinanceSummary>>)
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

    renderWithClient(<OwnerMobileShell currentUser={mockUser} />)

    const logoutBtn = screen.getByTestId('logout-button')
    await user.click(logoutBtn)

    await waitFor(() => {
      expect(api.logout).toHaveBeenCalled()
    })
  })

  it('deve exibir o resumo executivo na aba Hoje', async () => {
    renderWithClient(<OwnerMobileShell currentUser={mockUser} />)

    await waitFor(() => {
      expect(screen.getByTestId('owner-kpi-receita')).toHaveTextContent('320,00')
      expect(screen.getByTestId('owner-kpi-pedidos')).toHaveTextContent('2')
      expect(screen.getByTestId('owner-kpi-comandas')).toHaveTextContent('2')
      expect(screen.getByText('Ranking garçons')).toBeInTheDocument()
    })
  })

  it('abre a configuração real quando a rota usa view=settings e panel', async () => {
    window.history.pushState({}, '', '/app/owner?view=settings&panel=account')

    renderWithClient(<OwnerMobileShell currentUser={mockUser} />)

    expect(await screen.findByRole('heading', { name: 'Configurações do workspace' })).toBeInTheDocument()
    expect(await screen.findByText('Telegram oficial')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Gerar link do Telegram/i })).toBeInTheDocument()
    expect(screen.queryByText('Operação do turno')).not.toBeInTheDocument()
  })

  it('permite fechar uma comanda aberta pelo mobile do owner', async () => {
    const user = userEvent.setup()
    vi.mocked(api.closeComanda).mockResolvedValue({
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
    })

    renderWithClient(<OwnerMobileShell currentUser={mockUser} />)

    await user.click(screen.getByTestId('nav-comandas'))
    const comandaCard = await screen.findByTestId('owner-comanda-card-c-2')
    await user.click(comandaCard.querySelector('button') as HTMLButtonElement)
    await user.click(await screen.findByRole('button', { name: /pagar restante e fechar/i }))

    await waitFor(() => {
      expect(api.closeComanda).toHaveBeenCalledWith(
        'c-2',
        { discountAmount: 0, paymentMethod: 'PIX', serviceFeeAmount: 0 },
        { includeSnapshot: false },
      )
    })
  })

  it('expõe aviso offline na visão de mesas do owner quando a conexão cai', async () => {
    const user = userEvent.setup()
    useOperationsRealtimeMock.mockReturnValue({ status: 'disconnected' })

    renderWithClient(<OwnerMobileShell currentUser={mockUser} />)
    await user.click(screen.getByTestId('nav-pdv'))

    expect(await screen.findByText(/O PDV pode estar desatualizado até a reconexão/i)).toBeInTheDocument()
  })

  it('abre primeiro a comanda ao tocar em uma mesa ocupada e só depois edita itens', async () => {
    const user = userEvent.setup()

    renderWithClient(<OwnerMobileShell currentUser={mockUser} />)
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
