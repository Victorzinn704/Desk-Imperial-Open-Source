import { describe, expect, it, vi } from 'vitest'
import type { OperationsLiveResponse, OperationsKitchenResponse, OperationsSummaryResponse } from '@contracts/contracts'
import { applyRealtimeEnvelope } from './use-operations-realtime'
import {
  OPERATIONS_KITCHEN_QUERY_KEY,
  OPERATIONS_LIVE_COMPACT_QUERY_KEY,
  OPERATIONS_SUMMARY_QUERY_KEY,
} from '@/lib/operations/operations-query'

function buildLiveSnapshot(): OperationsLiveResponse {
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
      displayName: 'Operação',
      active: true,
      cashSession: null,
      comandas: [],
    },
    mesas: [],
  }
}

function buildKitchenSnapshot(): OperationsKitchenResponse {
  return {
    businessDate: '2026-03-30',
    companyOwnerId: 'owner-1',
    items: [
      {
        itemId: 'item-1',
        comandaId: 'comanda-1',
        mesaLabel: 'Mesa 1',
        employeeId: null,
        employeeName: 'Operação',
        productName: 'Pizza',
        quantity: 1,
        notes: null,
        kitchenStatus: 'QUEUED',
        kitchenQueuedAt: '2026-03-30T10:00:00.000Z',
        kitchenReadyAt: null,
      },
    ],
    statusCounts: {
      queued: 1,
      inPreparation: 0,
      ready: 0,
    },
  }
}

function buildSummarySnapshot(): OperationsSummaryResponse {
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
  }
}

function createQueryClientMock(
  liveSnapshot: OperationsLiveResponse,
  kitchenSnapshot?: OperationsKitchenResponse,
  summarySnapshot?: OperationsSummaryResponse,
) {
  let currentLiveSnapshot = liveSnapshot
  let currentKitchenSnapshot = kitchenSnapshot
  let currentSummarySnapshot = summarySnapshot
  return {
    getQueriesData: vi.fn(() => [[OPERATIONS_LIVE_COMPACT_QUERY_KEY, currentLiveSnapshot]]),
    getLiveSnapshot: () => currentLiveSnapshot,
    getQueryData: vi.fn((queryKey: readonly unknown[]) => {
      if (currentKitchenSnapshot && queryKey.length === OPERATIONS_KITCHEN_QUERY_KEY.length) {
        const matchesKitchen = queryKey.every((value, index) => value === OPERATIONS_KITCHEN_QUERY_KEY[index])
        if (matchesKitchen) {
          return currentKitchenSnapshot
        }
      }

      if (currentSummarySnapshot && queryKey.length === OPERATIONS_SUMMARY_QUERY_KEY.length) {
        const matchesSummary = queryKey.every((value, index) => value === OPERATIONS_SUMMARY_QUERY_KEY[index])
        if (matchesSummary) {
          return currentSummarySnapshot
        }
      }

      return null
    }),
    setQueryData: vi.fn((queryKey: readonly unknown[], updater: unknown) => {
      if (queryKey.length === OPERATIONS_LIVE_COMPACT_QUERY_KEY.length) {
        const matchesLive = queryKey.every((value, index) => value === OPERATIONS_LIVE_COMPACT_QUERY_KEY[index])
        if (matchesLive) {
          currentLiveSnapshot =
            typeof updater === 'function'
              ? (updater as (current: OperationsLiveResponse) => OperationsLiveResponse)(currentLiveSnapshot)
              : (updater as OperationsLiveResponse)
        }
      }
      if (currentKitchenSnapshot && queryKey.length === OPERATIONS_KITCHEN_QUERY_KEY.length) {
        const matchesKitchen = queryKey.every((value, index) => value === OPERATIONS_KITCHEN_QUERY_KEY[index])
        if (matchesKitchen) {
          currentKitchenSnapshot =
            typeof updater === 'function'
              ? (updater as (current: OperationsKitchenResponse) => OperationsKitchenResponse)(currentKitchenSnapshot)
              : (updater as OperationsKitchenResponse)
        }
      }
      if (currentSummarySnapshot && queryKey.length === OPERATIONS_SUMMARY_QUERY_KEY.length) {
        const matchesSummary = queryKey.every((value, index) => value === OPERATIONS_SUMMARY_QUERY_KEY[index])
        if (matchesSummary) {
          currentSummarySnapshot =
            typeof updater === 'function'
              ? (updater as (current: OperationsSummaryResponse) => OperationsSummaryResponse)(currentSummarySnapshot)
              : (updater as OperationsSummaryResponse)
        }
      }
    }),
  }
}

describe('applyRealtimeEnvelope', () => {
  it('atualiza snapshot ao receber comanda delta-first sem payload completo', () => {
    const queryClient = createQueryClientMock(buildLiveSnapshot())

    const result = applyRealtimeEnvelope(queryClient as never, {
      event: 'comanda.opened',
      payload: {
        comandaId: 'comanda-1',
        mesaLabel: 'Mesa 1',
        status: 'ABERTA',
        employeeId: null,
        totalAmount: 48.5,
        subtotal: 48.5,
        openedAt: '2026-03-30T10:00:00.000Z',
        businessDate: '2026-03-30',
      },
    })

    expect(result.livePatched).toBe(true)
    expect(result.kitchenPatched).toBe(false)
    expect(queryClient.setQueryData).toHaveBeenCalled()
  })

  it('prioriza totais novos do payload quando a base local está defasada', () => {
    const liveSnapshot = buildLiveSnapshot()
    liveSnapshot.unassigned.comandas.push({
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
      subtotalAmount: 0,
      discountAmount: 0,
      serviceFeeAmount: 0,
      totalAmount: 0,
      notes: null,
      openedAt: '2026-03-30T10:00:00.000Z',
      closedAt: null,
      items: [],
    })
    const queryClient = createQueryClientMock(liveSnapshot)

    applyRealtimeEnvelope(queryClient as never, {
      event: 'comanda.updated',
      payload: {
        comandaId: 'comanda-1',
        mesaLabel: 'Mesa 1',
        status: 'ABERTA',
        subtotalAmount: 48.5,
        discountAmount: 3,
        serviceFeeAmount: 2,
        totalAmount: 47.5,
        businessDate: '2026-03-30',
      },
    })

    const patched = queryClient.getLiveSnapshot()
    expect(patched.unassigned.comandas[0]?.subtotalAmount).toBe(48.5)
    expect(patched.unassigned.comandas[0]?.discountAmount).toBe(3)
    expect(patched.unassigned.comandas[0]?.serviceFeeAmount).toBe(2)
    expect(patched.unassigned.comandas[0]?.totalAmount).toBe(47.5)
  })

  it('atualiza a fila da cozinha e remove item entregue sem depender de item completo', () => {
    const queryClient = createQueryClientMock(buildLiveSnapshot(), buildKitchenSnapshot())

    const result = applyRealtimeEnvelope(queryClient as never, {
      event: 'kitchen.item.updated',
      payload: {
        itemId: 'item-1',
        comandaId: 'comanda-1',
        mesaLabel: 'Mesa 1',
        productName: 'Pizza',
        quantity: 1,
        kitchenStatus: 'DELIVERED',
        businessDate: '2026-03-30',
      },
    })

    expect(result.kitchenPatched).toBe(true)
  })

  it('não injeta item zerado na comanda compacta ao receber patch da cozinha', () => {
    const liveSnapshot = buildLiveSnapshot()
    liveSnapshot.unassigned.comandas.push({
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
      subtotalAmount: 32,
      discountAmount: 0,
      serviceFeeAmount: 0,
      totalAmount: 32,
      notes: null,
      openedAt: '2026-03-30T10:00:00.000Z',
      closedAt: null,
      items: [],
    })
    const queryClient = createQueryClientMock(liveSnapshot, buildKitchenSnapshot())

    applyRealtimeEnvelope(queryClient as never, {
      event: 'kitchen.item.updated',
      payload: {
        itemId: 'item-99',
        comandaId: 'comanda-1',
        mesaLabel: 'Mesa 1',
        productName: 'Hambúrguer',
        quantity: 1,
        kitchenStatus: 'IN_PREPARATION',
        businessDate: '2026-03-30',
      },
    })

    const patched = queryClient.getLiveSnapshot()
    expect(patched.unassigned.comandas[0]?.items).toHaveLength(0)
    expect(patched.unassigned.comandas[0]?.totalAmount).toBe(32)
  })

  it('não força refresh de cozinha quando comanda delta-first não carrega itens de cozinha', () => {
    const queryClient = createQueryClientMock(buildLiveSnapshot(), buildKitchenSnapshot())

    const result = applyRealtimeEnvelope(queryClient as never, {
      event: 'comanda.updated',
      payload: {
        comandaId: 'comanda-1',
        mesaLabel: 'Mesa 1',
        status: 'EM_PREPARO',
        employeeId: null,
        totalAmount: 10,
        subtotal: 10,
        businessDate: '2026-03-30',
      },
    })

    expect(result.kitchenNeedsRefresh).toBe(false)
  })

  it('substitui a cozinha da comanda no replace sem refetch amplo', () => {
    const queryClient = createQueryClientMock(buildLiveSnapshot(), buildKitchenSnapshot())

    const result = applyRealtimeEnvelope(queryClient as never, {
      event: 'comanda.updated',
      payload: {
        comandaId: 'comanda-1',
        mesaLabel: 'Mesa 1',
        status: 'EM_PREPARO',
        employeeId: null,
        totalAmount: 32,
        subtotal: 32,
        businessDate: '2026-03-30',
        replaceKitchenItems: true,
        kitchenItems: [
          {
            itemId: 'item-2',
            comandaId: 'comanda-1',
            mesaLabel: 'Mesa 1',
            employeeId: null,
            productName: 'Lasanha',
            quantity: 1,
            notes: 'Sem queijo',
            kitchenStatus: 'READY',
            kitchenQueuedAt: '2026-03-30T10:05:00.000Z',
            kitchenReadyAt: '2026-03-30T10:10:00.000Z',
            businessDate: '2026-03-30',
          },
        ],
      },
    })

    expect(result.kitchenPatched).toBe(true)
    expect(result.kitchenNeedsRefresh).toBe(false)
  })

  it('patcheia summary no fechamento do caixa sem refetch desnecessário', () => {
    const queryClient = createQueryClientMock(buildLiveSnapshot(), buildKitchenSnapshot(), buildSummarySnapshot())

    const result = applyRealtimeEnvelope(queryClient as never, {
      event: 'cash.closure.updated',
      payload: {
        closureId: 'closure-1',
        status: 'CLOSED',
        expectedAmount: 130,
        grossRevenueAmount: 180,
        realizedProfitAmount: 55,
        countedAmount: 131,
        differenceAmount: 1,
        openComandasCount: 0,
        pendingCashSessions: 0,
        businessDate: '2026-03-30',
      },
    })

    expect(result.summaryPatched).toBe(true)
    expect(result.summaryNeedsRefresh).toBe(false)
  })

  it('remove itens da cozinha ao fechar a comanda sem depender de refresh', () => {
    const queryClient = createQueryClientMock(buildLiveSnapshot(), buildKitchenSnapshot())

    const result = applyRealtimeEnvelope(queryClient as never, {
      event: 'comanda.closed',
      payload: {
        comandaId: 'comanda-1',
        mesaLabel: 'Mesa 1',
        status: 'FECHADA',
        totalAmount: 10,
        businessDate: '2026-03-30',
      },
    })

    expect(result.kitchenPatched).toBe(true)
    expect(result.kitchenNeedsRefresh).toBe(false)
  })

  it('não aplica quando o businessDate diverge', () => {
    const queryClient = createQueryClientMock(buildLiveSnapshot(), buildKitchenSnapshot())

    const result = applyRealtimeEnvelope(queryClient as never, {
      event: 'comanda.updated',
      payload: {
        comandaId: 'comanda-1',
        mesaLabel: 'Mesa 1',
        status: 'ABERTA',
        totalAmount: 10,
        businessDate: '2026-03-29',
      },
    })

    expect(result.livePatched).toBe(false)
    expect(result.kitchenPatched).toBe(false)
  })

  it('pede refresh quando recebe close delta-first sem base suficiente para reconstruir a comanda', () => {
    const queryClient = createQueryClientMock(buildLiveSnapshot(), buildKitchenSnapshot())

    const result = applyRealtimeEnvelope(queryClient as never, {
      event: 'comanda.closed',
      payload: {
        comandaId: 'comanda-inexistente',
        mesaLabel: 'Mesa X',
        status: 'FECHADA',
        totalAmount: 10,
        businessDate: '2026-03-30',
      },
    })

    expect(result.livePatched).toBe(false)
    expect(result.liveNeedsRefresh).toBe(true)
  })
})
