import { describe, expect, it } from 'vitest'
import { applyRealtimeEnvelope } from './use-operations-realtime'
import {
  mesa, liveSnapshot, createQueryClientMock, qc,
} from './__fixtures__/operations-realtime.fixtures'

// ---------------------------------------------------------------------------
// mesa.upserted
// ---------------------------------------------------------------------------

describe('mesa.upserted', () => {
  it('upserts mesa with full mesa record (existing)', () => {
    const live = liveSnapshot({ mesas: [mesa({ id: 'm-1', status: 'livre' })] })
    const mock = createQueryClientMock(live)
    applyRealtimeEnvelope(qc(mock), {
      event: 'mesa.upserted',
      payload: { businessDate: '2026-03-30', mesa: mesa({ id: 'm-1', status: 'ocupada' }) },
    })
    expect(mock.getLiveSnapshot().mesas[0]?.status).toBe('ocupada')
  })

  it('adds new mesa from full record', () => {
    const mock = createQueryClientMock(liveSnapshot())
    applyRealtimeEnvelope(qc(mock), {
      event: 'mesa.upserted',
      payload: { businessDate: '2026-03-30', mesa: mesa({ id: 'm-new', label: 'Mesa Nova' }) },
    })
    expect(mock.getLiveSnapshot().mesas.some((m) => m.id === 'm-new')).toBe(true)
  })

  it('patches mesa status from flat fields (mesaId + status)', () => {
    const live = liveSnapshot({ mesas: [mesa({ id: 'm-1', status: 'livre' })] })
    const mock = createQueryClientMock(live)
    applyRealtimeEnvelope(qc(mock), {
      event: 'mesa.upserted',
      payload: { businessDate: '2026-03-30', mesaId: 'm-1', status: 'reservada' },
    })
    expect(mock.getLiveSnapshot().mesas[0]?.status).toBe('reservada')
  })

  it('patches mesa status from mesaLabel when mesaId not present', () => {
    const live = liveSnapshot({ mesas: [mesa({ id: 'm-1', label: 'Mesa 1', status: 'livre' })] })
    const mock = createQueryClientMock(live)
    applyRealtimeEnvelope(qc(mock), {
      event: 'mesa.upserted',
      payload: { businessDate: '2026-03-30', mesaLabel: 'Mesa 1', status: 'ocupada' },
    })
    expect(mock.getLiveSnapshot().mesas[0]?.status).toBe('ocupada')
  })

  it('maps all mesa statuses correctly', () => {
    const mock = createQueryClientMock(liveSnapshot({ mesas: [mesa()] }))
    for (const status of ['livre', 'ocupada', 'reservada']) {
      applyRealtimeEnvelope(qc(mock), { event: 'mesa.upserted', payload: { businessDate: '2026-03-30', mesaId: 'm-1', status } })
      expect(mock.getLiveSnapshot().mesas[0]?.status).toBe(status)
    }
  })

  it('returns liveNeedsRefresh for invalid mesa payload', () => {
    const mock = createQueryClientMock(liveSnapshot())
    const result = applyRealtimeEnvelope(qc(mock), { event: 'mesa.upserted', payload: { businessDate: '2026-03-30' } })
    expect(result.liveNeedsRefresh).toBe(true)
  })

  it('returns liveNeedsRefresh when status is invalid', () => {
    const mock = createQueryClientMock(liveSnapshot({ mesas: [mesa()] }))
    const result = applyRealtimeEnvelope(qc(mock), { event: 'mesa.upserted', payload: { businessDate: '2026-03-30', mesaId: 'm-1', status: 'INVALID' } })
    expect(result.liveNeedsRefresh).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// withGroupMetrics (computed via patches)
// ---------------------------------------------------------------------------

describe('withGroupMetrics (computed via patches)', () => {
  it('counts open and closed tables after comanda update', () => {
    const live = liveSnapshot({
      employees: [{
        employeeId: 'emp-1', employeeCode: 'E01', displayName: 'Joao', active: true,
        cashSession: null,
        comandas: [
          { id: 'c-1', companyOwnerId: 'owner-1', cashSessionId: null, mesaId: 'm-1', currentEmployeeId: 'emp-1', tableLabel: 'Mesa 1', customerName: null, customerDocument: null, participantCount: 1, status: 'OPEN', subtotalAmount: 50, discountAmount: 0, serviceFeeAmount: 0, totalAmount: 50, notes: null, openedAt: '2026-03-30T10:00:00.000Z', closedAt: null, items: [] },
          { id: 'c-2', companyOwnerId: 'owner-1', cashSessionId: null, mesaId: 'm-2', currentEmployeeId: 'emp-1', tableLabel: 'Mesa 2', customerName: null, customerDocument: null, participantCount: 2, status: 'CLOSED', subtotalAmount: 30, discountAmount: 0, serviceFeeAmount: 0, totalAmount: 30, notes: null, openedAt: '2026-03-30T09:00:00.000Z', closedAt: '2026-03-30T11:00:00.000Z', items: [] },
        ],
      }],
    })
    const mock = createQueryClientMock(live)
    applyRealtimeEnvelope(qc(mock), {
      event: 'comanda.updated',
      payload: { comandaId: 'c-1', mesaId: 'm-1', tableLabel: 'Mesa 1', status: 'IN_PREPARATION', businessDate: '2026-03-30' },
    })
    // After patch, emp-1 should have 1 open (c-1 IN_PREPARATION) and 1 closed (c-2)
    const emp = mock.getLiveSnapshot().employees[0]
    expect(emp.comandas.length).toBe(2)
  })
})
