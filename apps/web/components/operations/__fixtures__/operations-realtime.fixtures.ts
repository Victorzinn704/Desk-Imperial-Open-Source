import { vi } from 'vitest'
import type {
  CashSessionRecord,
  ComandaItemRecord,
  ComandaRecord,
  MesaRecord,
  OperationsKitchenItemRecord,
  OperationsKitchenResponse,
  OperationsLiveResponse,
  OperationsSummaryResponse,
} from '@contracts/contracts'
import {
  OPERATIONS_KITCHEN_QUERY_KEY,
  OPERATIONS_LIVE_COMPACT_QUERY_KEY,
  OPERATIONS_SUMMARY_QUERY_KEY,
} from '@/lib/operations/operations-query'

// ---------------------------------------------------------------------------
// Compact factories
// ---------------------------------------------------------------------------

export const DEFAULT_COMANDA: ComandaRecord = {
  id: 'comanda-1',
  companyOwnerId: 'owner-1',
  cashSessionId: null,
  mesaId: null,
  currentEmployeeId: null,
  tableLabel: 'Mesa 1',
  customerName: null,
  customerDocument: null,
  participantCount: 1,
  status: 'OPEN',
  subtotalAmount: 50,
  discountAmount: 0,
  serviceFeeAmount: 0,
  totalAmount: 50,
  notes: null,
  openedAt: '2026-03-30T10:00:00.000Z',
  closedAt: null,
  items: [],
}

export const DEFAULT_CASH_SESSION: CashSessionRecord = {
  id: 'cs-1',
  companyOwnerId: 'owner-1',
  employeeId: 'emp-1',
  status: 'OPEN',
  businessDate: '2026-03-30',
  openingCashAmount: 100,
  countedCashAmount: null,
  expectedCashAmount: 200,
  differenceAmount: null,
  grossRevenueAmount: 150,
  realizedProfitAmount: 50,
  notes: null,
  openedAt: '2026-03-30T08:00:00.000Z',
  closedAt: null,
  movements: [],
}

export const DEFAULT_MESA: MesaRecord = {
  id: 'm-1',
  label: 'Mesa 1',
  capacity: 4,
  section: null,
  positionX: null,
  positionY: null,
  active: true,
  reservedUntil: null,
  status: 'livre',
  comandaId: null,
  currentEmployeeId: null,
}

export const DEFAULT_KITCHEN_ITEM: OperationsKitchenItemRecord = {
  itemId: 'item-1',
  comandaId: 'comanda-1',
  mesaLabel: 'Mesa 1',
  employeeId: null,
  employeeName: 'Operacao',
  productName: 'Pizza',
  quantity: 1,
  notes: null,
  kitchenStatus: 'QUEUED',
  kitchenQueuedAt: '2026-03-30T10:00:00.000Z',
  kitchenReadyAt: null,
}

export const DEFAULT_COMANDA_ITEM: ComandaItemRecord = {
  id: 'item-1',
  productId: 'prod-1',
  productName: 'Pizza',
  quantity: 1,
  unitPrice: 25,
  totalAmount: 25,
  notes: null,
  kitchenStatus: 'QUEUED',
  kitchenQueuedAt: '2026-03-30T10:00:00.000Z',
  kitchenReadyAt: null,
}

export function comanda(o: Partial<ComandaRecord> = {}): ComandaRecord {
  return { ...DEFAULT_COMANDA, ...o }
}
export function cashSession(o: Partial<CashSessionRecord> = {}): CashSessionRecord {
  return { ...DEFAULT_CASH_SESSION, ...o }
}
export function mesa(o: Partial<MesaRecord> = {}): MesaRecord {
  return { ...DEFAULT_MESA, ...o }
}
export function kitchenItem(o: Partial<OperationsKitchenItemRecord> = {}): OperationsKitchenItemRecord {
  return { ...DEFAULT_KITCHEN_ITEM, ...o }
}
export function comandaItem(o: Partial<ComandaItemRecord> = {}): ComandaItemRecord {
  return { ...DEFAULT_COMANDA_ITEM, ...o }
}

export function liveSnapshot(o: Partial<OperationsLiveResponse> = {}): OperationsLiveResponse {
  return {
    businessDate: '2026-03-30',
    companyOwnerId: 'owner-1',
    closure: {
      status: 'OPEN',
      expectedCashAmount: 0,
      countedCashAmount: null,
      differenceAmount: null,
      grossRevenueAmount: 0,
      realizedProfitAmount: 0,
      openSessionsCount: 0,
      openComandasCount: 0,
    },
    employees: [],
    unassigned: {
      employeeId: null,
      employeeCode: null,
      displayName: 'Operacao',
      active: true,
      cashSession: null,
      comandas: [],
    },
    mesas: [],
    ...o,
  }
}

export function kitchenSnapshot(o: Partial<OperationsKitchenResponse> = {}): OperationsKitchenResponse {
  return {
    businessDate: '2026-03-30',
    companyOwnerId: 'owner-1',
    items: [kitchenItem()],
    statusCounts: { queued: 1, inPreparation: 0, ready: 0 },
    ...o,
  }
}

export function summarySnapshot(o: Partial<OperationsSummaryResponse> = {}): OperationsSummaryResponse {
  return {
    businessDate: '2026-03-30',
    companyOwnerId: 'owner-1',
    kpis: {
      receitaRealizada: 100,
      faturamentoAberto: 50,
      projecaoTotal: 150,
      lucroRealizado: 30,
      lucroEsperado: 80,
      caixaEsperado: 120,
      openComandasCount: 2,
      openSessionsCount: 1,
    },
    performers: [],
    topProducts: [],
    ...o,
  }
}

// ---------------------------------------------------------------------------
// Query-client mock with internal state
// ---------------------------------------------------------------------------

export function createQueryClientMock(
  live: OperationsLiveResponse,
  kitchen?: OperationsKitchenResponse,
  summary?: OperationsSummaryResponse,
) {
  let curLive = live
  let curKitchen = kitchen
  let curSummary = summary
  return {
    getQueriesData: vi.fn(() => [[OPERATIONS_LIVE_COMPACT_QUERY_KEY, curLive]]),
    getLiveSnapshot: () => curLive,
    getKitchenSnapshot: () => curKitchen,
    getSummarySnapshot: () => curSummary,
    getQueryData: vi.fn((qk: readonly unknown[]) => {
      if (
        curKitchen &&
        qk.length === OPERATIONS_KITCHEN_QUERY_KEY.length &&
        qk.every((v, i) => v === OPERATIONS_KITCHEN_QUERY_KEY[i])
      ) {
        return curKitchen
      }
      if (
        curSummary &&
        qk.length === OPERATIONS_SUMMARY_QUERY_KEY.length &&
        qk.every((v, i) => v === OPERATIONS_SUMMARY_QUERY_KEY[i])
      ) {
        return curSummary
      }
      return null
    }),
    setQueryData: vi.fn((qk: readonly unknown[], updater: unknown) => {
      if (
        qk.length === OPERATIONS_LIVE_COMPACT_QUERY_KEY.length &&
        qk.every((v, i) => v === OPERATIONS_LIVE_COMPACT_QUERY_KEY[i])
      ) {
        curLive =
          typeof updater === 'function'
            ? (updater as (c: OperationsLiveResponse) => OperationsLiveResponse)(curLive)
            : (updater as OperationsLiveResponse)
      }
      if (
        curKitchen &&
        qk.length === OPERATIONS_KITCHEN_QUERY_KEY.length &&
        qk.every((v, i) => v === OPERATIONS_KITCHEN_QUERY_KEY[i])
      ) {
        curKitchen =
          typeof updater === 'function'
            ? (updater as (c: OperationsKitchenResponse) => OperationsKitchenResponse)(curKitchen)
            : (updater as OperationsKitchenResponse)
      }
      if (
        curSummary &&
        qk.length === OPERATIONS_SUMMARY_QUERY_KEY.length &&
        qk.every((v, i) => v === OPERATIONS_SUMMARY_QUERY_KEY[i])
      ) {
        curSummary =
          typeof updater === 'function'
            ? (updater as (c: OperationsSummaryResponse) => OperationsSummaryResponse)(curSummary)
            : (updater as OperationsSummaryResponse)
      }
    }),
  }
}

export type QC = ReturnType<typeof createQueryClientMock>
export const qc = (mock: QC) => mock as never
