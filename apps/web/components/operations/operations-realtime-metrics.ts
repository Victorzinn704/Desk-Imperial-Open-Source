import { recordOperationsRealtimeEnvelopeProcessed } from '@/lib/operations/operations-performance-diagnostics'
import type { applyRealtimeEnvelope } from '@/lib/operations/operations-realtime-patching'
import type { OperationsRealtimeEnvelope } from './hooks/use-operations-socket'
import { afterNextPaint, now, parseRealtimeEnvelopeCreatedAt } from './operations-realtime-utils'

type PatchResult = ReturnType<typeof applyRealtimeEnvelope>

export function recordRealtimeEnvelopeProcessing(
  envelope: OperationsRealtimeEnvelope,
  isSelfEvent: boolean,
  startedAt: number,
  patchResult: PatchResult,
) {
  const durationMs = Math.max(0, now() - startedAt)
  const deliveryDelayMs = resolveRealtimeDeliveryDelayMs(envelope)

  afterNextPaint(() => {
    recordOperationsRealtimeEnvelopeProcessed({
      event: envelope.event,
      isSelfEvent,
      durationMs,
      deliveryDelayMs,
      paintDelayMs: Math.max(0, now() - startedAt),
      livePatched: patchResult.livePatched,
      liveNeedsRefresh: patchResult.liveNeedsRefresh,
      kitchenPatched: patchResult.kitchenPatched,
      kitchenNeedsRefresh: patchResult.kitchenNeedsRefresh,
      summaryPatched: patchResult.summaryPatched,
      summaryNeedsRefresh: patchResult.summaryNeedsRefresh,
    })
  })
}

function resolveRealtimeDeliveryDelayMs(envelope: OperationsRealtimeEnvelope) {
  const createdAtMs = parseRealtimeEnvelopeCreatedAt(envelope.createdAt)
  if (createdAtMs == null) {
    return null
  }

  return Math.max(0, Date.now() - createdAtMs)
}
