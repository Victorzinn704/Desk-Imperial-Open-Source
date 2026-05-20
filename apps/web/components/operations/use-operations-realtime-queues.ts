'use client'

import { type MutableRefObject, useCallback, useEffect, useRef } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import {
  OPERATIONS_KITCHEN_QUERY_KEY,
  OPERATIONS_LIVE_QUERY_PREFIX,
  OPERATIONS_SUMMARY_QUERY_KEY,
} from '@/lib/operations/operations-query'

export const OPERATIONS_REALTIME_HOT_REFRESH_DEBOUNCE_MS = 100
export const OPERATIONS_REALTIME_COMMERCIAL_REFRESH_DEBOUNCE_MS = 500
export const OPERATIONS_REALTIME_SUMMARY_REFRESH_DEBOUNCE_MS = 500

type TimerRef = MutableRefObject<ReturnType<typeof setTimeout> | null>

export function useOperationsRealtimeQueues(queryClient: QueryClient) {
  const operationsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const kitchenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const summaryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const commercialTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      for (const timerRef of [operationsTimerRef, kitchenTimerRef, summaryTimerRef, commercialTimerRef]) {
        clearTimerRef(timerRef)
      }
    },
    [],
  )

  const queueOperationsRefresh = useCallback(() => {
    rescheduleTimer(operationsTimerRef, OPERATIONS_REALTIME_HOT_REFRESH_DEBOUNCE_MS, () => {
      void queryClient.invalidateQueries({ queryKey: OPERATIONS_LIVE_QUERY_PREFIX })
      void queryClient.invalidateQueries({ queryKey: ['mesas'] })
    })
  }, [queryClient])
  const queueCommercialRefresh = useCallback(() => {
    rescheduleTimer(commercialTimerRef, OPERATIONS_REALTIME_COMMERCIAL_REFRESH_DEBOUNCE_MS, () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
      void queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] })
    })
  }, [queryClient])
  const queueKitchenRefresh = useCallback(() => {
    rescheduleTimer(kitchenTimerRef, OPERATIONS_REALTIME_HOT_REFRESH_DEBOUNCE_MS, () => {
      void queryClient.invalidateQueries({ queryKey: OPERATIONS_KITCHEN_QUERY_KEY })
    })
  }, [queryClient])
  const queueSummaryRefresh = useCallback(() => {
    rescheduleTimer(summaryTimerRef, OPERATIONS_REALTIME_SUMMARY_REFRESH_DEBOUNCE_MS, () => {
      void queryClient.invalidateQueries({ queryKey: OPERATIONS_SUMMARY_QUERY_KEY })
    })
  }, [queryClient])

  return { queueCommercialRefresh, queueKitchenRefresh, queueOperationsRefresh, queueSummaryRefresh }
}

function clearTimerRef(timerRef: TimerRef) {
  if (timerRef.current) {
    clearTimeout(timerRef.current)
    timerRef.current = null
  }
}

function rescheduleTimer(timerRef: TimerRef, delayMs: number, callback: () => void) {
  clearTimerRef(timerRef)
  timerRef.current = setTimeout(callback, delayMs)
}
