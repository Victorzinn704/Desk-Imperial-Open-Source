'use client'

import { useCallback, useRef } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import type { OperationsLiveResponse, OperationsSummaryResponse } from '@contracts/contracts'
import {
  OPERATIONS_KITCHEN_QUERY_KEY,
  OPERATIONS_LIVE_COMPACT_QUERY_KEY,
  OPERATIONS_LIVE_QUERY_PREFIX,
  OPERATIONS_SUMMARY_QUERY_KEY,
  invalidateOperationsWorkspace,
} from '@/lib/operations/operations-query'
import { OPERATIONS_EVENTS, type OperationsRealtimeEnvelope, type RealtimeStatus, useOperationsSocket } from './hooks/use-operations-socket'
import {
  applyRealtimeEnvelope,
  requiresKitchenRefresh,
  requiresSummaryRefresh,
  syncSummarySnapshotFromLive,
} from '@/lib/operations/operations-realtime-patching'

// Debounce para operações (200ms) e comercial (500ms para coalescer múltiplos closes)
const OPERATIONS_DEBOUNCE_MS = 200
const COMMERCIAL_DEBOUNCE_MS = 500
const SUMMARY_DEBOUNCE_MS = 1_500

export type { RealtimeStatus } from './hooks/use-operations-socket'
export { OPERATIONS_EVENTS }
export { applyRealtimeEnvelope } from '@/lib/operations/operations-realtime-patching'

export function useOperationsRealtime(enabled: boolean, queryClient: QueryClient): { status: RealtimeStatus } {
  const operationsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const kitchenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const summaryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const commercialTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refreshBaseline = useCallback(() => {
    void invalidateOperationsWorkspace(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
      includeOrders: true,
      includeFinance: true,
    })
    void queryClient.invalidateQueries({ queryKey: ['mesas'] })
  }, [queryClient])

  const queueOperationsRefresh = useCallback(() => {
    if (operationsTimerRef.current) {clearTimeout(operationsTimerRef.current)}
    operationsTimerRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: OPERATIONS_LIVE_QUERY_PREFIX })
      queryClient.invalidateQueries({ queryKey: ['mesas'] })
    }, OPERATIONS_DEBOUNCE_MS)
  }, [queryClient])

  const queueCommercialRefresh = useCallback(() => {
    if (commercialTimerRef.current) {clearTimeout(commercialTimerRef.current)}
    commercialTimerRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] })
    }, COMMERCIAL_DEBOUNCE_MS)
  }, [queryClient])

  const queueKitchenRefresh = useCallback(() => {
    if (kitchenTimerRef.current) {clearTimeout(kitchenTimerRef.current)}
    kitchenTimerRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: OPERATIONS_KITCHEN_QUERY_KEY })
    }, OPERATIONS_DEBOUNCE_MS)
  }, [queryClient])

  const queueSummaryRefresh = useCallback(() => {
    if (summaryTimerRef.current) {clearTimeout(summaryTimerRef.current)}
    summaryTimerRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: OPERATIONS_SUMMARY_QUERY_KEY })
    }, SUMMARY_DEBOUNCE_MS)
  }, [queryClient])

  const syncSummaryFromLive = useCallback(() => {
    const liveSnapshot = queryClient.getQueryData<OperationsLiveResponse>(OPERATIONS_LIVE_COMPACT_QUERY_KEY)
    const summarySnapshot = queryClient.getQueryData<OperationsSummaryResponse>(OPERATIONS_SUMMARY_QUERY_KEY)
    const nextSummarySnapshot = syncSummarySnapshotFromLive(summarySnapshot, liveSnapshot)

    if (!nextSummarySnapshot) {
      return false
    }

    queryClient.setQueryData(OPERATIONS_SUMMARY_QUERY_KEY, nextSummarySnapshot)
    return true
  }, [queryClient])

  const handleEvent = useCallback(
    (envelope?: OperationsRealtimeEnvelope) => {
      if (!envelope) {
        queueOperationsRefresh()
        queueKitchenRefresh()
        queueSummaryRefresh()
        return
      }

      const patchResult = applyRealtimeEnvelope(queryClient, envelope)

      if (patchResult.livePatched) {
        syncSummaryFromLive()
      }

      if (!patchResult.livePatched || patchResult.liveNeedsRefresh) {
        queueOperationsRefresh()
      }

      if (requiresKitchenRefresh(envelope) && (!patchResult.kitchenPatched || patchResult.kitchenNeedsRefresh)) {
        queueKitchenRefresh()
      }

      if (requiresSummaryRefresh(envelope.event) && (!patchResult.summaryPatched || patchResult.summaryNeedsRefresh)) {
        queueSummaryRefresh()
      }

      if (envelope.event === 'comanda.closed') {
        queueCommercialRefresh()
      }

      if (patchResult.livePatched || patchResult.kitchenPatched) {
        return
      }
    },
    [queryClient, queueCommercialRefresh, queueKitchenRefresh, queueOperationsRefresh, queueSummaryRefresh],
  )

  const { status } = useOperationsSocket(enabled, handleEvent, refreshBaseline)

  return { status }
}
