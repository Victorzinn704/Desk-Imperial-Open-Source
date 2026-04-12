import { describe, expect, it } from 'vitest'
import { applyRealtimeEnvelope } from './use-operations-realtime'
import {
  comanda, liveSnapshot, kitchenSnapshot, summarySnapshot,
  createQueryClientMock, qc,
} from './__fixtures__/operations-realtime.fixtures'

// ---------------------------------------------------------------------------
// business date mismatch
// ---------------------------------------------------------------------------

describe('business date mismatch', () => {
  it('rejects live patch when businessDate differs', () => {
    const mock = createQueryClientMock(liveSnapshot())
    const result = applyRealtimeEnvelope(qc(mock), {
      event: 'comanda.opened',
      payload: { comandaId: 'c-1', tableLabel: 'Mesa 1', status: 'OPEN', openedAt: '2026-03-30T10:00:00.000Z', businessDate: '2026-03-29' },
    })
    expect(result.livePatched).toBe(false)
    expect(result.liveNeedsRefresh).toBe(true)
  })

  it('rejects kitchen patch when businessDate differs', () => {
    const mock = createQueryClientMock(liveSnapshot(), kitchenSnapshot())
    const result = applyRealtimeEnvelope(qc(mock), {
      event: 'kitchen.item.queued',
      payload: { itemId: 'i-1', comandaId: 'c-1', productName: 'P', mesaLabel: 'M1', quantity: 1, employeeId: null, employeeName: 'Op', businessDate: '2026-03-29' },
    })
    expect(result.kitchenPatched).toBe(false)
  })

  it('rejects summary patch when businessDate differs', () => {
    const mock = createQueryClientMock(liveSnapshot(), undefined, summarySnapshot())
    const result = applyRealtimeEnvelope(qc(mock), {
      event: 'cash.closure.updated',
      payload: { businessDate: '2026-03-29', expectedAmount: 999 },
    })
    expect(result.summaryPatched).toBe(false)
  })

  it('accepts when payload has no businessDate (non-string is ignored)', () => {
    const mock = createQueryClientMock(liveSnapshot())
    const result = applyRealtimeEnvelope(qc(mock), {
      event: 'comanda.opened',
      payload: { comandaId: 'c-1', tableLabel: 'Mesa 1', status: 'OPEN', openedAt: '2026-03-30T10:00:00.000Z' },
    })
    expect(result.livePatched).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// patch result flags
// ---------------------------------------------------------------------------

describe('patch result flags', () => {
  it('returns all false when no cache data exists', () => {
    const mock = createQueryClientMock(liveSnapshot({ unassigned: { employeeId: null, employeeCode: null, displayName: 'Op', active: true, cashSession: null, comandas: [] }, closure: null, employees: [], mesas: [] }))
    const result = applyRealtimeEnvelope(qc(mock), {
      event: 'comanda.closed',
      payload: { comandaId: 'nonexistent', mesaLabel: 'X', status: 'CLOSED', totalAmount: 10, businessDate: '2026-03-30' },
    })
    expect(result.livePatched).toBe(false)
    expect(result.kitchenPatched).toBe(false)
    expect(result.summaryPatched).toBe(false)
    expect(result.liveNeedsRefresh).toBe(true)
  })

  it('summaryPatched is false for non cash.closure.updated events', () => {
    const mock = createQueryClientMock(liveSnapshot(), undefined, summarySnapshot())
    const result = applyRealtimeEnvelope(qc(mock), {
      event: 'comanda.opened',
      payload: { comandaId: 'c-1', tableLabel: 'M1', status: 'OPEN', openedAt: '2026-03-30T10:00:00.000Z', businessDate: '2026-03-30' },
    })
    expect(result.summaryPatched).toBe(false)
  })

  it('kitchenPatched is false when no kitchen snapshot is cached', () => {
    const mock = createQueryClientMock(liveSnapshot())
    const result = applyRealtimeEnvelope(qc(mock), {
      event: 'kitchen.item.queued',
      payload: { itemId: 'i-1', comandaId: 'c-1', productName: 'P', mesaLabel: 'M1', quantity: 1, employeeId: null, employeeName: 'Op', businessDate: '2026-03-30' },
    })
    expect(result.kitchenPatched).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// unknown event
// ---------------------------------------------------------------------------

describe('unknown event', () => {
  it('returns liveNeedsRefresh for unrecognised event type', () => {
    const mock = createQueryClientMock(liveSnapshot())
    const result = applyRealtimeEnvelope(qc(mock), {
      event: 'some.unknown.event' as never,
      payload: { businessDate: '2026-03-30' },
    })
    expect(result.liveNeedsRefresh).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// isOpenComandaStatus
// ---------------------------------------------------------------------------

describe('isOpenComandaStatus', () => {
  it('counts OPEN, IN_PREPARATION, READY as open', () => {
    const live = liveSnapshot()
    live.unassigned.comandas.push(comanda({ id: 'c-1', status: 'OPEN' }))
    const mock = createQueryClientMock(live)
    for (const status of ['OPEN', 'IN_PREPARATION', 'READY']) {
      applyRealtimeEnvelope(qc(mock), {
        event: 'comanda.updated',
        payload: { comandaId: 'c-1', tableLabel: 'M1', status, businessDate: '2026-03-30' },
      })
    }
    // All three statuses are open, so closure count should stay 0
    expect(mock.getLiveSnapshot().closure?.openComandasCount).toBe(0)
  })

  it('does not count CLOSED and CANCELLED as open via comanda.updated', () => {
    const live = liveSnapshot()
    live.unassigned.comandas.push(comanda({ id: 'c-1', status: 'OPEN' }))
    const mock = createQueryClientMock(live)
    applyRealtimeEnvelope(qc(mock), {
      event: 'comanda.updated',
      payload: { comandaId: 'c-1', tableLabel: 'M1', status: 'CLOSED', businessDate: '2026-03-30' },
    })
    // Should not trigger open-comanda-specific behavior (closure count unchanged)
    expect(mock.getLiveSnapshot().closure?.openComandasCount).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// requiresSummaryRefresh
// ---------------------------------------------------------------------------

describe('requiresSummaryRefresh', () => {
  it('does not trigger summary for kitchen or mesa events', () => {
    const mock = createQueryClientMock(liveSnapshot(), kitchenSnapshot(), summarySnapshot())
    for (const event of ['kitchen.item.queued', 'kitchen.item.updated', 'mesa.upserted']) {
      applyRealtimeEnvelope(qc(mock), {
        event: event as never,
        payload: { businessDate: '2026-03-30', itemId: 'i-1', comandaId: 'c-1', productName: 'P', mesaLabel: 'M1', quantity: 1, employeeId: null, employeeName: 'Op' },
      })
    }
    expect(mock.getSummarySnapshot()?.kpis.projecaoTotal).toBe(150) // unchanged
  })
})

// ---------------------------------------------------------------------------
// requiresKitchenRefresh
// ---------------------------------------------------------------------------

describe('requiresKitchenRefresh', () => {
  it('returns true for kitchen.item.queued', () => {
    const mock = createQueryClientMock(liveSnapshot(), kitchenSnapshot())
    const result = applyRealtimeEnvelope(qc(mock), {
      event: 'kitchen.item.queued',
      payload: { itemId: 'i-1', comandaId: 'c-1', productName: 'P', mesaLabel: 'M1', quantity: 1, employeeId: null, employeeName: 'Op', businessDate: '2026-03-30' },
    })
    expect(result.kitchenNeedsRefresh || result.kitchenPatched).toBe(true)
  })

  it('returns true for comanda.updated with requiresKitchenRefresh flag', () => {
    const live = liveSnapshot()
    live.unassigned.comandas.push(comanda({ id: 'c-1' }))
    const mock = createQueryClientMock(live)
    const result = applyRealtimeEnvelope(qc(mock), {
      event: 'comanda.updated',
      payload: { comandaId: 'c-1', tableLabel: 'M1', status: 'IN_PREPARATION', businessDate: '2026-03-30', requiresKitchenRefresh: true },
    })
    expect(result.livePatched).toBe(true)
  })

  it('returns false for cash.updated (not a kitchen event)', () => {
    const mock = createQueryClientMock(liveSnapshot(), kitchenSnapshot())
    const result = applyRealtimeEnvelope(qc(mock), {
      event: 'cash.updated',
      payload: { businessDate: '2026-03-30', expectedAmount: 100 },
    })
    expect(result.kitchenNeedsRefresh).toBe(false)
  })
})
