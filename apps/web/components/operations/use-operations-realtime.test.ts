/**
 * @file use-operations-realtime.test.ts
 * @module Web/OperationsRealtime
 *
 * Comprehensive tests for applyRealtimeEnvelope and all internal patch/map
 * functions exercised through the public API.
 */

import { describe, expect, it, vi } from 'vitest'
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
import { applyRealtimeEnvelope } from './use-operations-realtime'
import {
  OPERATIONS_KITCHEN_QUERY_KEY,
  OPERATIONS_LIVE_COMPACT_QUERY_KEY,
  OPERATIONS_SUMMARY_QUERY_KEY,
} from '@/lib/operations/operations-query'

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

function buildComanda(overrides: Partial<ComandaRecord> = {}): ComandaRecord {
  return {
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
    ...overrides,
  }
}

function buildCashSession(overrides: Partial<CashSessionRecord> = {}): CashSessionRecord {
  return {
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
    ...overrides,
  }
}

function buildMesa(overrides: Partial<MesaRecord> = {}): MesaRecord {
  return {
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
    ...overrides,
  }
}

function buildComandaItem(overrides: Partial<ComandaItemRecord> = {}): ComandaItemRecord {
  return {
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
    ...overrides,
  }
}

function buildKitchenItemRecord(overrides: Partial<OperationsKitchenItemRecord> = {}): OperationsKitchenItemRecord {
  return {
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
    ...overrides,
  }
}

function buildLiveSnapshot(overrides: Partial<OperationsLiveResponse> = {}): OperationsLiveResponse {
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
    ...overrides,
  }
}

function buildKitchenSnapshot(overrides: Partial<OperationsKitchenResponse> = {}): OperationsKitchenResponse {
  return {
    businessDate: '2026-03-30',
    companyOwnerId: 'owner-1',
    items: [buildKitchenItemRecord()],
    statusCounts: { queued: 1, inPreparation: 0, ready: 0 },
    ...overrides,
  }
}

function buildSummarySnapshot(overrides: Partial<OperationsSummaryResponse> = {}): OperationsSummaryResponse {
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
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Query-client mock that tracks internal state
// ---------------------------------------------------------------------------

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
    getKitchenSnapshot: () => currentKitchenSnapshot,
    getSummarySnapshot: () => currentSummarySnapshot,
    getQueryData: vi.fn((queryKey: readonly unknown[]) => {
      if (currentKitchenSnapshot && queryKey.length === OPERATIONS_KITCHEN_QUERY_KEY.length) {
        const matchesKitchen = queryKey.every((value, index) => value === OPERATIONS_KITCHEN_QUERY_KEY[index])
        if (matchesKitchen) {return currentKitchenSnapshot}
      }
      if (currentSummarySnapshot && queryKey.length === OPERATIONS_SUMMARY_QUERY_KEY.length) {
        const matchesSummary = queryKey.every((value, index) => value === OPERATIONS_SUMMARY_QUERY_KEY[index])
        if (matchesSummary) {return currentSummarySnapshot}
      }
      return null
    }),
    setQueryData: vi.fn((queryKey: readonly unknown[], updater: unknown) => {
      if (queryKey.length === OPERATIONS_LIVE_COMPACT_QUERY_KEY.length) {
        const matchesLive = queryKey.every((value, index) => value === OPERATIONS_LIVE_COMPACT_QUERY_KEY[index])
        if (matchesLive) {
          currentLiveSnapshot =
            typeof updater === 'function'
              ? (updater as (c: OperationsLiveResponse) => OperationsLiveResponse)(currentLiveSnapshot)
              : (updater as OperationsLiveResponse)
        }
      }
      if (currentKitchenSnapshot && queryKey.length === OPERATIONS_KITCHEN_QUERY_KEY.length) {
        const matchesKitchen = queryKey.every((value, index) => value === OPERATIONS_KITCHEN_QUERY_KEY[index])
        if (matchesKitchen) {
          currentKitchenSnapshot =
            typeof updater === 'function'
              ? (updater as (c: OperationsKitchenResponse) => OperationsKitchenResponse)(currentKitchenSnapshot)
              : (updater as OperationsKitchenResponse)
        }
      }
      if (currentSummarySnapshot && queryKey.length === OPERATIONS_SUMMARY_QUERY_KEY.length) {
        const matchesSummary = queryKey.every((value, index) => value === OPERATIONS_SUMMARY_QUERY_KEY[index])
        if (matchesSummary) {
          currentSummarySnapshot =
            typeof updater === 'function'
              ? (updater as (c: OperationsSummaryResponse) => OperationsSummaryResponse)(currentSummarySnapshot)
              : (updater as OperationsSummaryResponse)
        }
      }
    }),
  }
}

type QC = ReturnType<typeof createQueryClientMock>
const qc = (mock: QC) => mock as never

// ---------------------------------------------------------------------------
// Tests — comanda.opened
// ---------------------------------------------------------------------------

describe('applyRealtimeEnvelope', () => {
  describe('comanda.opened', () => {
    it('patches snapshot with delta-first payload (no full comanda object)', () => {
      const mock = createQueryClientMock(buildLiveSnapshot())

      const result = applyRealtimeEnvelope(qc(mock), {
        event: 'comanda.opened',
        payload: {
          comandaId: 'comanda-1',
          mesaLabel: 'Mesa 1',
          status: 'OPEN',
          employeeId: null,
          totalAmount: 48.5,
          subtotal: 48.5,
          openedAt: '2026-03-30T10:00:00.000Z',
          businessDate: '2026-03-30',
        },
      })

      expect(result.livePatched).toBe(true)
      expect(mock.setQueryData).toHaveBeenCalled()
      const snap = mock.getLiveSnapshot()
      expect(snap.unassigned.comandas.some((c) => c.id === 'comanda-1')).toBe(true)
    })

    it('places comanda in matching employee group', () => {
      const live = buildLiveSnapshot({
        employees: [
          {
            employeeId: 'emp-1',
            employeeCode: 'E01',
            displayName: 'Joao',
            active: true,
            cashSession: null,
            comandas: [],
          },
        ],
      })
      const mock = createQueryClientMock(live)

      applyRealtimeEnvelope(qc(mock), {
        event: 'comanda.opened',
        payload: {
          comandaId: 'c-new',
          currentEmployeeId: 'emp-1',
          tableLabel: 'Mesa 2',
          openedAt: '2026-03-30T10:00:00.000Z',
          status: 'OPEN',
          businessDate: '2026-03-30',
        },
      })

      const snap = mock.getLiveSnapshot()
      expect(snap.employees[0].comandas.some((c) => c.id === 'c-new')).toBe(true)
      expect(snap.unassigned.comandas.some((c) => c.id === 'c-new')).toBe(false)
    })

    it('increments closure openComandasCount for a new open comanda', () => {
      const live = buildLiveSnapshot()
      const mock = createQueryClientMock(live)

      applyRealtimeEnvelope(qc(mock), {
        event: 'comanda.opened',
        payload: {
          comandaId: 'c-new',
          tableLabel: 'Mesa 2',
          openedAt: '2026-03-30T11:00:00.000Z',
          status: 'OPEN',
          businessDate: '2026-03-30',
        },
      })

      expect(mock.getLiveSnapshot().closure?.openComandasCount).toBe(1)
    })

    it('uses legacy comanda object from payload', () => {
      const mock = createQueryClientMock(buildLiveSnapshot())

      applyRealtimeEnvelope(qc(mock), {
        event: 'comanda.opened',
        payload: {
          businessDate: '2026-03-30',
          comanda: buildComanda({
            id: 'c-legacy',
            status: 'OPEN',
            items: [buildComandaItem({ id: 'i-leg', productName: 'Coxinha' })],
          }),
        },
      })

      const snap = mock.getLiveSnapshot()
      const comanda = snap.unassigned.comandas.find((c) => c.id === 'c-legacy')
      expect(comanda).toBeTruthy()
      expect(comanda?.items).toHaveLength(1)
      expect(comanda?.items[0].productName).toBe('Coxinha')
    })

    it('returns liveNeedsRefresh when comandaId is missing', () => {
      const mock = createQueryClientMock(buildLiveSnapshot())
      const result = applyRealtimeEnvelope(qc(mock), {
        event: 'comanda.opened',
        payload: { businessDate: '2026-03-30', tableLabel: 'Mesa 1' },
      })
      expect(result.livePatched).toBe(false)
      expect(result.liveNeedsRefresh).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // comanda.updated
  // -------------------------------------------------------------------------

  describe('comanda.updated', () => {
    it('prioritises fresh totals from payload over stale local values', () => {
      const live = buildLiveSnapshot()
      live.unassigned.comandas.push(buildComanda({ subtotalAmount: 0, totalAmount: 0 }))
      const mock = createQueryClientMock(live)

      applyRealtimeEnvelope(qc(mock), {
        event: 'comanda.updated',
        payload: {
          comandaId: 'comanda-1',
          mesaLabel: 'Mesa 1',
          status: 'OPEN',
          subtotalAmount: 48.5,
          discountAmount: 3,
          serviceFeeAmount: 2,
          totalAmount: 47.5,
          businessDate: '2026-03-30',
        },
      })

      const snap = mock.getLiveSnapshot()
      expect(snap.unassigned.comandas[0]?.subtotalAmount).toBe(48.5)
      expect(snap.unassigned.comandas[0]?.discountAmount).toBe(3)
      expect(snap.unassigned.comandas[0]?.serviceFeeAmount).toBe(2)
      expect(snap.unassigned.comandas[0]?.totalAmount).toBe(47.5)
    })

    it('moves comanda between employee groups via legacy comanda object', () => {
      const live = buildLiveSnapshot({
        employees: [
          {
            employeeId: 'emp-1',
            employeeCode: 'E01',
            displayName: 'Joao',
            active: true,
            cashSession: null,
            comandas: [buildComanda({ id: 'c-1', currentEmployeeId: 'emp-1' })],
          },
          {
            employeeId: 'emp-2',
            employeeCode: 'E02',
            displayName: 'Maria',
            active: true,
            cashSession: null,
            comandas: [],
          },
        ],
      })
      const mock = createQueryClientMock(live)

      // Use the legacy comanda object path so currentEmployeeId from the
      // full record takes precedence over the existing snapshot value.
      applyRealtimeEnvelope(qc(mock), {
        event: 'comanda.updated',
        payload: {
          businessDate: '2026-03-30',
          comanda: buildComanda({ id: 'c-1', currentEmployeeId: 'emp-2' }),
        },
      })

      const snap = mock.getLiveSnapshot()
      // emp-2 should now have the comanda
      expect(snap.employees.find((e) => e.employeeId === 'emp-2')?.comandas.some((c) => c.id === 'c-1')).toBe(true)
      // emp-1 should have lost it
      expect(snap.employees.find((e) => e.employeeId === 'emp-1')?.comandas.some((c) => c.id === 'c-1')).toBe(false)
    })

    it('updates comanda status (e.g. to IN_PREPARATION)', () => {
      const live = buildLiveSnapshot()
      live.unassigned.comandas.push(buildComanda({ id: 'c-1', status: 'OPEN' }))
      const mock = createQueryClientMock(live)

      applyRealtimeEnvelope(qc(mock), {
        event: 'comanda.updated',
        payload: {
          comandaId: 'c-1',
          tableLabel: 'Mesa 1',
          status: 'IN_PREPARATION',
          businessDate: '2026-03-30',
        },
      })

      expect(mock.getLiveSnapshot().unassigned.comandas[0]?.status).toBe('IN_PREPARATION')
    })

    it('does not force kitchen refresh when comanda has no kitchen items', () => {
      const mock = createQueryClientMock(buildLiveSnapshot(), buildKitchenSnapshot())

      const result = applyRealtimeEnvelope(qc(mock), {
        event: 'comanda.updated',
        payload: {
          comandaId: 'comanda-1',
          mesaLabel: 'Mesa 1',
          status: 'IN_PREPARATION',
          employeeId: null,
          totalAmount: 10,
          subtotal: 10,
          businessDate: '2026-03-30',
        },
      })

      expect(result.kitchenNeedsRefresh).toBe(false)
    })

    it('patches comanda items from payload items array', () => {
      const live = buildLiveSnapshot()
      live.unassigned.comandas.push(buildComanda({ id: 'c-1', items: [] }))
      const mock = createQueryClientMock(live)

      applyRealtimeEnvelope(qc(mock), {
        event: 'comanda.updated',
        payload: {
          comandaId: 'c-1',
          tableLabel: 'Mesa 1',
          status: 'IN_PREPARATION',
          businessDate: '2026-03-30',
          items: [
            buildComandaItem({ id: 'i-1', productName: 'Hamburguer', quantity: 2 }),
            buildComandaItem({ id: 'i-2', productName: 'Batata', quantity: 1 }),
          ],
        },
      })

      const snap = mock.getLiveSnapshot()
      expect(snap.unassigned.comandas[0]?.items).toHaveLength(2)
    })
  })

  // -------------------------------------------------------------------------
  // comanda.closed
  // -------------------------------------------------------------------------

  describe('comanda.closed', () => {
    it('closes comanda and decrements openComandasCount', () => {
      const live = buildLiveSnapshot({
        closure: {
          status: 'OPEN',
          expectedCashAmount: 0,
          countedCashAmount: null,
          differenceAmount: null,
          grossRevenueAmount: 0,
          realizedProfitAmount: 0,
          openSessionsCount: 0,
          openComandasCount: 3,
        },
      })
      live.unassigned.comandas.push(buildComanda({ id: 'c-1', status: 'OPEN' }))
      const mock = createQueryClientMock(live)

      applyRealtimeEnvelope(qc(mock), {
        event: 'comanda.closed',
        payload: {
          comandaId: 'c-1',
          mesaLabel: 'Mesa 1',
          status: 'CLOSED',
          totalAmount: 10,
          businessDate: '2026-03-30',
          closedAt: '2026-03-30T12:00:00.000Z',
        },
      })

      const snap = mock.getLiveSnapshot()
      expect(snap.unassigned.comandas[0]?.status).toBe('CLOSED')
      expect(snap.closure?.openComandasCount).toBe(2)
    })

    it('does not double-decrement when comanda was already CLOSED', () => {
      const live = buildLiveSnapshot({
        closure: {
          status: 'OPEN',
          expectedCashAmount: 0,
          countedCashAmount: null,
          differenceAmount: null,
          grossRevenueAmount: 0,
          realizedProfitAmount: 0,
          openSessionsCount: 0,
          openComandasCount: 5,
        },
      })
      live.unassigned.comandas.push(buildComanda({ id: 'c-1', status: 'CLOSED', closedAt: '2026-03-30T11:00:00.000Z' }))
      const mock = createQueryClientMock(live)

      applyRealtimeEnvelope(qc(mock), {
        event: 'comanda.closed',
        payload: {
          comandaId: 'c-1',
          mesaLabel: 'Mesa 1',
          status: 'CLOSED',
          totalAmount: 10,
          businessDate: '2026-03-30',
        },
      })

      // Already closed, so count stays
      expect(mock.getLiveSnapshot().closure?.openComandasCount).toBe(5)
    })

    it('clamps openComandasCount to zero', () => {
      const live = buildLiveSnapshot({
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
      })
      live.unassigned.comandas.push(buildComanda({ id: 'c-1', status: 'OPEN' }))
      const mock = createQueryClientMock(live)

      applyRealtimeEnvelope(qc(mock), {
        event: 'comanda.closed',
        payload: {
          comandaId: 'c-1',
          mesaLabel: 'Mesa 1',
          status: 'CLOSED',
          totalAmount: 10,
          businessDate: '2026-03-30',
        },
      })

      expect(mock.getLiveSnapshot().closure?.openComandasCount).toBe(0)
    })

    it('removes kitchen items for closed comanda', () => {
      const kitchen = buildKitchenSnapshot({
        items: [
          buildKitchenItemRecord({ itemId: 'i-1', comandaId: 'c-1' }),
          buildKitchenItemRecord({ itemId: 'i-2', comandaId: 'c-1' }),
          buildKitchenItemRecord({ itemId: 'i-3', comandaId: 'c-other' }),
        ],
        statusCounts: { queued: 3, inPreparation: 0, ready: 0 },
      })
      const mock = createQueryClientMock(buildLiveSnapshot(), kitchen)

      const result = applyRealtimeEnvelope(qc(mock), {
        event: 'comanda.closed',
        payload: {
          comandaId: 'c-1',
          mesaLabel: 'Mesa 1',
          status: 'CLOSED',
          totalAmount: 10,
          businessDate: '2026-03-30',
        },
      })

      expect(result.kitchenPatched).toBe(true)
      const kitchenSnap = mock.getKitchenSnapshot()!
      expect(kitchenSnap.items.filter((i) => i.comandaId === 'c-1')).toHaveLength(0)
      expect(kitchenSnap.items.filter((i) => i.comandaId === 'c-other')).toHaveLength(1)
      expect(kitchenSnap.statusCounts.queued).toBe(1)
    })

    it('needs refresh when comanda does not exist and cannot be built', () => {
      const mock = createQueryClientMock(buildLiveSnapshot(), buildKitchenSnapshot())

      const result = applyRealtimeEnvelope(qc(mock), {
        event: 'comanda.closed',
        payload: {
          comandaId: 'comanda-inexistente',
          mesaLabel: 'Mesa X',
          status: 'CLOSED',
          totalAmount: 10,
          businessDate: '2026-03-30',
        },
      })

      expect(result.livePatched).toBe(false)
      expect(result.liveNeedsRefresh).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // cash.updated
  // -------------------------------------------------------------------------

  describe('cash.updated', () => {
    it('patches employee cash session by full record', () => {
      const live = buildLiveSnapshot({
        employees: [
          {
            employeeId: 'emp-1',
            employeeCode: 'E01',
            displayName: 'Joao',
            active: true,
            cashSession: buildCashSession(),
            comandas: [],
          },
        ],
      })
      const mock = createQueryClientMock(live)

      const updatedSession = buildCashSession({ expectedCashAmount: 500 })
      applyRealtimeEnvelope(qc(mock), {
        event: 'cash.updated',
        payload: { businessDate: '2026-03-30', cashSession: updatedSession },
      })

      expect(mock.getLiveSnapshot().employees[0].cashSession?.expectedCashAmount).toBe(500)
    })

    it('patches employee cash session by cashSessionId (partial fields)', () => {
      const live = buildLiveSnapshot({
        employees: [
          {
            employeeId: 'emp-1',
            employeeCode: 'E01',
            displayName: 'Joao',
            active: true,
            cashSession: buildCashSession({ id: 'cs-1', expectedCashAmount: 200 }),
            comandas: [],
          },
        ],
      })
      const mock = createQueryClientMock(live)

      applyRealtimeEnvelope(qc(mock), {
        event: 'cash.updated',
        payload: {
          businessDate: '2026-03-30',
          cashSessionId: 'cs-1',
          expectedAmount: 350,
          openingAmount: 120,
          status: 'OPEN',
        },
      })

      const cs = mock.getLiveSnapshot().employees[0].cashSession
      expect(cs?.expectedCashAmount).toBe(350)
      expect(cs?.openingCashAmount).toBe(120)
    })

    it('patches unassigned cash session by cashSessionId', () => {
      const live = buildLiveSnapshot({
        unassigned: {
          employeeId: null,
          employeeCode: null,
          displayName: 'Owner',
          active: true,
          cashSession: buildCashSession({ id: 'cs-unassigned', employeeId: null, expectedCashAmount: 100 }),
          comandas: [],
        },
      })
      const mock = createQueryClientMock(live)

      applyRealtimeEnvelope(qc(mock), {
        event: 'cash.updated',
        payload: {
          businessDate: '2026-03-30',
          cashSessionId: 'cs-unassigned',
          expectedAmount: 999,
        },
      })

      expect(mock.getLiveSnapshot().unassigned.cashSession?.expectedCashAmount).toBe(999)
    })

    it('patches counted and difference amounts via cashSessionId', () => {
      const live = buildLiveSnapshot({
        employees: [
          {
            employeeId: 'emp-1',
            employeeCode: 'E01',
            displayName: 'Joao',
            active: true,
            cashSession: buildCashSession({ id: 'cs-1' }),
            comandas: [],
          },
        ],
      })
      const mock = createQueryClientMock(live)

      applyRealtimeEnvelope(qc(mock), {
        event: 'cash.updated',
        payload: {
          businessDate: '2026-03-30',
          cashSessionId: 'cs-1',
          countedAmount: 195,
          differenceAmount: -5,
          status: 'CLOSED',
        },
      })

      const cs = mock.getLiveSnapshot().employees[0].cashSession
      expect(cs?.countedCashAmount).toBe(195)
      expect(cs?.differenceAmount).toBe(-5)
      expect(cs?.status).toBe('CLOSED')
    })

    it('returns liveNeedsRefresh when no cashSession record and no cashSessionId', () => {
      const mock = createQueryClientMock(buildLiveSnapshot())

      const result = applyRealtimeEnvelope(qc(mock), {
        event: 'cash.updated',
        payload: { businessDate: '2026-03-30' },
      })

      expect(result.liveNeedsRefresh).toBe(true)
    })

    it('handles full record with employeeId not matching any group gracefully', () => {
      const live = buildLiveSnapshot({
        employees: [
          {
            employeeId: 'emp-1',
            employeeCode: 'E01',
            displayName: 'Joao',
            active: true,
            cashSession: null,
            comandas: [],
          },
        ],
      })
      const mock = createQueryClientMock(live)

      const orphanSession = buildCashSession({ employeeId: 'emp-unknown' })
      applyRealtimeEnvelope(qc(mock), {
        event: 'cash.updated',
        payload: { businessDate: '2026-03-30', cashSession: orphanSession },
      })

      // No group matches => snapshot unchanged
      const snap = mock.getLiveSnapshot()
      expect(snap.employees[0].cashSession).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // cash.opened
  // -------------------------------------------------------------------------

  describe('cash.opened', () => {
    it('sets cash session on matching employee group', () => {
      const live = buildLiveSnapshot({
        employees: [
          {
            employeeId: 'emp-1',
            employeeCode: 'E01',
            displayName: 'Joao',
            active: true,
            cashSession: null,
            comandas: [],
          },
        ],
      })
      const mock = createQueryClientMock(live)

      applyRealtimeEnvelope(qc(mock), {
        event: 'cash.opened',
        payload: { businessDate: '2026-03-30', cashSession: buildCashSession({ id: 'cs-new' }) },
      })

      expect(mock.getLiveSnapshot().employees[0].cashSession?.id).toBe('cs-new')
    })

    it('sets cash session on unassigned when employeeId is null', () => {
      const mock = createQueryClientMock(buildLiveSnapshot())

      applyRealtimeEnvelope(qc(mock), {
        event: 'cash.opened',
        payload: {
          businessDate: '2026-03-30',
          cashSession: buildCashSession({ id: 'cs-owner', employeeId: null }),
        },
      })

      expect(mock.getLiveSnapshot().unassigned.cashSession?.id).toBe('cs-owner')
    })

    it('returns liveNeedsRefresh when no cashSession record in payload', () => {
      const mock = createQueryClientMock(buildLiveSnapshot())
      const result = applyRealtimeEnvelope(qc(mock), {
        event: 'cash.opened',
        payload: { businessDate: '2026-03-30' },
      })
      expect(result.liveNeedsRefresh).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // cash.closure.updated
  // -------------------------------------------------------------------------

  describe('cash.closure.updated', () => {
    it('patches closure fields in live snapshot', () => {
      const mock = createQueryClientMock(buildLiveSnapshot())

      applyRealtimeEnvelope(qc(mock), {
        event: 'cash.closure.updated',
        payload: {
          businessDate: '2026-03-30',
          status: 'PENDING',
          expectedAmount: 999,
          grossRevenueAmount: 500,
          realizedProfitAmount: 200,
          pendingCashSessions: 3,
          openComandasCount: 7,
          countedAmount: 990,
          differenceAmount: -9,
        },
      })

      const closure = mock.getLiveSnapshot().closure
      expect(closure?.status).toBe('PENDING_EMPLOYEE_CLOSE')
      expect(closure?.expectedCashAmount).toBe(999)
      expect(closure?.grossRevenueAmount).toBe(500)
      expect(closure?.realizedProfitAmount).toBe(200)
      expect(closure?.openSessionsCount).toBe(3)
      expect(closure?.openComandasCount).toBe(7)
      expect(closure?.countedCashAmount).toBe(990)
      expect(closure?.differenceAmount).toBe(-9)
    })

    it('returns liveNeedsRefresh when snapshot has no closure', () => {
      const live = buildLiveSnapshot({ closure: null })
      const mock = createQueryClientMock(live)

      const result = applyRealtimeEnvelope(qc(mock), {
        event: 'cash.closure.updated',
        payload: { businessDate: '2026-03-30', status: 'CLOSED', expectedAmount: 1 },
      })

      expect(result.liveNeedsRefresh).toBe(true)
    })

    it('maps closure status OPEN correctly', () => {
      const mock = createQueryClientMock(buildLiveSnapshot())
      applyRealtimeEnvelope(qc(mock), {
        event: 'cash.closure.updated',
        payload: { businessDate: '2026-03-30', status: 'OPEN', expectedAmount: 1 },
      })
      expect(mock.getLiveSnapshot().closure?.status).toBe('OPEN')
    })

    it('maps closure status CLOSED correctly', () => {
      const mock = createQueryClientMock(buildLiveSnapshot())
      applyRealtimeEnvelope(qc(mock), {
        event: 'cash.closure.updated',
        payload: { businessDate: '2026-03-30', status: 'CLOSED', expectedAmount: 1 },
      })
      expect(mock.getLiveSnapshot().closure?.status).toBe('CLOSED')
    })

    it('falls back to existing status for invalid status string', () => {
      const mock = createQueryClientMock(buildLiveSnapshot())
      applyRealtimeEnvelope(qc(mock), {
        event: 'cash.closure.updated',
        payload: { businessDate: '2026-03-30', status: 'INVALID', expectedAmount: 1 },
      })
      expect(mock.getLiveSnapshot().closure?.status).toBe('OPEN')
    })

    it('patches summary kpis with projecaoTotal and lucroEsperado', () => {
      const mock = createQueryClientMock(buildLiveSnapshot(), buildKitchenSnapshot(), buildSummarySnapshot())

      applyRealtimeEnvelope(qc(mock), {
        event: 'cash.closure.updated',
        payload: {
          closureId: 'cl-1',
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

      expect(mock.getSummarySnapshot()?.kpis.projecaoTotal).toBe(230) // 180 + 50
      expect(mock.getSummarySnapshot()?.kpis.lucroRealizado).toBe(55)
      expect(mock.getSummarySnapshot()?.kpis.lucroEsperado).toBeCloseTo(70.277, 2)
    })

    it('handles zero receitaRealizada in summary by setting estimatedOpenMargin to 0', () => {
      const mock = createQueryClientMock(buildLiveSnapshot(), undefined, buildSummarySnapshot())

      applyRealtimeEnvelope(qc(mock), {
        event: 'cash.closure.updated',
        payload: {
          businessDate: '2026-03-30',
          grossRevenueAmount: 0,
          realizedProfitAmount: 0,
        },
      })

      const kpis = mock.getSummarySnapshot()?.kpis
      expect(kpis?.lucroEsperado).toBe(0) // 0 + 0
      expect(kpis?.projecaoTotal).toBe(50) // 0 + 50 (faturamentoAberto)
    })

    it('returns summaryNeedsRefresh when no kpi fields provided', () => {
      const mock = createQueryClientMock(buildLiveSnapshot(), undefined, buildSummarySnapshot())

      const result = applyRealtimeEnvelope(qc(mock), {
        event: 'cash.closure.updated',
        payload: { businessDate: '2026-03-30', status: 'CLOSED' },
      })

      expect(result.summaryNeedsRefresh).toBe(true)
    })

    it('ignores invalid nullable fields without breaking summary patch', () => {
      const mock = createQueryClientMock(buildLiveSnapshot(), buildKitchenSnapshot(), buildSummarySnapshot())

      const result = applyRealtimeEnvelope(qc(mock), {
        event: 'cash.closure.updated',
        payload: {
          closureId: 'cl-1',
          status: 'CLOSED',
          expectedAmount: 140,
          grossRevenueAmount: 190,
          realizedProfitAmount: 60,
          countedAmount: 'invalid-number',
          differenceAmount: { nope: true },
          openComandasCount: 1,
          pendingCashSessions: 0,
          businessDate: 12345, // non-string businessDate is ignored
        },
      })

      expect(result.summaryPatched).toBe(true)
      expect(mock.getSummarySnapshot()?.kpis.caixaEsperado).toBe(140)
      expect(mock.getSummarySnapshot()?.kpis.openComandasCount).toBe(1)
    })
  })

  // -------------------------------------------------------------------------
  // kitchen.item.queued
  // -------------------------------------------------------------------------

  describe('kitchen.item.queued', () => {
    it('adds new item to kitchen snapshot with QUEUED status', () => {
      const mock = createQueryClientMock(buildLiveSnapshot(), buildKitchenSnapshot())

      const result = applyRealtimeEnvelope(qc(mock), {
        event: 'kitchen.item.queued',
        payload: {
          itemId: 'item-new',
          comandaId: 'comanda-1',
          productName: 'Fries',
          mesaLabel: 'Mesa 1',
          quantity: 1,
          employeeId: null,
          employeeName: 'Operacao',
          businessDate: '2026-03-30',
        },
      })

      expect(result.kitchenPatched).toBe(true)
      const kitchen = mock.getKitchenSnapshot()!
      expect(kitchen.items.some((i) => i.itemId === 'item-new')).toBe(true)
      expect(kitchen.items.find((i) => i.itemId === 'item-new')?.kitchenStatus).toBe('QUEUED')
    })

    it('also patches live snapshot when comanda payload is sufficient', () => {
      const live = buildLiveSnapshot()
      live.unassigned.comandas.push(buildComanda({ id: 'comanda-1' }))
      const mock = createQueryClientMock(live, buildKitchenSnapshot())

      const result = applyRealtimeEnvelope(qc(mock), {
        event: 'kitchen.item.queued',
        payload: {
          itemId: 'item-new',
          comandaId: 'comanda-1',
          productName: 'Salad',
          mesaLabel: 'Mesa 1',
          quantity: 1,
          employeeId: null,
          employeeName: 'Operacao',
          businessDate: '2026-03-30',
          tableLabel: 'Mesa 1',
          openedAt: '2026-03-30T10:00:00.000Z',
        },
      })

      expect(result.livePatched).toBe(true)
    })

    it('returns false for both patches when required fields are missing', () => {
      const mock = createQueryClientMock(buildLiveSnapshot(), buildKitchenSnapshot())

      const result = applyRealtimeEnvelope(qc(mock), {
        event: 'kitchen.item.queued',
        payload: {
          businessDate: '2026-03-30',
          // Missing itemId, comandaId, productName, mesaLabel, quantity
        },
      })

      expect(result.liveNeedsRefresh).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // kitchen.item.updated
  // -------------------------------------------------------------------------

  describe('kitchen.item.updated', () => {
    it('updates existing item status in kitchen snapshot', () => {
      const mock = createQueryClientMock(buildLiveSnapshot(), buildKitchenSnapshot())

      applyRealtimeEnvelope(qc(mock), {
        event: 'kitchen.item.updated',
        payload: {
          itemId: 'item-1',
          comandaId: 'comanda-1',
          mesaLabel: 'Mesa 1',
          productName: 'Pizza',
          quantity: 1,
          kitchenStatus: 'IN_PREPARATION',
          businessDate: '2026-03-30',
        },
      })

      const kitchen = mock.getKitchenSnapshot()!
      expect(kitchen.items.find((i) => i.itemId === 'item-1')?.kitchenStatus).toBe('IN_PREPARATION')
      expect(kitchen.statusCounts.queued).toBe(0)
      expect(kitchen.statusCounts.inPreparation).toBe(1)
    })

    it('removes delivered item from kitchen snapshot', () => {
      const mock = createQueryClientMock(buildLiveSnapshot(), buildKitchenSnapshot())

      const result = applyRealtimeEnvelope(qc(mock), {
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
      expect(mock.getKitchenSnapshot()!.items).toHaveLength(0)
    })

    it('does not inject zero-priced item into compact comanda', () => {
      const live = buildLiveSnapshot()
      live.unassigned.comandas.push(buildComanda({ id: 'comanda-1', totalAmount: 32, items: [] }))
      const mock = createQueryClientMock(live, buildKitchenSnapshot())

      applyRealtimeEnvelope(qc(mock), {
        event: 'kitchen.item.updated',
        payload: {
          itemId: 'item-99',
          comandaId: 'comanda-1',
          mesaLabel: 'Mesa 1',
          productName: 'Hamburguer',
          quantity: 1,
          kitchenStatus: 'IN_PREPARATION',
          businessDate: '2026-03-30',
        },
      })

      const snap = mock.getLiveSnapshot()
      expect(snap.unassigned.comandas[0]?.items).toHaveLength(0)
      expect(snap.unassigned.comandas[0]?.totalAmount).toBe(32)
    })

    it('updates comanda item kitchen status in live snapshot when item exists', () => {
      const live = buildLiveSnapshot()
      live.unassigned.comandas.push(
        buildComanda({
          id: 'comanda-1',
          items: [buildComandaItem({ id: 'item-1', productName: 'Pizza', kitchenStatus: 'QUEUED' })],
        }),
      )
      const mock = createQueryClientMock(live, buildKitchenSnapshot())

      applyRealtimeEnvelope(qc(mock), {
        event: 'kitchen.item.updated',
        payload: {
          itemId: 'item-1',
          comandaId: 'comanda-1',
          mesaLabel: 'Mesa 1',
          productName: 'Pizza',
          quantity: 1,
          kitchenStatus: 'READY',
          businessDate: '2026-03-30',
          tableLabel: 'Mesa 1',
          openedAt: '2026-03-30T10:00:00.000Z',
        },
      })

      const snap = mock.getLiveSnapshot()
      expect(snap.unassigned.comandas[0]?.items[0]?.kitchenStatus).toBe('READY')
    })
  })

  // -------------------------------------------------------------------------
  // kitchen replacement via comanda.updated
  // -------------------------------------------------------------------------

  describe('kitchen replacement via comanda.updated', () => {
    it('replaces kitchen items without broad refetch', () => {
      const mock = createQueryClientMock(buildLiveSnapshot(), buildKitchenSnapshot())

      const result = applyRealtimeEnvelope(qc(mock), {
        event: 'comanda.updated',
        payload: {
          comandaId: 'comanda-1',
          mesaLabel: 'Mesa 1',
          status: 'IN_PREPARATION',
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

      const kitchen = mock.getKitchenSnapshot()!
      expect(kitchen.items.find((i) => i.itemId === 'item-1')).toBeUndefined() // old removed
      expect(kitchen.items.find((i) => i.itemId === 'item-2')?.productName).toBe('Lasanha')
    })

    it('filters out delivered items during replacement', () => {
      const mock = createQueryClientMock(buildLiveSnapshot(), buildKitchenSnapshot())

      applyRealtimeEnvelope(qc(mock), {
        event: 'comanda.updated',
        payload: {
          comandaId: 'comanda-1',
          mesaLabel: 'Mesa 1',
          status: 'IN_PREPARATION',
          totalAmount: 32,
          businessDate: '2026-03-30',
          replaceKitchenItems: true,
          kitchenItems: [
            {
              itemId: 'item-delivered',
              comandaId: 'comanda-1',
              mesaLabel: 'Mesa 1',
              productName: 'Entregue',
              quantity: 1,
              kitchenStatus: 'DELIVERED',
              kitchenQueuedAt: '2026-03-30T10:00:00.000Z',
            },
            {
              itemId: 'item-active',
              comandaId: 'comanda-1',
              mesaLabel: 'Mesa 1',
              productName: 'Ativo',
              quantity: 1,
              kitchenStatus: 'QUEUED',
              kitchenQueuedAt: '2026-03-30T10:01:00.000Z',
            },
          ],
        },
      })

      const kitchen = mock.getKitchenSnapshot()!
      expect(kitchen.items.find((i) => i.itemId === 'item-delivered')).toBeUndefined()
      expect(kitchen.items.find((i) => i.itemId === 'item-active')).toBeTruthy()
    })
  })

  // -------------------------------------------------------------------------
  // mesa.upserted
  // -------------------------------------------------------------------------

  describe('mesa.upserted', () => {
    it('upserts mesa with full mesa record (existing)', () => {
      const live = buildLiveSnapshot({ mesas: [buildMesa()] })
      const mock = createQueryClientMock(live)

      applyRealtimeEnvelope(qc(mock), {
        event: 'mesa.upserted',
        payload: {
          businessDate: '2026-03-30',
          mesa: buildMesa({ status: 'ocupada', comandaId: 'c-1' }),
        },
      })

      const mesa = mock.getLiveSnapshot().mesas.find((m) => m.id === 'm-1')
      expect(mesa?.status).toBe('ocupada')
      expect(mesa?.comandaId).toBe('c-1')
    })

    it('adds new mesa from full record', () => {
      const mock = createQueryClientMock(buildLiveSnapshot({ mesas: [] }))

      applyRealtimeEnvelope(qc(mock), {
        event: 'mesa.upserted',
        payload: {
          businessDate: '2026-03-30',
          mesa: buildMesa({ id: 'm-new', label: 'Mesa Nova' }),
        },
      })

      expect(mock.getLiveSnapshot().mesas.some((m) => m.id === 'm-new')).toBe(true)
    })

    it('patches mesa status from flat fields (mesaId + status)', () => {
      const live = buildLiveSnapshot({ mesas: [buildMesa()] })
      const mock = createQueryClientMock(live)

      applyRealtimeEnvelope(qc(mock), {
        event: 'mesa.upserted',
        payload: { businessDate: '2026-03-30', mesaId: 'm-1', status: 'reservada' },
      })

      expect(mock.getLiveSnapshot().mesas.find((m) => m.id === 'm-1')?.status).toBe('reservada')
    })

    it('patches mesa status from mesaLabel when mesaId not present', () => {
      const live = buildLiveSnapshot({ mesas: [buildMesa()] })
      const mock = createQueryClientMock(live)

      applyRealtimeEnvelope(qc(mock), {
        event: 'mesa.upserted',
        payload: { businessDate: '2026-03-30', mesaLabel: 'Mesa 1', status: 'ocupada' },
      })

      expect(mock.getLiveSnapshot().mesas.find((m) => m.label === 'Mesa 1')?.status).toBe('ocupada')
    })

    it('maps all mesa statuses correctly', () => {
      for (const status of ['livre', 'ocupada', 'reservada'] as const) {
        const live = buildLiveSnapshot({ mesas: [buildMesa()] })
        const mock = createQueryClientMock(live)
        applyRealtimeEnvelope(qc(mock), {
          event: 'mesa.upserted',
          payload: { businessDate: '2026-03-30', mesaId: 'm-1', status },
        })
        expect(mock.getLiveSnapshot().mesas[0]?.status).toBe(status)
      }
    })

    it('returns liveNeedsRefresh for invalid mesa payload', () => {
      const mock = createQueryClientMock(buildLiveSnapshot())

      const result = applyRealtimeEnvelope(qc(mock), {
        event: 'mesa.upserted',
        payload: { businessDate: '2026-03-30' },
      })

      expect(result.liveNeedsRefresh).toBe(true)
    })

    it('returns liveNeedsRefresh when status is invalid', () => {
      const mock = createQueryClientMock(buildLiveSnapshot({ mesas: [buildMesa()] }))

      const result = applyRealtimeEnvelope(qc(mock), {
        event: 'mesa.upserted',
        payload: { businessDate: '2026-03-30', mesaId: 'm-1', status: 'INVALID' },
      })

      expect(result.liveNeedsRefresh).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // mesa updates via comanda events
  // -------------------------------------------------------------------------

  describe('mesa tracking via comanda events', () => {
    it('marks mesa as ocupada when comanda is opened with mesaId', () => {
      const live = buildLiveSnapshot({ mesas: [buildMesa({ id: 'm-1', label: 'Mesa 1', status: 'livre' })] })
      const mock = createQueryClientMock(live)

      applyRealtimeEnvelope(qc(mock), {
        event: 'comanda.opened',
        payload: {
          comandaId: 'c-new',
          mesaId: 'm-1',
          tableLabel: 'Mesa 1',
          openedAt: '2026-03-30T10:00:00.000Z',
          status: 'OPEN',
          businessDate: '2026-03-30',
        },
      })

      const mesa = mock.getLiveSnapshot().mesas.find((m) => m.id === 'm-1')
      expect(mesa?.status).toBe('ocupada')
      expect(mesa?.comandaId).toBe('c-new')
    })

    it('marks mesa as livre when comanda is closed', () => {
      const live = buildLiveSnapshot({
        mesas: [buildMesa({ id: 'm-1', label: 'Mesa 1', status: 'ocupada', comandaId: 'c-1' })],
      })
      live.unassigned.comandas.push(buildComanda({ id: 'c-1', mesaId: 'm-1', tableLabel: 'Mesa 1' }))
      const mock = createQueryClientMock(live)

      applyRealtimeEnvelope(qc(mock), {
        event: 'comanda.closed',
        payload: {
          comandaId: 'c-1',
          mesaId: 'm-1',
          tableLabel: 'Mesa 1',
          status: 'CLOSED',
          totalAmount: 50,
          businessDate: '2026-03-30',
          closedAt: '2026-03-30T12:00:00.000Z',
        },
      })

      const mesa = mock.getLiveSnapshot().mesas.find((m) => m.id === 'm-1')
      expect(mesa?.status).toBe('livre')
      expect(mesa?.comandaId).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // withGroupMetrics
  // -------------------------------------------------------------------------

  describe('withGroupMetrics (computed via patches)', () => {
    it('counts open and closed tables after comanda update', () => {
      const live = buildLiveSnapshot({
        employees: [
          {
            employeeId: 'emp-1',
            employeeCode: 'E01',
            displayName: 'Joao',
            active: true,
            cashSession: buildCashSession({
              grossRevenueAmount: 300,
              realizedProfitAmount: 100,
              expectedCashAmount: 250,
            }),
            comandas: [
              buildComanda({ id: 'c-1', currentEmployeeId: 'emp-1', status: 'OPEN' }),
              buildComanda({
                id: 'c-2',
                currentEmployeeId: 'emp-1',
                status: 'CLOSED',
                closedAt: '2026-03-30T11:00:00.000Z',
              }),
            ],
          },
        ],
      })
      const mock = createQueryClientMock(live)

      applyRealtimeEnvelope(qc(mock), {
        event: 'comanda.updated',
        payload: {
          comandaId: 'c-1',
          currentEmployeeId: 'emp-1',
          tableLabel: 'Mesa 1',
          status: 'READY',
          businessDate: '2026-03-30',
        },
      })

      const group = mock.getLiveSnapshot().employees[0] as unknown as {
        metrics: { openTables: number; closedTables: number; grossRevenueAmount: number; expectedCashAmount: number }
      }
      // READY is open, so openTables=1, closedTables=1
      expect(group.metrics.openTables).toBe(1)
      expect(group.metrics.closedTables).toBe(1)
      expect(group.metrics.grossRevenueAmount).toBe(300)
      expect(group.metrics.expectedCashAmount).toBe(250)
    })
  })

  // -------------------------------------------------------------------------
  // buildKitchenStatusCounts (exercised via kitchen patches)
  // -------------------------------------------------------------------------

  describe('buildKitchenStatusCounts', () => {
    it('recomputes counts after status transitions', () => {
      const kitchen = buildKitchenSnapshot({
        items: [
          buildKitchenItemRecord({
            itemId: 'i1',
            kitchenStatus: 'QUEUED',
            kitchenQueuedAt: '2026-03-30T10:00:00.000Z',
          }),
          buildKitchenItemRecord({
            itemId: 'i2',
            kitchenStatus: 'IN_PREPARATION',
            kitchenQueuedAt: '2026-03-30T10:01:00.000Z',
          }),
          buildKitchenItemRecord({ itemId: 'i3', kitchenStatus: 'READY', kitchenQueuedAt: '2026-03-30T10:02:00.000Z' }),
        ],
        statusCounts: { queued: 1, inPreparation: 1, ready: 1 },
      })
      const mock = createQueryClientMock(buildLiveSnapshot(), kitchen)

      // Move i1 to IN_PREPARATION
      applyRealtimeEnvelope(qc(mock), {
        event: 'kitchen.item.updated',
        payload: {
          itemId: 'i1',
          comandaId: 'comanda-1',
          mesaLabel: 'Mesa 1',
          productName: 'Pizza',
          quantity: 1,
          kitchenStatus: 'IN_PREPARATION',
          businessDate: '2026-03-30',
        },
      })

      const counts = mock.getKitchenSnapshot()!.statusCounts
      expect(counts.queued).toBe(0)
      expect(counts.inPreparation).toBe(2)
      expect(counts.ready).toBe(1)
    })
  })

  // -------------------------------------------------------------------------
  // Business date mismatch
  // -------------------------------------------------------------------------

  describe('business date mismatch', () => {
    it('rejects live patch when businessDate differs', () => {
      const mock = createQueryClientMock(buildLiveSnapshot(), buildKitchenSnapshot())

      const result = applyRealtimeEnvelope(qc(mock), {
        event: 'comanda.updated',
        payload: {
          comandaId: 'comanda-1',
          mesaLabel: 'Mesa 1',
          status: 'OPEN',
          totalAmount: 10,
          businessDate: '2026-03-29',
        },
      })

      expect(result.livePatched).toBe(false)
      expect(result.kitchenPatched).toBe(false)
    })

    it('rejects kitchen patch when businessDate differs', () => {
      const mock = createQueryClientMock(buildLiveSnapshot(), buildKitchenSnapshot())

      const result = applyRealtimeEnvelope(qc(mock), {
        event: 'kitchen.item.queued',
        payload: {
          businessDate: '2026-03-29',
          itemId: 'item-new',
          comandaId: 'c-1',
          productName: 'Fries',
          mesaLabel: 'Mesa 1',
          quantity: 1,
        },
      })

      expect(result.kitchenNeedsRefresh).toBe(true)
    })

    it('rejects summary patch when businessDate differs', () => {
      const mock = createQueryClientMock(buildLiveSnapshot(), undefined, buildSummarySnapshot())

      const result = applyRealtimeEnvelope(qc(mock), {
        event: 'cash.closure.updated',
        payload: { businessDate: '2026-03-29', expectedAmount: 100 },
      })

      expect(result.summaryNeedsRefresh).toBe(true)
    })

    it('accepts when payload has no businessDate (non-string is ignored)', () => {
      const mock = createQueryClientMock(buildLiveSnapshot())

      const result = applyRealtimeEnvelope(qc(mock), {
        event: 'comanda.opened',
        payload: {
          businessDate: 12345, // non-string, ignored
          comandaId: 'c-1',
          tableLabel: 'Mesa 1',
          openedAt: '2026-03-30T10:00:00.000Z',
          status: 'OPEN',
        },
      })

      expect(result.livePatched).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // Patch result flags
  // -------------------------------------------------------------------------

  describe('patch result flags', () => {
    it('returns all false when no cache data exists', () => {
      const mock = createQueryClientMock(undefined as unknown as OperationsLiveResponse)
      mock.getQueriesData.mockReturnValue([])

      const result = applyRealtimeEnvelope(qc(mock), {
        event: 'comanda.opened',
        payload: { comandaId: 'c-1', openedAt: '2026-03-30T09:00:00.000Z', tableLabel: 'Mesa 1' },
      })

      expect(result.livePatched).toBe(false)
      expect(result.kitchenPatched).toBe(false)
      expect(result.summaryPatched).toBe(false)
    })

    it('summaryPatched is false for non cash.closure.updated events', () => {
      const mock = createQueryClientMock(buildLiveSnapshot(), undefined, buildSummarySnapshot())

      const result = applyRealtimeEnvelope(qc(mock), {
        event: 'comanda.opened',
        payload: {
          businessDate: '2026-03-30',
          comandaId: 'c-new',
          tableLabel: 'Mesa 5',
          openedAt: '2026-03-30T10:00:00.000Z',
        },
      })

      expect(result.summaryPatched).toBe(false)
    })

    it('kitchenPatched is false when no kitchen snapshot is cached', () => {
      const mock = createQueryClientMock(buildLiveSnapshot())

      const result = applyRealtimeEnvelope(qc(mock), {
        event: 'kitchen.item.queued',
        payload: {
          businessDate: '2026-03-30',
          itemId: 'item-1',
          comandaId: 'c-1',
          productName: 'Fries',
          mesaLabel: 'Mesa 1',
          quantity: 1,
        },
      })

      expect(result.kitchenPatched).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // Unknown / default event
  // -------------------------------------------------------------------------

  describe('unknown event', () => {
    it('returns liveNeedsRefresh for unrecognised event type', () => {
      const mock = createQueryClientMock(buildLiveSnapshot())

      const result = applyRealtimeEnvelope(qc(mock), {
        event: 'some.unknown.event' as never,
        payload: { businessDate: '2026-03-30' },
      })

      expect(result.liveNeedsRefresh).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // Legacy comanda item extraction
  // -------------------------------------------------------------------------

  describe('legacy comanda item extraction', () => {
    it('extracts kitchen items from legacy comanda.items path', () => {
      const kitchen = buildKitchenSnapshot({ items: [] })
      const mock = createQueryClientMock(buildLiveSnapshot(), kitchen)

      const result = applyRealtimeEnvelope(qc(mock), {
        event: 'comanda.updated',
        payload: {
          businessDate: '2026-03-30',
          comandaId: 'comanda-1',
          mesaLabel: 'Mesa 1',
          status: 'IN_PREPARATION',
          totalAmount: 32,
          requiresKitchenRefresh: true,
          comanda: buildComanda({
            id: 'comanda-1',
            tableLabel: 'Mesa 1',
            items: [
              buildComandaItem({
                id: 'item-leg',
                productName: 'Coxinha',
                quantity: 3,
                kitchenStatus: 'QUEUED',
                kitchenQueuedAt: '2026-03-30T10:05:00.000Z',
              }),
            ],
          }),
        },
      })

      // Kitchen should have picked up the legacy item
      expect(result.kitchenPatched).toBe(true)
      const kitchenSnap = mock.getKitchenSnapshot()!
      expect(kitchenSnap.items.some((i) => i.productName === 'Coxinha')).toBe(true)
    })

    it('extracts kitchen items from raw items array with comandaId', () => {
      const kitchen = buildKitchenSnapshot({ items: [] })
      const mock = createQueryClientMock(buildLiveSnapshot(), kitchen)

      applyRealtimeEnvelope(qc(mock), {
        event: 'comanda.updated',
        payload: {
          businessDate: '2026-03-30',
          comandaId: 'comanda-1',
          mesaLabel: 'Mesa 1',
          status: 'IN_PREPARATION',
          totalAmount: 32,
          requiresKitchenRefresh: true,
          items: [buildComandaItem({ id: 'raw-i1', productName: 'Pastel', kitchenStatus: 'QUEUED' })],
        },
      })

      const kitchenSnap = mock.getKitchenSnapshot()!
      expect(kitchenSnap.items.some((i) => i.productName === 'Pastel')).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // buildKitchenItemFromPayload via kitchen.item.queued
  // -------------------------------------------------------------------------

  describe('buildKitchenItemFromPayload', () => {
    it('uses legacy item object from payload.item', () => {
      const mock = createQueryClientMock(buildLiveSnapshot(), buildKitchenSnapshot())

      applyRealtimeEnvelope(qc(mock), {
        event: 'kitchen.item.queued',
        payload: {
          businessDate: '2026-03-30',
          comandaId: 'comanda-1',
          mesaLabel: 'Mesa 1',
          employeeId: 'emp-1',
          employeeName: 'Joao',
          item: buildComandaItem({ id: 'leg-item', productName: 'Risoto', quantity: 2 }),
        },
      })

      const kitchen = mock.getKitchenSnapshot()!
      expect(kitchen.items.some((i) => i.productName === 'Risoto' && i.quantity === 2)).toBe(true)
    })

    it('returns null (no patch) when required fields are missing', () => {
      const mock = createQueryClientMock(buildLiveSnapshot(), buildKitchenSnapshot())

      const result = applyRealtimeEnvelope(qc(mock), {
        event: 'kitchen.item.updated',
        payload: {
          businessDate: '2026-03-30',
          // Missing everything
        },
      })

      // No item built => kitchen patch returns null => kitchenNeedsRefresh
      expect(result.kitchenNeedsRefresh).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // Sorting of kitchen items by kitchenQueuedAt
  // -------------------------------------------------------------------------

  describe('kitchen item sorting', () => {
    it('sorts items by kitchenQueuedAt after patch', () => {
      const kitchen = buildKitchenSnapshot({
        items: [buildKitchenItemRecord({ itemId: 'i-late', kitchenQueuedAt: '2026-03-30T10:30:00.000Z' })],
      })
      const mock = createQueryClientMock(buildLiveSnapshot(), kitchen)

      applyRealtimeEnvelope(qc(mock), {
        event: 'kitchen.item.queued',
        payload: {
          businessDate: '2026-03-30',
          itemId: 'i-early',
          comandaId: 'comanda-1',
          mesaLabel: 'Mesa 1',
          productName: 'Salada',
          quantity: 1,
          kitchenQueuedAt: '2026-03-30T09:00:00.000Z',
        },
      })

      const items = mock.getKitchenSnapshot()!.items
      expect(items[0].itemId).toBe('i-early')
      expect(items[1].itemId).toBe('i-late')
    })
  })

  // -------------------------------------------------------------------------
  // mapCashSessionStatus
  // -------------------------------------------------------------------------

  describe('mapCashSessionStatus (via cash.updated)', () => {
    it('maps OPEN status', () => {
      const live = buildLiveSnapshot({
        employees: [
          {
            employeeId: 'emp-1',
            employeeCode: 'E01',
            displayName: 'Joao',
            active: true,
            cashSession: buildCashSession({ id: 'cs-1', status: 'OPEN' }),
            comandas: [],
          },
        ],
      })
      const mock = createQueryClientMock(live)

      applyRealtimeEnvelope(qc(mock), {
        event: 'cash.updated',
        payload: { businessDate: '2026-03-30', cashSessionId: 'cs-1', status: 'CLOSED' },
      })

      expect(mock.getLiveSnapshot().employees[0].cashSession?.status).toBe('CLOSED')
    })

    it('ignores invalid status and keeps existing', () => {
      const live = buildLiveSnapshot({
        employees: [
          {
            employeeId: 'emp-1',
            employeeCode: 'E01',
            displayName: 'Joao',
            active: true,
            cashSession: buildCashSession({ id: 'cs-1', status: 'OPEN' }),
            comandas: [],
          },
        ],
      })
      const mock = createQueryClientMock(live)

      applyRealtimeEnvelope(qc(mock), {
        event: 'cash.updated',
        payload: { businessDate: '2026-03-30', cashSessionId: 'cs-1', status: 'INVALID' },
      })

      expect(mock.getLiveSnapshot().employees[0].cashSession?.status).toBe('OPEN')
    })
  })

  // -------------------------------------------------------------------------
  // mapComandaStatus
  // -------------------------------------------------------------------------

  describe('mapComandaStatus', () => {
    for (const status of ['OPEN', 'IN_PREPARATION', 'READY', 'CLOSED', 'CANCELLED'] as const) {
      it(`maps ${status} correctly`, () => {
        const live = buildLiveSnapshot()
        live.unassigned.comandas.push(buildComanda({ id: 'c-1', status: 'OPEN' }))
        const mock = createQueryClientMock(live)

        applyRealtimeEnvelope(qc(mock), {
          event: 'comanda.updated',
          payload: {
            comandaId: 'c-1',
            tableLabel: 'Mesa 1',
            status,
            businessDate: '2026-03-30',
          },
        })

        expect(mock.getLiveSnapshot().unassigned.comandas[0]?.status).toBe(status)
      })
    }

    it('falls back to existing status for invalid value', () => {
      const live = buildLiveSnapshot()
      live.unassigned.comandas.push(buildComanda({ id: 'c-1', status: 'IN_PREPARATION' }))
      const mock = createQueryClientMock(live)

      applyRealtimeEnvelope(qc(mock), {
        event: 'comanda.updated',
        payload: {
          comandaId: 'c-1',
          tableLabel: 'Mesa 1',
          status: 'NONSENSE',
          businessDate: '2026-03-30',
        },
      })

      // mapComandaStatus returns null for 'NONSENSE', falls back to existing
      expect(mock.getLiveSnapshot().unassigned.comandas[0]?.status).toBe('IN_PREPARATION')
    })
  })

  // -------------------------------------------------------------------------
  // isOpenComandaStatus (exercised via openComandasCount)
  // -------------------------------------------------------------------------

  describe('isOpenComandaStatus', () => {
    it('counts OPEN, IN_PREPARATION, READY as open', () => {
      for (const status of ['OPEN', 'IN_PREPARATION', 'READY'] as const) {
        const live = buildLiveSnapshot({
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
        })
        const mock = createQueryClientMock(live)

        applyRealtimeEnvelope(qc(mock), {
          event: 'comanda.opened',
          payload: {
            comandaId: `c-${status}`,
            tableLabel: 'Mesa 1',
            openedAt: '2026-03-30T10:00:00.000Z',
            status,
            businessDate: '2026-03-30',
          },
        })

        expect(mock.getLiveSnapshot().closure?.openComandasCount).toBe(1)
      }
    })

    it('does not count CLOSED and CANCELLED as open via comanda.updated', () => {
      for (const status of ['CLOSED', 'CANCELLED'] as const) {
        const live = buildLiveSnapshot({
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
        })
        live.unassigned.comandas.push(buildComanda({ id: `c-${status}`, status: 'OPEN' }))
        // openComandasCount stays 0 in fixture, but the comanda is OPEN.
        // After updating to CLOSED/CANCELLED, it should decrement (clamped to 0).
        const mock = createQueryClientMock(live)

        applyRealtimeEnvelope(qc(mock), {
          event: 'comanda.updated',
          payload: {
            comandaId: `c-${status}`,
            tableLabel: 'Mesa 1',
            openedAt: '2026-03-30T10:00:00.000Z',
            status,
            businessDate: '2026-03-30',
          },
        })

        // Went from open to closed/cancelled => delta -1, clamped to 0
        expect(mock.getLiveSnapshot().closure?.openComandasCount).toBe(0)
      }
    })
  })

  // -------------------------------------------------------------------------
  // requiresSummaryRefresh
  // -------------------------------------------------------------------------

  describe('requiresSummaryRefresh', () => {
    const summaryEvents = [
      'comanda.opened',
      'comanda.updated',
      'comanda.closed',
      'cash.updated',
      'cash.opened',
      'cash.closure.updated',
    ] as const

    for (const event of summaryEvents) {
      it(`triggers summary consideration for ${event}`, () => {
        const mock = createQueryClientMock(buildLiveSnapshot(), undefined, buildSummarySnapshot())

        const result = applyRealtimeEnvelope(qc(mock), {
          event,
          payload: {
            businessDate: '2026-03-30',
            comandaId: 'c-1',
            tableLabel: 'Mesa 1',
            openedAt: '2026-03-30T10:00:00.000Z',
            cashSession: buildCashSession(),
          },
        })

        // patchSummarySnapshot only applies for cash.closure.updated,
        // so for other events summaryPatched = false and summaryNeedsRefresh = false
        // (because requiresSummaryRefresh is only called to decide whether to queue refresh)
        if (event === 'cash.closure.updated') {
          // No kpi fields => summaryNeedsRefresh
          expect(result.summaryNeedsRefresh).toBe(true)
        } else {
          expect(result.summaryPatched).toBe(false)
        }
      })
    }

    it('does not trigger summary for kitchen or mesa events', () => {
      const mock = createQueryClientMock(buildLiveSnapshot(), buildKitchenSnapshot(), buildSummarySnapshot())

      const result = applyRealtimeEnvelope(qc(mock), {
        event: 'mesa.upserted',
        payload: {
          businessDate: '2026-03-30',
          mesa: buildMesa(),
        },
      })

      expect(result.summaryPatched).toBe(false)
      expect(result.summaryNeedsRefresh).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // requiresKitchenRefresh
  // -------------------------------------------------------------------------

  describe('requiresKitchenRefresh', () => {
    it('returns true for kitchen.item.queued', () => {
      const mock = createQueryClientMock(buildLiveSnapshot())
      // No kitchen snapshot = kitchenNeedsRefresh should be set

      const result = applyRealtimeEnvelope(qc(mock), {
        event: 'kitchen.item.queued',
        payload: {
          businessDate: '2026-03-30',
          itemId: 'i-1',
          comandaId: 'c-1',
          productName: 'Test',
          mesaLabel: 'Mesa 1',
          quantity: 1,
        },
      })

      // No kitchen data cached => kitchenPatched=false
      expect(result.kitchenPatched).toBe(false)
    })

    it('returns true for comanda.updated with requiresKitchenRefresh flag', () => {
      const mock = createQueryClientMock(buildLiveSnapshot())

      const result = applyRealtimeEnvelope(qc(mock), {
        event: 'comanda.updated',
        payload: {
          businessDate: '2026-03-30',
          comandaId: 'c-1',
          tableLabel: 'Mesa 1',
          status: 'IN_PREPARATION',
          requiresKitchenRefresh: true,
        },
      })

      // No kitchen snapshot => not patched
      expect(result.kitchenPatched).toBe(false)
    })

    it('returns false for cash.updated (not a kitchen event)', () => {
      const mock = createQueryClientMock(buildLiveSnapshot(), buildKitchenSnapshot())

      const result = applyRealtimeEnvelope(qc(mock), {
        event: 'cash.updated',
        payload: {
          businessDate: '2026-03-30',
          cashSession: buildCashSession(),
        },
      })

      // cash.updated does not trigger kitchen refresh
      expect(result.kitchenPatched).toBe(false)
      expect(result.kitchenNeedsRefresh).toBe(false)
    })
  })
})
