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

// Mock das dependências
vi.mock('@/lib/api', () => ({
  fetchOperationsLive: vi.fn(),
  fetchOperationsKitchen: vi.fn(),
  fetchOperationsSummary: vi.fn(),
  fetchOrders: vi.fn(),
  fetchProducts: vi.fn(),
  fetchComandaDetails: vi.fn(),
  logout: vi.fn(),
  openComanda: vi.fn(),
  addComandaItem: vi.fn(),
  addComandaItems: vi.fn(),
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
    const mockFetchOperationsLive = vi.mocked(api.fetchOperationsLive)
    const mockFetchOperationsKitchen = vi.mocked(api.fetchOperationsKitchen)
    const mockFetchOperationsSummary = vi.mocked(api.fetchOperationsSummary)
    const mockFetchOrders = vi.mocked(api.fetchOrders)
    const mockFetchProducts = vi.mocked(api.fetchProducts)
    const mockFetchComandaDetails = vi.mocked(api.fetchComandaDetails)

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

    mockFetchOperationsLive.mockResolvedValue(mockSnapshot)
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
    vi.mocked(api.logout).mockResolvedValue({ success: true })

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
        notes: null,
        openedAt: '2026-03-28T11:00:00.000Z',
        closedAt: '2026-03-28T11:20:00.000Z',
        items: [],
      },
    })

    renderWithClient(<OwnerMobileShell currentUser={mockUser} />)

    await user.click(screen.getByTestId('nav-comandas'))
    await user.click(await screen.findByText('Mesa 2'))
    await user.click(await screen.findByRole('button', { name: /fechar pedido/i }))

    await waitFor(() => {
      expect(api.closeComanda).toHaveBeenCalledWith(
        'c-2',
        { discountAmount: 0, serviceFeeAmount: 0 },
        { includeSnapshot: false },
      )
    })
  })
})
