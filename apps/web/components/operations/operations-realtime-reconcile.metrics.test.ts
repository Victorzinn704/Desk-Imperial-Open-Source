import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getOperationsPerformanceEvents,
  resetOperationsPerformanceEvents,
} from '@/lib/operations/operations-performance-diagnostics'
import type { OperationsRealtimeEnvelope } from './hooks/use-operations-socket'
import { recordRealtimeEnvelopeProcessing } from './operations-realtime-metrics'

const EMPTY_PATCH_RESULT = {
  liveNeedsRefresh: false,
  livePatched: false,
  kitchenNeedsRefresh: false,
  kitchenPatched: false,
  summaryNeedsRefresh: false,
  summaryPatched: false,
}

describe('operations realtime reconcile metrics', () => {
  beforeEach(() => {
    resetOperationsPerformanceEvents()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-07T12:00:10.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('mede atraso de entrega a partir do createdAt do envelope', () => {
    recordRealtimeEnvelopeProcessing(buildEnvelope(), false, performance.now(), EMPTY_PATCH_RESULT)
    vi.advanceTimersByTime(16)

    expect(getOperationsPerformanceEvents()).toContainEqual({
      type: 'realtime-envelope-processed',
      at: expect.any(Number),
      event: 'kitchen.item.queued',
      isSelfEvent: false,
      durationMs: expect.any(Number),
      deliveryDelayMs: 10_000,
      paintDelayMs: expect.any(Number),
      ...EMPTY_PATCH_RESULT,
    })
  })
})

function buildEnvelope(): OperationsRealtimeEnvelope {
  return {
    createdAt: '2026-05-07T12:00:00.000Z',
    event: 'kitchen.item.queued',
    id: 'evt-kitchen-1',
    payload: {
      businessDate: '2026-05-07',
      comandaId: 'comanda-1',
      itemId: 'item-1',
    },
  }
}
