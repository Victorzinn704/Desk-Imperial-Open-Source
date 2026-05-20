'use client'

import { type MutableRefObject, useCallback } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import type { UserNotificationPreference } from '@/lib/api'
import { applyRealtimeEnvelope } from '@/lib/operations/operations-realtime-patching'
import type { OperationsRealtimeEnvelope } from './hooks/use-operations-socket'
import { maybeNotifyRealtimeStatusChange, type NotifiedEnvelopeIds } from './operations-realtime-notifications'
import {
  bufferRealtimeEnvelopeDuringSync,
  dropDuplicateRealtimeEnvelope,
  dropStaleBusinessDateEnvelope,
  isSelfRealtimeEnvelope,
  queueRealtimeFallbackRefreshes,
  queueRealtimeRefreshesAfterPatch,
  recordNoApplicableSnapshotDrop,
  recordRealtimeEnvelopeOrdering,
  type RefreshQueues,
  rememberProcessedRealtimeEnvelope,
  settleSelfEventReconcile,
  shouldQueueCommercialRefresh,
} from './operations-realtime-reconcile'
import { recordRealtimeEnvelopeProcessing } from './operations-realtime-metrics'
import { now } from './operations-realtime-utils'

type OperationsRealtimeHandlerParams = RefreshQueues &
  Readonly<{
    currentUserId: string | null
    isSyncingRef: MutableRefObject<boolean>
    notificationChannel: UserNotificationPreference['channel'] | null
    notifiedEnvelopeIdsRef: MutableRefObject<NotifiedEnvelopeIds>
    processedEnvelopeIdsOrderRef: MutableRefObject<string[]>
    processedEnvelopeIdsRef: MutableRefObject<Set<string>>
    queryClient: QueryClient
    queueCommercialRefresh: () => void
    reidratationBufferRef: MutableRefObject<OperationsRealtimeEnvelope[]>
    syncSummaryFromLive: () => boolean
  }>

export function useOperationsRealtimeHandler(params: OperationsRealtimeHandlerParams) {
  return useCallback(
    (envelope?: OperationsRealtimeEnvelope) => {
      if (!envelope) {
        queueRealtimeFallbackRefreshes(params)
        return
      }

      if (shouldSkipRealtimeEnvelope(envelope, params)) {
        return
      }

      processRealtimeEnvelope(envelope, params)
    },
    [params],
  )
}

function shouldSkipRealtimeEnvelope(envelope: OperationsRealtimeEnvelope, params: OperationsRealtimeHandlerParams) {
  if (bufferRealtimeEnvelopeDuringSync(envelope, params.isSyncingRef.current, params.reidratationBufferRef.current)) {
    return true
  }

  if (dropDuplicateRealtimeEnvelope(envelope, params.processedEnvelopeIdsRef.current)) {
    return true
  }

  return dropStaleBusinessDateEnvelope(params.queryClient, envelope)
}

function processRealtimeEnvelope(envelope: OperationsRealtimeEnvelope, params: OperationsRealtimeHandlerParams) {
  const startedAt = now()
  const entityKey = recordRealtimeEnvelopeOrdering(envelope)
  const isSelfEvent = isSelfRealtimeEnvelope(envelope, params.currentUserId)

  maybeNotifyRealtimeStatusChange(
    envelope,
    params.currentUserId,
    params.notifiedEnvelopeIdsRef.current,
    params.notificationChannel,
    params.queryClient,
  )

  const patchResult = applyRealtimeEnvelope(params.queryClient, envelope)
  const summarySyncedFromLive = patchResult.livePatched ? params.syncSummaryFromLive() : false

  settleSelfEventReconcile({
    queryClient: params.queryClient,
    envelope,
    isSelfEvent,
    patchResult,
    summarySyncedFromLive,
  })
  queueRealtimeRefreshesAfterPatch({ ...params, envelope, patchResult, summarySyncedFromLive })
  recordNoApplicableSnapshotDrop(params.queryClient, envelope, entityKey, patchResult)

  if (shouldQueueCommercialRefresh(envelope, isSelfEvent)) {
    params.queueCommercialRefresh()
  }

  rememberProcessedRealtimeEnvelope(
    envelope,
    params.processedEnvelopeIdsRef.current,
    params.processedEnvelopeIdsOrderRef.current,
  )
  recordRealtimeEnvelopeProcessing(envelope, isSelfEvent, startedAt, patchResult)
}
