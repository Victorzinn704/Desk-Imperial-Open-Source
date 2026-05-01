import { describe, expect, it } from 'vitest'
import { applyRealtimeEnvelope } from './use-operations-realtime'
import {
  comanda,
  comandaItem,
  kitchenItem,
  kitchenSnapshot,
  liveSnapshot,
  createQueryClientMock,
  qc,
} from './__fixtures__/operations-realtime.fixtures'

// ---------------------------------------------------------------------------
// kitchen.item.queued
// ---------------------------------------------------------------------------

describe('kitchen.item.queued', () => {
  it('adds new item to kitchen snapshot with QUEUED status', () => {
    const mock = createQueryClientMock(liveSnapshot(), kitchenSnapshot())
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
    const live = liveSnapshot()
    live.unassigned.comandas.push(comanda({ id: 'comanda-1' }))
    const mock = createQueryClientMock(live, kitchenSnapshot())
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
    const mock = createQueryClientMock(liveSnapshot(), kitchenSnapshot())
    const result = applyRealtimeEnvelope(qc(mock), {
      event: 'kitchen.item.queued',
      payload: { businessDate: '2026-03-30' },
    })
    expect(result.liveNeedsRefresh).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// kitchen.item.updated
// ---------------------------------------------------------------------------

describe('kitchen.item.updated', () => {
  it('updates existing item status in kitchen snapshot', () => {
    const mock = createQueryClientMock(liveSnapshot(), kitchenSnapshot())
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
    const mock = createQueryClientMock(liveSnapshot(), kitchenSnapshot())
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
    expect(mock.getKitchenSnapshot()?.items).toHaveLength(0)
  })

  it('does not inject zero-priced item into compact comanda', () => {
    const live = liveSnapshot()
    live.unassigned.comandas.push(comanda({ id: 'comanda-1', totalAmount: 32, items: [] }))
    const mock = createQueryClientMock(live, kitchenSnapshot())
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
    const live = liveSnapshot()
    live.unassigned.comandas.push(
      comanda({
        id: 'comanda-1',
        items: [comandaItem({ id: 'item-1', productName: 'Pizza', kitchenStatus: 'QUEUED' })],
      }),
    )
    const mock = createQueryClientMock(live, kitchenSnapshot())
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
    const snap = mock.getLiveSnapshot()
    expect(snap.unassigned.comandas[0]?.items[0]?.kitchenStatus).toBe('IN_PREPARATION')
  })
})

// ---------------------------------------------------------------------------
// kitchen replacement via comanda.updated
// ---------------------------------------------------------------------------

describe('kitchen replacement via comanda.updated', () => {
  it('replaces kitchen items without broad refetch', () => {
    const kitchen = kitchenSnapshot({
      items: [kitchenItem({ itemId: 'old-1', comandaId: 'c-1' }), kitchenItem({ itemId: 'old-2', comandaId: 'c-1' })],
      statusCounts: { queued: 2, inPreparation: 0, ready: 0 },
    })
    const mock = createQueryClientMock(liveSnapshot(), kitchen)
    const result = applyRealtimeEnvelope(qc(mock), {
      event: 'comanda.updated',
      payload: {
        comandaId: 'c-1',
        tableLabel: 'Mesa 1',
        status: 'IN_PREPARATION',
        businessDate: '2026-03-30',
        replaceKitchenItems: true,
        items: [comandaItem({ id: 'new-1', productName: 'Burger', kitchenStatus: 'QUEUED' })],
      },
    })
    expect(result.kitchenPatched).toBe(true)
    const ks = mock.getKitchenSnapshot()!
    expect(ks.items).toHaveLength(1)
    expect(ks.items[0].itemId).toBe('new-1')
  })

  it('filters out delivered items during replacement', () => {
    const kitchen = kitchenSnapshot({
      items: [kitchenItem({ itemId: 'old-1', comandaId: 'c-1' })],
      statusCounts: { queued: 1, inPreparation: 0, ready: 0 },
    })
    const mock = createQueryClientMock(liveSnapshot(), kitchen)
    applyRealtimeEnvelope(qc(mock), {
      event: 'comanda.updated',
      payload: {
        comandaId: 'c-1',
        tableLabel: 'Mesa 1',
        status: 'IN_PREPARATION',
        businessDate: '2026-03-30',
        replaceKitchenItems: true,
        items: [comandaItem({ id: 'new-1', productName: 'Burger', kitchenStatus: 'DELIVERED' })],
      },
    })
    expect(mock.getKitchenSnapshot()?.items).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// buildKitchenItemFromPayload
// ---------------------------------------------------------------------------

describe('buildKitchenItemFromPayload', () => {
  it('uses legacy item object from payload.item', () => {
    const mock = createQueryClientMock(liveSnapshot(), kitchenSnapshot({ items: [] }))
    const result = applyRealtimeEnvelope(qc(mock), {
      event: 'kitchen.item.queued',
      payload: {
        businessDate: '2026-03-30',
        item: comandaItem({ id: 'item-legacy', productName: 'Legacy', kitchenStatus: 'QUEUED' }),
        comandaId: 'c-1',
        mesaLabel: 'Mesa 1',
        quantity: 1,
      },
    })
    expect(result.kitchenPatched).toBe(true)
    expect(mock.getKitchenSnapshot()?.items.some((i) => i.itemId === 'item-legacy')).toBe(true)
  })

  it('returns null (no patch) when required fields are missing', () => {
    const mock = createQueryClientMock(liveSnapshot(), kitchenSnapshot())
    const result = applyRealtimeEnvelope(qc(mock), {
      event: 'kitchen.item.queued',
      payload: { businessDate: '2026-03-30' },
    })
    expect(result.kitchenPatched).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// kitchen item sorting
// ---------------------------------------------------------------------------

describe('kitchen item sorting', () => {
  it('sorts items by kitchenQueuedAt after patch', () => {
    const kitchen = kitchenSnapshot({
      items: [
        kitchenItem({ itemId: 'i-1', kitchenQueuedAt: '2026-03-30T10:05:00.000Z' }),
        kitchenItem({ itemId: 'i-2', kitchenQueuedAt: '2026-03-30T10:00:00.000Z' }),
      ],
      statusCounts: { queued: 2, inPreparation: 0, ready: 0 },
    })
    const mock = createQueryClientMock(liveSnapshot(), kitchen)
    applyRealtimeEnvelope(qc(mock), {
      event: 'kitchen.item.queued',
      payload: {
        itemId: 'i-3',
        comandaId: 'c-1',
        productName: 'New',
        mesaLabel: 'Mesa 1',
        quantity: 1,
        employeeId: null,
        employeeName: 'Op',
        businessDate: '2026-03-30',
        kitchenQueuedAt: '2026-03-30T10:02:00.000Z',
      },
    })
    const kitchenAfterPatch = mock.getKitchenSnapshot()
    expect(kitchenAfterPatch).toBeDefined()
    const items = kitchenAfterPatch!.items
    expect(items[0].itemId).toBe('i-2')
    expect(items[1].itemId).toBe('i-3')
    expect(items[2].itemId).toBe('i-1')
  })
})

// ---------------------------------------------------------------------------
// buildKitchenStatusCounts
// ---------------------------------------------------------------------------

describe('buildKitchenStatusCounts', () => {
  it('recomputes counts after status transitions', () => {
    const kitchen = kitchenSnapshot({
      items: [
        kitchenItem({ itemId: 'i-1', kitchenStatus: 'QUEUED' }),
        kitchenItem({ itemId: 'i-2', kitchenStatus: 'IN_PREPARATION' }),
        kitchenItem({ itemId: 'i-3', kitchenStatus: 'READY' }),
      ],
      statusCounts: { queued: 1, inPreparation: 1, ready: 1 },
    })
    const mock = createQueryClientMock(liveSnapshot(), kitchen)

    // Transition i-1 to IN_PREPARATION
    applyRealtimeEnvelope(qc(mock), {
      event: 'kitchen.item.updated',
      payload: {
        itemId: 'i-1',
        comandaId: 'c-1',
        mesaLabel: 'Mesa 1',
        productName: 'P1',
        quantity: 1,
        kitchenStatus: 'IN_PREPARATION',
        businessDate: '2026-03-30',
      },
    })
    let kitchenAfterPatch = mock.getKitchenSnapshot()
    expect(kitchenAfterPatch).toBeDefined()
    let sc = kitchenAfterPatch!.statusCounts
    expect(sc.queued).toBe(0)
    expect(sc.inPreparation).toBe(2)
    expect(sc.ready).toBe(1)

    // Transition i-2 to DELIVERED (removes it)
    applyRealtimeEnvelope(qc(mock), {
      event: 'kitchen.item.updated',
      payload: {
        itemId: 'i-2',
        comandaId: 'c-1',
        mesaLabel: 'Mesa 1',
        productName: 'P2',
        quantity: 1,
        kitchenStatus: 'DELIVERED',
        businessDate: '2026-03-30',
      },
    })
    kitchenAfterPatch = mock.getKitchenSnapshot()
    expect(kitchenAfterPatch).toBeDefined()
    sc = kitchenAfterPatch!.statusCounts
    expect(sc.queued).toBe(0)
    expect(sc.inPreparation).toBe(1)
    expect(sc.ready).toBe(1)
  })
})
