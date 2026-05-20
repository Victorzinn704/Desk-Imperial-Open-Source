import type { QueryClient } from '@tanstack/react-query'
import type { OperationsLiveResponse } from '@contracts/contracts'
import {
  OPERATIONS_KITCHEN_QUERY_KEY,
  OPERATIONS_LIVE_COMPACT_QUERY_KEY,
  OPERATIONS_LIVE_QUERY_PREFIX,
  OPERATIONS_SUMMARY_QUERY_KEY,
  settleScheduledOperationsWorkspaceReconcile,
} from '@/lib/operations/operations-query'
import {
  detectOperationsRealtimeEnvelopeOutOfOrder,
  recordOperationsRealtimeEnvelopeDropped,
  recordOperationsRealtimeEnvelopeOutOfOrder,
} from '@/lib/operations/operations-performance-diagnostics'
import {
  type applyRealtimeEnvelope,
  requiresKitchenRefresh,
  requiresSummaryRefresh,
} from '@/lib/operations/operations-realtime-patching'
import type { OperationsRealtimeEnvelope } from './hooks/use-operations-socket'
import {
  parseRealtimeEnvelopeCreatedAt,
  readString,
  resolveRealtimeEnvelopeEntityKey,
} from './operations-realtime-utils'

const MAX_PROCESSED_ENVELOPE_IDS = 200
const MAX_REIDRATATION_BUFFER = 100

type PatchResult = ReturnType<typeof applyRealtimeEnvelope>

export type RefreshQueues = {
  queueKitchenRefresh: () => void
  queueOperationsRefresh: () => void
  queueSummaryRefresh: () => void
}

export function queueRealtimeFallbackRefreshes({
  queueOperationsRefresh,
  queueKitchenRefresh,
  queueSummaryRefresh,
}: RefreshQueues) {
  queueOperationsRefresh()
  queueKitchenRefresh()
  queueSummaryRefresh()
}

export function bufferRealtimeEnvelopeDuringSync(
  envelope: OperationsRealtimeEnvelope,
  isSyncing: boolean,
  buffer: OperationsRealtimeEnvelope[],
) {
  if (!isSyncing) {
    return false
  }

  if (buffer.length < MAX_REIDRATATION_BUFFER) {
    buffer.push(envelope)
    return true
  }

  recordOperationsRealtimeEnvelopeDropped({
    event: envelope.event,
    entityKey: resolveRealtimeEnvelopeEntityKey(envelope),
    reason: 'buffer-overflow',
  })
  return true
}

export function dropDuplicateRealtimeEnvelope(envelope: OperationsRealtimeEnvelope, processedIds: Set<string>) {
  if (!(envelope.id && processedIds.has(envelope.id))) {
    return false
  }

  recordOperationsRealtimeEnvelopeDropped({
    event: envelope.event,
    entityKey: resolveRealtimeEnvelopeEntityKey(envelope),
    reason: 'duplicate-id',
  })
  return true
}

export function dropStaleBusinessDateEnvelope(queryClient: QueryClient, envelope: OperationsRealtimeEnvelope) {
  const envelopeBusinessDate = readString(envelope.payload.businessDate)
  if (!envelopeBusinessDate) {
    return false
  }

  const liveSnapshot = queryClient.getQueryData<OperationsLiveResponse>(OPERATIONS_LIVE_COMPACT_QUERY_KEY)
  if (!(liveSnapshot?.businessDate && liveSnapshot.businessDate !== envelopeBusinessDate)) {
    return false
  }

  recordOperationsRealtimeEnvelopeDropped({
    event: envelope.event,
    entityKey: resolveRealtimeEnvelopeEntityKey(envelope),
    reason: 'stale-business-date',
  })
  return true
}

export function recordRealtimeEnvelopeOrdering(envelope: OperationsRealtimeEnvelope) {
  const entityKey = resolveRealtimeEnvelopeEntityKey(envelope)
  if (!entityKey) {
    return entityKey
  }

  const eventCreatedAtMs = parseRealtimeEnvelopeCreatedAt(envelope.createdAt)
  if (eventCreatedAtMs == null) {
    return entityKey
  }

  const outOfOrderLastSeenAt = detectOperationsRealtimeEnvelopeOutOfOrder(entityKey, eventCreatedAtMs)
  if (outOfOrderLastSeenAt == null) {
    return entityKey
  }

  recordOperationsRealtimeEnvelopeOutOfOrder({
    event: envelope.event,
    entityKey,
    eventCreatedAtMs,
    lastSeenCreatedAtMs: outOfOrderLastSeenAt,
  })

  return entityKey
}

export function isSelfRealtimeEnvelope(envelope: OperationsRealtimeEnvelope, currentUserId: string | null) {
  return Boolean(currentUserId && envelope.actorUserId && currentUserId === envelope.actorUserId)
}

export function settleSelfEventReconcile({
  queryClient,
  envelope,
  isSelfEvent,
  patchResult,
  summarySyncedFromLive,
}: {
  queryClient: QueryClient
  envelope: OperationsRealtimeEnvelope
  isSelfEvent: boolean
  patchResult: PatchResult
  summarySyncedFromLive: boolean
}) {
  if (!isSelfEvent) {
    return
  }

  const satisfiedLive = patchResult.livePatched && !patchResult.liveNeedsRefresh
  const satisfiedKitchen =
    requiresKitchenRefresh(envelope) && patchResult.kitchenPatched && !patchResult.kitchenNeedsRefresh
  const satisfiedSummary = isSatisfiedSummaryReconcile(envelope, patchResult, summarySyncedFromLive)

  const hasSatisfiedReconcile = [satisfiedLive, satisfiedKitchen, satisfiedSummary].some(Boolean)
  if (!hasSatisfiedReconcile) {
    return
  }

  settleScheduledOperationsWorkspaceReconcile(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
    includeLive: satisfiedLive,
    includeKitchen: satisfiedKitchen,
    includeSummary: satisfiedSummary,
  })
}

export function queueRealtimeRefreshesAfterPatch({
  envelope,
  patchResult,
  summarySyncedFromLive,
  queueOperationsRefresh,
  queueKitchenRefresh,
  queueSummaryRefresh,
}: RefreshQueues & {
  envelope: OperationsRealtimeEnvelope
  patchResult: PatchResult
  summarySyncedFromLive: boolean
}) {
  if (shouldRefreshLiveAfterPatch(patchResult)) {
    queueOperationsRefresh()
  }

  if (shouldRefreshKitchenAfterPatch(envelope, patchResult)) {
    queueKitchenRefresh()
  }

  if (shouldRefreshSummaryAfterPatch(envelope, patchResult, summarySyncedFromLive)) {
    queueSummaryRefresh()
  }
}

export function recordNoApplicableSnapshotDrop(
  queryClient: QueryClient,
  envelope: OperationsRealtimeEnvelope,
  entityKey: string | null,
  patchResult: PatchResult,
) {
  if (!shouldRecordDroppedRealtimeEnvelope(queryClient, patchResult)) {
    return
  }

  recordOperationsRealtimeEnvelopeDropped({
    event: envelope.event,
    entityKey,
    reason: 'no-applicable-snapshot',
  })
}

export function shouldQueueCommercialRefresh(envelope: OperationsRealtimeEnvelope, isSelfEvent: boolean) {
  return envelope.event === 'comanda.closed' && !isSelfEvent
}

export function rememberProcessedRealtimeEnvelope(
  envelope: OperationsRealtimeEnvelope,
  processedIds: Set<string>,
  processedOrder: string[],
) {
  if (!envelope.id) {
    return
  }

  processedIds.add(envelope.id)
  processedOrder.push(envelope.id)
  while (processedOrder.length > MAX_PROCESSED_ENVELOPE_IDS) {
    const evicted = processedOrder.shift()
    if (evicted) {
      processedIds.delete(evicted)
    }
  }
}

function getSummaryReconcileState(
  envelope: OperationsRealtimeEnvelope,
  patchResult: PatchResult,
  summarySyncedFromLive: boolean,
) {
  if (!requiresSummaryRefresh(envelope.event)) {
    return { satisfied: false, shouldRefresh: false }
  }

  if (summarySyncedFromLive) {
    return { satisfied: true, shouldRefresh: false }
  }

  if (patchResult.summaryPatched && !patchResult.summaryNeedsRefresh) {
    return { satisfied: true, shouldRefresh: false }
  }

  return { satisfied: false, shouldRefresh: true }
}

function isSatisfiedSummaryReconcile(
  envelope: OperationsRealtimeEnvelope,
  patchResult: PatchResult,
  summarySyncedFromLive: boolean,
) {
  return getSummaryReconcileState(envelope, patchResult, summarySyncedFromLive).satisfied
}

function shouldRefreshLiveAfterPatch(patchResult: PatchResult) {
  return !patchResult.livePatched || patchResult.liveNeedsRefresh
}

function shouldRefreshKitchenAfterPatch(envelope: OperationsRealtimeEnvelope, patchResult: PatchResult) {
  return requiresKitchenRefresh(envelope) && (!patchResult.kitchenPatched || patchResult.kitchenNeedsRefresh)
}

function shouldRefreshSummaryAfterPatch(
  envelope: OperationsRealtimeEnvelope,
  patchResult: PatchResult,
  summarySyncedFromLive: boolean,
) {
  return getSummaryReconcileState(envelope, patchResult, summarySyncedFromLive).shouldRefresh
}

function shouldRecordDroppedRealtimeEnvelope(queryClient: QueryClient, patchResult: PatchResult) {
  if (hasRelevantPatchOutcome(patchResult)) {
    return false
  }

  const hasActiveLiveSnapshot = queryClient
    .getQueriesData<OperationsLiveResponse>({
      queryKey: OPERATIONS_LIVE_QUERY_PREFIX,
    })
    .some(([, snapshot]) => Boolean(snapshot))
  const hasActiveKitchenSnapshot = Boolean(queryClient.getQueryData(OPERATIONS_KITCHEN_QUERY_KEY))
  const hasActiveSummarySnapshot = Boolean(queryClient.getQueryData(OPERATIONS_SUMMARY_QUERY_KEY))

  return hasActiveLiveSnapshot || hasActiveKitchenSnapshot || hasActiveSummarySnapshot
}

function hasRelevantPatchOutcome(patchResult: PatchResult) {
  return [
    patchResult.livePatched,
    patchResult.kitchenPatched,
    patchResult.summaryPatched,
    patchResult.liveNeedsRefresh,
    patchResult.kitchenNeedsRefresh,
    patchResult.summaryNeedsRefresh,
  ].some(Boolean)
}
