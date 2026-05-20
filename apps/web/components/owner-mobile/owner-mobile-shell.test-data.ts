import { QueryClient } from '@tanstack/react-query'
import { vi } from 'vitest'
import * as api from '@/lib/api'
import { buildMesaRecord, buildOperationsSnapshot } from '@/test/operations-fixtures'
import {
  OPERATIONS_KITCHEN_QUERY_KEY,
  OPERATIONS_LIVE_COMPACT_QUERY_KEY,
  OPERATIONS_SUMMARY_QUERY_KEY,
} from '@/lib/operations'
import {
  createFinanceSummary,
  createOrdersResponse,
  createProductsResponse,
} from './owner-mobile-shell.catalog-fixtures'
import {
  createConsentOverview,
  createCurrentUserResponse,
  createTelegramStatus,
  createUserNotificationPreferences,
  createWorkspaceNotificationPreferences,
} from './owner-mobile-shell.user-fixtures'

type DashboardMocks = {
  useDashboardQueriesMock: { mockReturnValue(value: unknown): unknown }
  useDashboardMutationsMock: { mockReturnValue(value: unknown): unknown }
}

const businessDate = '2026-03-28'
type ComandaFixtureSeed = {
  id: string
  tableLabel: string
  totalAmount: number
  productName: string
  kitchenStatus: 'QUEUED' | 'READY'
  quantity: number
  unitPrice: number
}

export const ownerMobileUser = {
  name: 'Wilson',
  fullName: 'Wilson Owner',
  companyName: 'Desk Imperial',
}

export function createOwnerMobileTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
}

export function setupOwnerMobileShellTest(params: DashboardMocks) {
  window.history.pushState({}, '', '/app/owner')

  const queryClient = createOwnerMobileTestQueryClient()
  const fixture = createOwnerMobileFixture()

  configureApiMocks(fixture)
  configureDashboardMocks(params, fixture)
  seedOwnerMobileQueryCache(queryClient, fixture)

  return { queryClient, fixture }
}

function createOwnerMobileFixture() {
  const snapshot = buildOperationsSnapshot({
    businessDate,
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
          buildComandaRecord({
            id: 'c-1',
            tableLabel: '1',
            totalAmount: 120,
            productName: 'Pão de queijo',
            kitchenStatus: 'READY',
            quantity: 2,
            unitPrice: 20,
          }),
          buildComandaRecord(),
        ],
      },
    ],
    unassigned: { comandas: [] },
    mesas: [buildMesa('mesa-1', 'Mesa 1', 'ocupada', 'c-1', 'emp-1'), buildMesa('mesa-2', 'Mesa 2', 'livre')],
  })
  const kitchen = createKitchenResponse(snapshot)
  const summary = createSummaryResponse(snapshot)
  const orders = createOrdersResponse()
  const products = createProductsResponse()
  const finance = createFinanceSummary()

  return {
    snapshot,
    currentUser: createCurrentUserResponse(),
    consent: createConsentOverview(),
    kitchen,
    summary,
    orders,
    products,
    finance,
    comandaDetails: createComandaDetails(snapshot.companyOwnerId),
  }
}

function configureApiMocks(fixture: ReturnType<typeof createOwnerMobileFixture>) {
  vi.mocked(api.fetchOperationsLive).mockResolvedValue(fixture.snapshot)
  vi.mocked(api.fetchOperationsKitchen).mockResolvedValue(fixture.kitchen)
  vi.mocked(api.fetchOperationsSummary).mockResolvedValue(fixture.summary)
  vi.mocked(api.fetchOrders).mockResolvedValue(fixture.orders)
  vi.mocked(api.fetchProducts).mockResolvedValue(fixture.products)
  vi.mocked(api.fetchFinanceSummary).mockResolvedValue(fixture.finance)
  vi.mocked(api.fetchCurrentUser).mockResolvedValue(fixture.currentUser)
  vi.mocked(api.fetchEmployees).mockResolvedValue({
    items: [],
    totals: {
      activeEmployees: 0,
      inactiveEmployees: 0,
      totalEmployees: 0,
    },
  } as Awaited<ReturnType<typeof api.fetchEmployees>>)
  vi.mocked(api.fetchConsentOverview).mockResolvedValue(fixture.consent)
  vi.mocked(api.fetchActivityFeed).mockResolvedValue([])
  vi.mocked(api.fetchComandaDetails).mockResolvedValue(fixture.comandaDetails)
  vi.mocked(api.fetchTelegramIntegrationStatus).mockResolvedValue(createTelegramStatus())
  vi.mocked(api.fetchWorkspaceNotificationPreferences).mockResolvedValue(createWorkspaceNotificationPreferences())
  vi.mocked(api.fetchUserNotificationPreferences).mockResolvedValue(createUserNotificationPreferences())
}

function configureDashboardMocks(params: DashboardMocks, fixture: ReturnType<typeof createOwnerMobileFixture>) {
  params.useDashboardQueriesMock.mockReturnValue({
    sessionQuery: {
      data: fixture.currentUser,
      error: null,
    },
    consentQuery: {
      data: fixture.consent,
      isLoading: false,
    },
  })
  params.useDashboardMutationsMock.mockReturnValue({
    logoutMutation: { isPending: false, mutate: vi.fn() },
    preferenceMutation: { error: null, isPending: false, mutate: vi.fn() },
    updateProfileMutation: { isPending: false, error: null, mutate: vi.fn() },
  })
}

function seedOwnerMobileQueryCache(queryClient: QueryClient, fixture: ReturnType<typeof createOwnerMobileFixture>) {
  queryClient.setQueryData(OPERATIONS_LIVE_COMPACT_QUERY_KEY, fixture.snapshot)
  queryClient.setQueryData(OPERATIONS_KITCHEN_QUERY_KEY, fixture.kitchen)
  queryClient.setQueryData(OPERATIONS_SUMMARY_QUERY_KEY, fixture.summary)
  queryClient.setQueryData(['orders', 'summary'], fixture.orders)
  queryClient.setQueryData(['products'], fixture.products)
  queryClient.setQueryData(['finance', 'summary', 'owner-mobile'], fixture.finance)
}

function buildComandaRecord(seed: Partial<ComandaFixtureSeed> = {}) {
  const comanda: ComandaFixtureSeed = {
    id: 'c-2',
    productName: 'Café',
    kitchenStatus: 'QUEUED',
    tableLabel: '2',
    totalAmount: 80,
    quantity: 1,
    unitPrice: 10,
    ...seed,
  }

  return {
    id: comanda.id,
    status: 'OPEN' as const,
    tableLabel: comanda.tableLabel,
    totalAmount: comanda.totalAmount,
    openedAt: '2026-03-28T11:00:00.000Z',
    items: [
      {
        id: `i-${comanda.tableLabel}`,
        productName: comanda.productName,
        quantity: comanda.quantity,
        unitPrice: comanda.unitPrice,
        kitchenStatus: comanda.kitchenStatus,
      },
    ],
  }
}

function buildMesa(
  id: string,
  label: string,
  status: 'livre' | 'ocupada',
  comandaId: string | null = null,
  currentEmployeeId: string | null = null,
) {
  return buildMesaRecord({ id, label, capacity: 4, status, comandaId, currentEmployeeId })
}

function createComandaDetails(companyOwnerId: string) {
  return {
    comanda: {
      id: 'c-2',
      companyOwnerId,
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
      items: [createComandaDetailItem()],
    },
  } as Awaited<ReturnType<typeof api.fetchComandaDetails>>
}

function createComandaDetailItem() {
  return {
    id: 'i-2',
    productId: null,
    productName: 'Café',
    quantity: 1,
    unitPrice: 80,
    totalAmount: 80,
    notes: null,
    kitchenStatus: 'QUEUED',
    kitchenQueuedAt: '2026-03-28T11:00:00.000Z',
    kitchenReadyAt: null,
  }
}

function createKitchenResponse(snapshot: ReturnType<typeof buildOperationsSnapshot>) {
  return {
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
      ready: 1,
    },
  } as Awaited<ReturnType<typeof api.fetchOperationsKitchen>>
}

function createSummaryResponse(snapshot: ReturnType<typeof buildOperationsSnapshot>) {
  return {
    businessDate: snapshot.businessDate,
    companyOwnerId: snapshot.companyOwnerId,
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
  } as Awaited<ReturnType<typeof api.fetchOperationsSummary>>
}
