'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import type { OperationsLiveResponse, OperationsSummaryResponse } from '@contracts/contracts'
import { toast } from 'sonner'
import {
  fetchUserNotificationPreferences,
  USER_NOTIFICATION_PREFERENCES_QUERY_KEY,
  type UserNotificationPreference,
} from '@/lib/api'
import { OPERATIONS_LIVE_COMPACT_QUERY_KEY, OPERATIONS_SUMMARY_QUERY_KEY } from '@/lib/operations/operations-query'
import {
  OPERATIONS_EVENTS,
  type OperationsRealtimeEnvelope,
  type RealtimeStatus,
  useOperationsSocket,
} from './hooks/use-operations-socket'
import { syncSummarySnapshotFromLive } from '@/lib/operations/operations-realtime-patching'
import type { NotifiedEnvelopeIds } from './operations-realtime-notifications'
import { useOperationsRealtimeBaseline } from './use-operations-realtime-baseline'
import { useOperationsRealtimeHandler } from './use-operations-realtime-handler'
import { useOperationsRealtimeQueues } from './use-operations-realtime-queues'

export type { RealtimeStatus } from './hooks/use-operations-socket'
export { OPERATIONS_EVENTS }
export { applyRealtimeEnvelope } from '@/lib/operations/operations-realtime-patching'

type UseOperationsRealtimeOptions = {
  currentUserId?: string | null
  notificationChannel?: UserNotificationPreference['channel'] | null
}

function useOperationsRealtimePreferences(
  enabled: boolean,
  notificationChannel: UserNotificationPreference['channel'] | null,
  queryClient: QueryClient,
) {
  useEffect(() => {
    if (!(enabled && notificationChannel)) {
      return
    }

    void queryClient.fetchQuery({
      queryKey: [...USER_NOTIFICATION_PREFERENCES_QUERY_KEY],
      queryFn: fetchUserNotificationPreferences,
      staleTime: 30_000,
    })
  }, [enabled, notificationChannel, queryClient])
}

function useOperationsSummarySync(queryClient: QueryClient) {
  return useCallback(() => {
    const liveSnapshot = queryClient.getQueryData<OperationsLiveResponse>(OPERATIONS_LIVE_COMPACT_QUERY_KEY)
    const summarySnapshot = queryClient.getQueryData<OperationsSummaryResponse>(OPERATIONS_SUMMARY_QUERY_KEY)
    const nextSummarySnapshot = syncSummarySnapshotFromLive(summarySnapshot, liveSnapshot)

    if (!nextSummarySnapshot) {
      return false
    }

    queryClient.setQueryData(OPERATIONS_SUMMARY_QUERY_KEY, nextSummarySnapshot)
    return true
  }, [queryClient])
}

export function useOperationsRealtime(
  enabled: boolean,
  queryClient: QueryClient,
  options: UseOperationsRealtimeOptions = {},
): { status: RealtimeStatus } {
  const currentUserId = options.currentUserId ?? null
  const notificationChannel = options.notificationChannel ?? null
  const notifiedEnvelopeIdsRef = useRef<NotifiedEnvelopeIds>({ set: new Set(), order: [] })
  // Idempotência de patch: dedup por envelope.id em janela FIFO (cap em MAX_PROCESSED_ENVELOPE_IDS).
  const processedEnvelopeIdsRef = useRef<Set<string>>(new Set())
  const processedEnvelopeIdsOrderRef = useRef<string[]>([])
  // Reidratação REST: durante refreshBaseline, envelopes WS são bufferizados e drenados na ordem após o refetch resolver.
  const isSyncingRef = useRef(false)
  const reidratationBufferRef = useRef<OperationsRealtimeEnvelope[]>([])
  // Permite refreshBaseline drenar via handleEvent sem criar dependência circular no useCallback.
  const handleEventRef = useRef<(envelope?: OperationsRealtimeEnvelope) => void>(() => {})
  const { queueCommercialRefresh, queueKitchenRefresh, queueOperationsRefresh, queueSummaryRefresh } =
    useOperationsRealtimeQueues(queryClient)

  useOperationsRealtimePreferences(enabled, notificationChannel, queryClient)
  const refreshBaseline = useOperationsRealtimeBaseline({
    handleEventRef,
    isSyncingRef,
    processedEnvelopeIdsOrderRef,
    processedEnvelopeIdsRef,
    queryClient,
    reidratationBufferRef,
  })
  const syncSummaryFromLive = useOperationsSummarySync(queryClient)

  const handleEvent = useOperationsRealtimeHandler({
    currentUserId,
    isSyncingRef,
    notificationChannel,
    notifiedEnvelopeIdsRef,
    processedEnvelopeIdsOrderRef,
    processedEnvelopeIdsRef,
    queryClient,
    queueCommercialRefresh,
    queueKitchenRefresh,
    queueOperationsRefresh,
    queueSummaryRefresh,
    reidratationBufferRef,
    syncSummaryFromLive,
  })

  const handleSocketError = useCallback((message: string) => {
    toast.error(message)
  }, [])

  useEffect(() => {
    handleEventRef.current = handleEvent
  }, [handleEvent])

  const { status } = useOperationsSocket(enabled, handleEvent, refreshBaseline, handleSocketError)

  return { status }
}
