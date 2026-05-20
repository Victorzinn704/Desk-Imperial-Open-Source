import { act, renderHook } from '@testing-library/react'
import { QueryClient } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  OPERATIONS_REALTIME_HOT_REFRESH_DEBOUNCE_MS,
  OPERATIONS_REALTIME_SUMMARY_REFRESH_DEBOUNCE_MS,
  useOperationsRealtimeQueues,
} from './use-operations-realtime-queues'

describe('useOperationsRealtimeQueues', () => {
  let queryClient: QueryClient
  let invalidateQueries: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.useFakeTimers()
    queryClient = new QueryClient()
    invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue()
  })

  afterEach(() => {
    vi.useRealTimers()
    queryClient.clear()
  })

  it('reconcilia live e mesas rapidamente quando o patch realtime precisa de fallback', () => {
    const { result } = renderQueues()

    act(() => result.current.queueOperationsRefresh())
    vi.advanceTimersByTime(OPERATIONS_REALTIME_HOT_REFRESH_DEBOUNCE_MS - 1)

    expect(invalidateQueries).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['operations', 'live'] })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['mesas'] })
  })

  it('mantem resumo operacional dentro da janela de fluidez do PDV', () => {
    const { result } = renderQueues()

    act(() => result.current.queueSummaryRefresh())
    vi.advanceTimersByTime(OPERATIONS_REALTIME_SUMMARY_REFRESH_DEBOUNCE_MS)

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['operations', 'summary'] })
  })

  function renderQueues() {
    return renderHook(() => useOperationsRealtimeQueues(queryClient))
  }
})
