'use client'

import { type MutableRefObject, useCallback } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import { invalidateOperationsWorkspace, OPERATIONS_LIVE_QUERY_PREFIX } from '@/lib/operations/operations-query'
import {
  recordOperationsRealtimeEnvelopeDropped,
  recordOperationsReconnectRefreshEvent,
} from '@/lib/operations/operations-performance-diagnostics'
import type { OperationsRealtimeEnvelope } from './hooks/use-operations-socket'
import { now, resolveRealtimeEnvelopeEntityKey } from './operations-realtime-utils'

type OperationsRealtimeBaselineParams = Readonly<{
  handleEventRef: MutableRefObject<(envelope?: OperationsRealtimeEnvelope) => void>
  isSyncingRef: MutableRefObject<boolean>
  processedEnvelopeIdsOrderRef: MutableRefObject<string[]>
  processedEnvelopeIdsRef: MutableRefObject<Set<string>>
  queryClient: QueryClient
  reidratationBufferRef: MutableRefObject<OperationsRealtimeEnvelope[]>
}>

export function useOperationsRealtimeBaseline({
  handleEventRef,
  isSyncingRef,
  processedEnvelopeIdsOrderRef,
  processedEnvelopeIdsRef,
  queryClient,
  reidratationBufferRef,
}: OperationsRealtimeBaselineParams) {
  return useCallback(async () => {
    const startedAt = now()
    markBaselineRefreshStarted({
      isSyncingRef,
      processedEnvelopeIdsOrderRef,
      processedEnvelopeIdsRef,
      reidratationBufferRef,
    })

    try {
      await invalidateBaselineQueries(queryClient)
      drainReidratationBuffer({ handleEventRef, isSyncingRef, reidratationBufferRef })
      recordBaselineRefresh('success', startedAt)
    } catch (error) {
      recordBaselineRefreshError({ error, isSyncingRef, reidratationBufferRef, startedAt })
    }
  }, [
    handleEventRef,
    isSyncingRef,
    processedEnvelopeIdsOrderRef,
    processedEnvelopeIdsRef,
    queryClient,
    reidratationBufferRef,
  ])
}

function markBaselineRefreshStarted({
  isSyncingRef,
  processedEnvelopeIdsOrderRef,
  processedEnvelopeIdsRef,
  reidratationBufferRef,
}: Omit<OperationsRealtimeBaselineParams, 'handleEventRef' | 'queryClient'>) {
  isSyncingRef.current = true
  reidratationBufferRef.current = []
  processedEnvelopeIdsRef.current.clear()
  processedEnvelopeIdsOrderRef.current.length = 0
}

function invalidateBaselineQueries(queryClient: QueryClient) {
  return Promise.all([
    invalidateOperationsWorkspace(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
      includeOrders: true,
      includeFinance: true,
    }),
    queryClient.invalidateQueries({ queryKey: ['mesas'] }),
  ])
}

function drainReidratationBuffer({
  handleEventRef,
  isSyncingRef,
  reidratationBufferRef,
}: Pick<OperationsRealtimeBaselineParams, 'handleEventRef' | 'isSyncingRef' | 'reidratationBufferRef'>) {
  isSyncingRef.current = false
  const buffered = reidratationBufferRef.current
  reidratationBufferRef.current = []
  for (const envelope of buffered) {
    handleEventRef.current?.(envelope)
  }
}

function recordBaselineRefresh(status: 'error' | 'success', startedAt: number) {
  recordOperationsReconnectRefreshEvent({
    status,
    durationMs: Math.max(0, now() - startedAt),
    invalidatedMesas: true,
  })
}

function recordBaselineRefreshError({
  error,
  isSyncingRef,
  reidratationBufferRef,
  startedAt,
}: Pick<OperationsRealtimeBaselineParams, 'isSyncingRef' | 'reidratationBufferRef'> & {
  error: unknown
  startedAt: number
}) {
  isSyncingRef.current = false
  const droppedOnError = reidratationBufferRef.current
  reidratationBufferRef.current = []
  for (const envelope of droppedOnError) {
    recordOperationsRealtimeEnvelopeDropped({
      event: envelope.event,
      entityKey: resolveRealtimeEnvelopeEntityKey(envelope),
      reason: 'baseline-error',
    })
  }
  recordBaselineRefresh('error', startedAt)
  throw error
}
