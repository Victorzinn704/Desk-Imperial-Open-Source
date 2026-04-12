import { describe, expect, it } from 'vitest'
import { applyRealtimeEnvelope } from './use-operations-realtime'
import {
  comanda, comandaItem, kitchenItem, kitchenSnapshot, liveSnapshot,
  createQueryClientMock, qc, type QC,
} from './__fixtures__/operations-realtime.fixtures'

// ---------------------------------------------------------------------------
// comanda.opened
// ---------------------------------------------------------------------------

describe('comanda.opened', () => {
  it('patches snapshot with delta-first payload (no full comanda object)', () => {
    const mock = createQueryClientMock(liveSnapshot())
    const result = applyRealtimeEnvelope(qc(mock), {
      event: 'comanda.opened',
      payload: { comandaId: 'comanda-1', mesaLabel: 'Mesa 1', status: 'OPEN', employeeId: null, totalAmount: 48.5, subtotal: 48.5, openedAt: '2026-03-30T10:00:00.000Z', businessDate: '2026-03-30' },
    })
    expect(result.livePatched).toBe(true)
    expect(mock.setQueryData).toHaveBeenCalled()
    expect(mock.getLiveSnapshot().unassigned.comandas.some((c) => c.id === 'comanda-1')).toBe(true)
  })

  it('places comanda in matching employee group', () => {
    const live = liveSnapshot({ employees: [{ employeeId: 'emp-1', employeeCode: 'E01', displayName: 'Joao', active: true, cashSession: null, comandas: [] }] })
    const mock = createQueryClientMock(live)
    applyRealtimeEnvelope(qc(mock), {
      event: 'comanda.opened',
      payload: { comandaId: 'c-new', currentEmployeeId: 'emp-1', tableLabel: 'Mesa 2', openedAt: '2026-03-30T10:00:00.000Z', status: 'OPEN', businessDate: '2026-03-30' },
    })
    const snap = mock.getLiveSnapshot()
    expect(snap.employees[0].comandas.some((c) => c.id === 'c-new')).toBe(true)
    expect(snap.unassigned.comandas.some((c) => c.id === 'c-new')).toBe(false)
  })

  it('increments closure openComandasCount for a new open comanda', () => {
    const mock = createQueryClientMock(liveSnapshot())
    applyRealtimeEnvelope(qc(mock), {
      event: 'comanda.opened',
      payload: { comandaId: 'c-new', tableLabel: 'Mesa 2', openedAt: '2026-03-30T11:00:00.000Z', status: 'OPEN', businessDate: '2026-03-30' },
    })
    expect(mock.getLiveSnapshot().closure?.openComandasCount).toBe(1)
  })

  it('uses legacy comanda object from payload', () => {
    const mock = createQueryClientMock(liveSnapshot())
    applyRealtimeEnvelope(qc(mock), {
      event: 'comanda.opened',
      payload: { businessDate: '2026-03-30', comanda: comanda({ id: 'c-legacy', status: 'OPEN', items: [comandaItem({ id: 'i-leg', productName: 'Coxinha' })] }) },
    })
    const snap = mock.getLiveSnapshot()
    const c = snap.unassigned.comandas.find((x) => x.id === 'c-legacy')
    expect(c).toBeTruthy()
    expect(c?.items).toHaveLength(1)
    expect(c?.items[0].productName).toBe('Coxinha')
  })

  it('returns liveNeedsRefresh when comandaId is missing', () => {
    const mock = createQueryClientMock(liveSnapshot())
    const result = applyRealtimeEnvelope(qc(mock), { event: 'comanda.opened', payload: { businessDate: '2026-03-30', tableLabel: 'Mesa 1' } })
    expect(result.livePatched).toBe(false)
    expect(result.liveNeedsRefresh).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// comanda.updated
// ---------------------------------------------------------------------------

describe('comanda.updated', () => {
  it('prioritises fresh totals from payload over stale local values', () => {
    const live = liveSnapshot()
    live.unassigned.comandas.push(comanda({ subtotalAmount: 0, totalAmount: 0 }))
    const mock = createQueryClientMock(live)
    applyRealtimeEnvelope(qc(mock), {
      event: 'comanda.updated',
      payload: { comandaId: 'comanda-1', mesaLabel: 'Mesa 1', status: 'OPEN', subtotalAmount: 48.5, discountAmount: 3, serviceFeeAmount: 2, totalAmount: 47.5, businessDate: '2026-03-30' },
    })
    const c = mock.getLiveSnapshot().unassigned.comandas[0]
    expect(c?.subtotalAmount).toBe(48.5)
    expect(c?.discountAmount).toBe(3)
    expect(c?.serviceFeeAmount).toBe(2)
    expect(c?.totalAmount).toBe(47.5)
  })

  it('moves comanda between employee groups via legacy comanda object', () => {
    const live = liveSnapshot({
      employees: [
        { employeeId: 'emp-1', employeeCode: 'E01', displayName: 'Joao', active: true, cashSession: null, comandas: [comanda({ id: 'c-1', currentEmployeeId: 'emp-1' })] },
        { employeeId: 'emp-2', employeeCode: 'E02', displayName: 'Maria', active: true, cashSession: null, comandas: [] },
      ],
    })
    const mock = createQueryClientMock(live)
    applyRealtimeEnvelope(qc(mock), {
      event: 'comanda.updated',
      payload: { businessDate: '2026-03-30', comanda: comanda({ id: 'c-1', currentEmployeeId: 'emp-2' }) },
    })
    const snap = mock.getLiveSnapshot()
    expect(snap.employees.find((e) => e.employeeId === 'emp-2')?.comandas.some((c) => c.id === 'c-1')).toBe(true)
    expect(snap.employees.find((e) => e.employeeId === 'emp-1')?.comandas.some((c) => c.id === 'c-1')).toBe(false)
  })

  it('updates comanda status (e.g. to IN_PREPARATION)', () => {
    const live = liveSnapshot()
    live.unassigned.comandas.push(comanda({ id: 'c-1', status: 'OPEN' }))
    const mock = createQueryClientMock(live)
    applyRealtimeEnvelope(qc(mock), {
      event: 'comanda.updated',
      payload: { comandaId: 'c-1', tableLabel: 'Mesa 1', status: 'IN_PREPARATION', businessDate: '2026-03-30' },
    })
    expect(mock.getLiveSnapshot().unassigned.comandas[0]?.status).toBe('IN_PREPARATION')
  })

  it('does not force kitchen refresh when comanda has no kitchen items', () => {
    const mock = createQueryClientMock(liveSnapshot(), kitchenSnapshot())
    const result = applyRealtimeEnvelope(qc(mock), {
      event: 'comanda.updated',
      payload: { comandaId: 'comanda-1', mesaLabel: 'Mesa 1', status: 'IN_PREPARATION', employeeId: null, totalAmount: 10, subtotal: 10, businessDate: '2026-03-30' },
    })
    expect(result.kitchenNeedsRefresh).toBe(false)
  })

  it('patches comanda items from payload items array', () => {
    const live = liveSnapshot()
    live.unassigned.comandas.push(comanda({ id: 'c-1', items: [] }))
    const mock = createQueryClientMock(live)
    applyRealtimeEnvelope(qc(mock), {
      event: 'comanda.updated',
      payload: { comandaId: 'c-1', tableLabel: 'Mesa 1', status: 'IN_PREPARATION', businessDate: '2026-03-30', items: [comandaItem({ id: 'i-1', productName: 'Hamburguer', quantity: 2 }), comandaItem({ id: 'i-2', productName: 'Batata', quantity: 1 })] },
    })
    expect(mock.getLiveSnapshot().unassigned.comandas[0]?.items).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// comanda.closed
// ---------------------------------------------------------------------------

describe('comanda.closed', () => {
  it('closes comanda and decrements openComandasCount', () => {
    const live = liveSnapshot({ closure: { status: 'OPEN', expectedCashAmount: 0, countedCashAmount: null, differenceAmount: null, grossRevenueAmount: 0, realizedProfitAmount: 0, openSessionsCount: 0, openComandasCount: 3 } })
    live.unassigned.comandas.push(comanda({ id: 'c-1', status: 'OPEN' }))
    const mock = createQueryClientMock(live)
    applyRealtimeEnvelope(qc(mock), {
      event: 'comanda.closed',
      payload: { comandaId: 'c-1', mesaLabel: 'Mesa 1', status: 'CLOSED', totalAmount: 10, businessDate: '2026-03-30', closedAt: '2026-03-30T12:00:00.000Z' },
    })
    const snap = mock.getLiveSnapshot()
    expect(snap.unassigned.comandas[0]?.status).toBe('CLOSED')
    expect(snap.closure?.openComandasCount).toBe(2)
  })

  it('does not double-decrement when comanda was already CLOSED', () => {
    const live = liveSnapshot({ closure: { status: 'OPEN', expectedCashAmount: 0, countedCashAmount: null, differenceAmount: null, grossRevenueAmount: 0, realizedProfitAmount: 0, openSessionsCount: 0, openComandasCount: 5 } })
    live.unassigned.comandas.push(comanda({ id: 'c-1', status: 'CLOSED', closedAt: '2026-03-30T11:00:00.000Z' }))
    const mock = createQueryClientMock(live)
    applyRealtimeEnvelope(qc(mock), {
      event: 'comanda.closed',
      payload: { comandaId: 'c-1', mesaLabel: 'Mesa 1', status: 'CLOSED', totalAmount: 10, businessDate: '2026-03-30' },
    })
    expect(mock.getLiveSnapshot().closure?.openComandasCount).toBe(5)
  })

  it('clamps openComandasCount to zero', () => {
    const live = liveSnapshot({ closure: { status: 'OPEN', expectedCashAmount: 0, countedCashAmount: null, differenceAmount: null, grossRevenueAmount: 0, realizedProfitAmount: 0, openSessionsCount: 0, openComandasCount: 0 } })
    live.unassigned.comandas.push(comanda({ id: 'c-1', status: 'OPEN' }))
    const mock = createQueryClientMock(live)
    applyRealtimeEnvelope(qc(mock), {
      event: 'comanda.closed',
      payload: { comandaId: 'c-1', mesaLabel: 'Mesa 1', status: 'CLOSED', totalAmount: 10, businessDate: '2026-03-30' },
    })
    expect(mock.getLiveSnapshot().closure?.openComandasCount).toBe(0)
  })

  it('removes kitchen items for closed comanda', () => {
    const kitchen = kitchenSnapshot({
      items: [kitchenItem({ itemId: 'i-1', comandaId: 'c-1' }), kitchenItem({ itemId: 'i-2', comandaId: 'c-1' }), kitchenItem({ itemId: 'i-3', comandaId: 'c-other' })],
      statusCounts: { queued: 3, inPreparation: 0, ready: 0 },
    })
    const mock = createQueryClientMock(liveSnapshot(), kitchen)
    const result = applyRealtimeEnvelope(qc(mock), {
      event: 'comanda.closed',
      payload: { comandaId: 'c-1', mesaLabel: 'Mesa 1', status: 'CLOSED', totalAmount: 10, businessDate: '2026-03-30' },
    })
    expect(result.kitchenPatched).toBe(true)
    const ks = mock.getKitchenSnapshot()!
    expect(ks.items.filter((i) => i.comandaId === 'c-1')).toHaveLength(0)
    expect(ks.items.filter((i) => i.comandaId === 'c-other')).toHaveLength(1)
    expect(ks.statusCounts.queued).toBe(1)
  })

  it('needs refresh when comanda does not exist and cannot be built', () => {
    const mock = createQueryClientMock(liveSnapshot(), kitchenSnapshot())
    const result = applyRealtimeEnvelope(qc(mock), {
      event: 'comanda.closed',
      payload: { comandaId: 'comanda-inexistente', mesaLabel: 'Mesa X', status: 'CLOSED', totalAmount: 10, businessDate: '2026-03-30' },
    })
    expect(result.livePatched).toBe(false)
    expect(result.liveNeedsRefresh).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// mesa tracking via comanda events
// ---------------------------------------------------------------------------

describe('mesa tracking via comanda events', () => {
  it('marks mesa as ocupada when comanda is opened with mesaId', () => {
    const live = liveSnapshot({ mesas: [{ id: 'm-1', label: 'Mesa 1', capacity: 4, section: null, positionX: null, positionY: null, active: true, reservedUntil: null, status: 'livre', comandaId: null, currentEmployeeId: null }] })
    const mock = createQueryClientMock(live)
    applyRealtimeEnvelope(qc(mock), {
      event: 'comanda.opened',
      payload: { comandaId: 'c-1', mesaId: 'm-1', tableLabel: 'Mesa 1', openedAt: '2026-03-30T10:00:00.000Z', status: 'OPEN', businessDate: '2026-03-30' },
    })
    expect(mock.getLiveSnapshot().mesas[0]?.status).toBe('ocupada')
    expect(mock.getLiveSnapshot().mesas[0]?.comandaId).toBe('c-1')
  })

  it('marks mesa as livre when comanda is closed', () => {
    const live = liveSnapshot({ mesas: [{ id: 'm-1', label: 'Mesa 1', capacity: 4, section: null, positionX: null, positionY: null, active: true, reservedUntil: null, status: 'ocupada', comandaId: 'c-1', currentEmployeeId: null }] })
    live.unassigned.comandas.push(comanda({ id: 'c-1', status: 'OPEN', mesaId: 'm-1' }))
    const mock = createQueryClientMock(live)
    applyRealtimeEnvelope(qc(mock), {
      event: 'comanda.closed',
      payload: { comandaId: 'c-1', mesaLabel: 'Mesa 1', status: 'CLOSED', totalAmount: 10, businessDate: '2026-03-30', closedAt: '2026-03-30T12:00:00.000Z' },
    })
    expect(mock.getLiveSnapshot().mesas[0]?.status).toBe('livre')
    expect(mock.getLiveSnapshot().mesas[0]?.comandaId).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// legacy comanda item extraction
// ---------------------------------------------------------------------------

describe('legacy comanda item extraction', () => {
  it('extracts kitchen items from legacy comanda.items path', () => {
    const mock = createQueryClientMock(liveSnapshot(), kitchenSnapshot())
    const result = applyRealtimeEnvelope(qc(mock), {
      event: 'kitchen.item.queued',
      payload: { businessDate: '2026-03-30', comanda: comanda({ id: 'c-1', items: [comandaItem({ kitchenStatus: 'QUEUED' })] }) },
    })
    expect(result.livePatched).toBe(true)
  })

  it('extracts kitchen items from raw items array with comandaId', () => {
    const live = liveSnapshot()
    live.unassigned.comandas.push(comanda({ id: 'c-1' }))
    const mock = createQueryClientMock(live, kitchenSnapshot())
    const result = applyRealtimeEnvelope(qc(mock), {
      event: 'kitchen.item.queued',
      payload: { businessDate: '2026-03-30', comandaId: 'c-1', items: [comandaItem({ kitchenStatus: 'QUEUED' })] },
    })
    expect(result.livePatched).toBe(true)
  })
})
