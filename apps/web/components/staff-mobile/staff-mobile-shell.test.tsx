/**
 * @file staff-mobile-shell.test.tsx
 * @module Web/StaffMobile
 *
 * Documenta fluxo operacional do staff em mobile,
 * com foco em mesas, comandas, cozinha e sincronizacao de dados em tempo real.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import * as api from '@/lib/api'
import { buildMesaRecord, buildOperationsSnapshot } from '@/test/operations-fixtures'
import { OPERATIONS_LIVE_OPEN_ONLY_QUERY_KEY } from '@/lib/operations'
import { StaffMobileShell } from './staff-mobile-shell'

const enqueueMock = vi.fn()
const drainQueueMock = vi.fn()

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

vi.mock('@/components/shared/use-offline-queue', () => ({
  useOfflineQueue: vi.fn(() => ({
    enqueue: enqueueMock,
    drainQueue: drainQueueMock,
  })),
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
    enqueueMock.mockResolvedValue('offline-1')
    drainQueueMock.mockResolvedValue({
      expiredCount: 0,
      processedCount: 0,
      failedCount: 0,
    })
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

    testQueryClient.setQueryData(OPERATIONS_LIVE_OPEN_ONLY_QUERY_KEY, snapshot)
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

  it('avisa quando ações offline expiram antes do reconnect', async () => {
    drainQueueMock.mockResolvedValueOnce({
      expiredCount: 2,
      processedCount: 0,
      failedCount: 0,
    })

    renderWithClient(<StaffMobileShell currentUser={mockUser} />)

    await waitFor(() => {
      expect(drainQueueMock).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        '2 ações offline expiraram após 10 minutos sem conexão e foram descartadas.',
      )
    })
  })

  it('mostra o resumo individual do funcionário na aba de histórico', async () => {
    const user = userEvent.setup()

    renderWithClient(<StaffMobileShell currentUser={mockUser} />)

    await user.click(screen.getByTestId('nav-historico'))

    await waitFor(() => {
      expect(screen.getByTestId('summary-card-receita-realizada')).toHaveTextContent('120,00')
      expect(screen.getByTestId('summary-card-receita-esperada')).toHaveTextContent('200,00')
      expect(screen.getByText(/1 comanda em aberto no seu atendimento/i)).toBeInTheDocument()
    })
  })

  it('abre uma nova comanda pelo fluxo categorias → produtos e envia o pedido', async () => {
    const user = userEvent.setup()
    const flowSnapshot = buildOperationsSnapshot({
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
          id: 'mesa-3',
          label: 'Mesa 3',
          capacity: 4,
          status: 'livre',
          comandaId: null,
          currentEmployeeId: null,
        }),
      ],
    })
    const mockProductsResponse: Awaited<ReturnType<typeof api.fetchProducts>> = {
      displayCurrency: 'BRL',
      ratesUpdatedAt: null,
      ratesSource: 'fallback',
      ratesNotice: null,
      items: [
        {
          id: 'prod-1',
          name: 'Café especial',
          brand: null,
          category: 'Bebidas',
          packagingClass: 'UNIT',
          measurementUnit: 'ml',
          measurementValue: 300,
          unitsPerPackage: 1,
          stockPackages: 20,
          stockLooseUnits: 0,
          description: null,
          currency: 'BRL',
          displayCurrency: 'BRL',
          unitCost: 4,
          unitPrice: 12,
          originalUnitCost: 4,
          originalUnitPrice: 12,
          stock: 20,
          lowStockThreshold: null,
          isLowStock: false,
          requiresKitchen: false,
          active: true,
          createdAt: '2026-03-28T10:00:00.000Z',
          updatedAt: '2026-03-28T10:00:00.000Z',
          inventoryCostValue: 80,
          inventorySalesValue: 240,
          potentialProfit: 160,
          originalInventoryCostValue: 80,
          originalInventorySalesValue: 240,
          originalPotentialProfit: 160,
          stockBaseUnits: 20,
          marginPercent: 200,
        },
      ],
      totals: {
        totalProducts: 1,
        activeProducts: 1,
        inactiveProducts: 0,
        stockUnits: 20,
        stockPackages: 20,
        stockLooseUnits: 0,
        stockBaseUnits: 20,
        inventoryCostValue: 80,
        inventorySalesValue: 240,
        potentialProfit: 160,
        averageMarginPercent: 200,
        categories: ['Bebidas'],
      },
    }

    vi.mocked(api.fetchOperationsLive).mockResolvedValue(flowSnapshot)
    testQueryClient.setQueryData(OPERATIONS_LIVE_OPEN_ONLY_QUERY_KEY, flowSnapshot)
    vi.mocked(api.fetchProducts).mockResolvedValue(mockProductsResponse)
    testQueryClient.setQueryData(['products'], mockProductsResponse)
    vi.mocked(api.openComanda).mockResolvedValue({
      comanda: {
        id: 'c-new',
        companyOwnerId: 'owner-1',
        cashSessionId: 'cash-1',
        mesaId: 'mesa-2',
        currentEmployeeId: 'emp-1',
        tableLabel: '2',
        customerName: null,
        customerDocument: null,
        participantCount: 1,
        status: 'OPEN',
        subtotalAmount: 12,
        discountAmount: 0,
        serviceFeeAmount: 0,
        totalAmount: 12,
        notes: null,
        openedAt: '2026-03-28T12:00:00.000Z',
        closedAt: null,
        items: [
          {
            id: 'i-new',
            productId: 'prod-1',
            productName: 'Café especial',
            quantity: 1,
            unitPrice: 12,
            totalAmount: 12,
            notes: null,
            kitchenStatus: null,
            kitchenQueuedAt: null,
            kitchenReadyAt: null,
          },
        ],
      },
    })

    renderWithClient(<StaffMobileShell currentUser={mockUser} />)

    await user.click(screen.getByRole('button', { name: /mesa 3.*novo pdv/i }))
    expect(await screen.findByText(/Escolha uma categoria/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^Bebidas$/i }))
    await user.click(screen.getByRole('button', { name: /Adicionar Café especial/i }))
    await user.click(screen.getByRole('button', { name: /Enviar pedido/i }))

    await waitFor(() => {
      expect(api.openComanda).toHaveBeenCalledWith(
        expect.objectContaining({
          tableLabel: '3',
          mesaId: 'mesa-3',
          items: [
            expect.objectContaining({
              productId: 'prod-1',
              quantity: 1,
              unitPrice: 12,
            }),
          ],
        }),
        { includeSnapshot: false },
      )
    })

    await waitFor(() => {
      expect(screen.getByText(/Comandas ativas/i)).toBeInTheDocument()
    })
  })
})
