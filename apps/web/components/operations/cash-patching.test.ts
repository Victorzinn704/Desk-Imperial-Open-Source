import { describe, expect, it } from 'vitest'
import { applyRealtimeEnvelope } from './use-operations-realtime'
import {
  cashSession,
  liveSnapshot,
  kitchenSnapshot,
  summarySnapshot,
  createQueryClientMock,
  qc,
} from './__fixtures__/operations-realtime.fixtures'

// ---------------------------------------------------------------------------
// cash.updated
// ---------------------------------------------------------------------------

describe('cash.updated', () => {
  it('patches employee cash session by full record', () => {
    const live = liveSnapshot({
      employees: [
        {
          employeeId: 'emp-1',
          employeeCode: 'E01',
          displayName: 'Joao',
          active: true,
          cashSession: cashSession(),
          comandas: [],
        },
      ],
    })
    const mock = createQueryClientMock(live)
    applyRealtimeEnvelope(qc(mock), {
      event: 'cash.updated',
      payload: { businessDate: '2026-03-30', cashSession: cashSession({ expectedCashAmount: 500 }) },
    })
    expect(mock.getLiveSnapshot().employees[0].cashSession?.expectedCashAmount).toBe(500)
  })

  it('patches employee cash session by cashSessionId (partial fields)', () => {
    const live = liveSnapshot({
      employees: [
        {
          employeeId: 'emp-1',
          employeeCode: 'E01',
          displayName: 'Joao',
          active: true,
          cashSession: cashSession({ id: 'cs-1', expectedCashAmount: 200 }),
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
    const live = liveSnapshot({
      unassigned: {
        employeeId: null,
        employeeCode: null,
        displayName: 'Owner',
        active: true,
        cashSession: cashSession({ id: 'cs-unassigned', employeeId: null, expectedCashAmount: 100 }),
        comandas: [],
      },
    })
    const mock = createQueryClientMock(live)
    applyRealtimeEnvelope(qc(mock), {
      event: 'cash.updated',
      payload: { businessDate: '2026-03-30', cashSessionId: 'cs-unassigned', expectedAmount: 999 },
    })
    expect(mock.getLiveSnapshot().unassigned.cashSession?.expectedCashAmount).toBe(999)
  })

  it('patches counted and difference amounts via cashSessionId', () => {
    const live = liveSnapshot({
      employees: [
        {
          employeeId: 'emp-1',
          employeeCode: 'E01',
          displayName: 'Joao',
          active: true,
          cashSession: cashSession({ id: 'cs-1' }),
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
    const mock = createQueryClientMock(liveSnapshot())
    const result = applyRealtimeEnvelope(qc(mock), { event: 'cash.updated', payload: { businessDate: '2026-03-30' } })
    expect(result.liveNeedsRefresh).toBe(true)
  })

  it('handles full record with employeeId not matching any group gracefully', () => {
    const live = liveSnapshot({
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
      event: 'cash.updated',
      payload: { businessDate: '2026-03-30', cashSession: cashSession({ employeeId: 'emp-unknown' }) },
    })
    expect(mock.getLiveSnapshot().employees[0].cashSession).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// cash.opened
// ---------------------------------------------------------------------------

describe('cash.opened', () => {
  it('sets cash session on matching employee group', () => {
    const live = liveSnapshot({
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
      payload: { businessDate: '2026-03-30', cashSession: cashSession({ id: 'cs-new' }) },
    })
    expect(mock.getLiveSnapshot().employees[0].cashSession?.id).toBe('cs-new')
  })

  it('sets cash session on unassigned when employeeId is null', () => {
    const mock = createQueryClientMock(liveSnapshot())
    applyRealtimeEnvelope(qc(mock), {
      event: 'cash.opened',
      payload: { businessDate: '2026-03-30', cashSession: cashSession({ id: 'cs-owner', employeeId: null }) },
    })
    expect(mock.getLiveSnapshot().unassigned.cashSession?.id).toBe('cs-owner')
  })

  it('returns liveNeedsRefresh when no cashSession record in payload', () => {
    const mock = createQueryClientMock(liveSnapshot())
    const result = applyRealtimeEnvelope(qc(mock), { event: 'cash.opened', payload: { businessDate: '2026-03-30' } })
    expect(result.liveNeedsRefresh).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// cash.closure.updated
// ---------------------------------------------------------------------------

describe('cash.closure.updated', () => {
  it('patches closure fields in live snapshot', () => {
    const mock = createQueryClientMock(liveSnapshot())
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
    const mock = createQueryClientMock(liveSnapshot({ closure: null }))
    const result = applyRealtimeEnvelope(qc(mock), {
      event: 'cash.closure.updated',
      payload: { businessDate: '2026-03-30', status: 'CLOSED', expectedAmount: 1 },
    })
    expect(result.liveNeedsRefresh).toBe(true)
  })

  it.each([
    ['OPEN', 'OPEN'],
    ['CLOSED', 'CLOSED'],
    ['INVALID', 'OPEN'], // falls back to existing
  ])('maps closure status %s correctly', (input, expected) => {
    const mock = createQueryClientMock(liveSnapshot())
    applyRealtimeEnvelope(qc(mock), {
      event: 'cash.closure.updated',
      payload: { businessDate: '2026-03-30', status: input, expectedAmount: 1 },
    })
    expect(mock.getLiveSnapshot().closure?.status).toBe(expected)
  })

  it('patches summary kpis with projecaoTotal and lucroEsperado', () => {
    const mock = createQueryClientMock(liveSnapshot(), kitchenSnapshot(), summarySnapshot())
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
    expect(mock.getSummarySnapshot()?.kpis.projecaoTotal).toBe(230)
    expect(mock.getSummarySnapshot()?.kpis.lucroRealizado).toBe(55)
    expect(mock.getSummarySnapshot()?.kpis.lucroEsperado).toBeCloseTo(70.277, 2)
  })

  it('handles zero receitaRealizada in summary by setting estimatedOpenMargin to 0', () => {
    const mock = createQueryClientMock(liveSnapshot(), undefined, summarySnapshot())
    applyRealtimeEnvelope(qc(mock), {
      event: 'cash.closure.updated',
      payload: { businessDate: '2026-03-30', grossRevenueAmount: 0, realizedProfitAmount: 0 },
    })
    const kpis = mock.getSummarySnapshot()?.kpis
    expect(kpis?.lucroEsperado).toBe(0)
    expect(kpis?.projecaoTotal).toBe(50)
  })

  it('returns summaryNeedsRefresh when no kpi fields provided', () => {
    const mock = createQueryClientMock(liveSnapshot(), undefined, summarySnapshot())
    const result = applyRealtimeEnvelope(qc(mock), {
      event: 'cash.closure.updated',
      payload: { businessDate: '2026-03-30', status: 'CLOSED' },
    })
    expect(result.summaryNeedsRefresh).toBe(true)
  })

  it('ignores invalid nullable fields without breaking summary patch', () => {
    const mock = createQueryClientMock(liveSnapshot(), kitchenSnapshot(), summarySnapshot())
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
        businessDate: 12345,
      },
    })
    expect(result.summaryPatched).toBe(true)
    expect(mock.getSummarySnapshot()?.kpis.caixaEsperado).toBe(140)
    expect(mock.getSummarySnapshot()?.kpis.openComandasCount).toBe(1)
  })
})
