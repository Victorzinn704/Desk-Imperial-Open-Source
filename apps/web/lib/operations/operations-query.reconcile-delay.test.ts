import type { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import {
  OPERATIONS_COMMERCIAL_RECONCILE_DELAY_MS,
  OPERATIONS_HOT_PATH_RECONCILE_DELAY_MS,
  OPERATIONS_LIVE_QUERY_PREFIX,
  scheduleOperationsWorkspaceReconcile,
} from './operations-query'

describe('operations reconcile delay budget', () => {
  it('usa atraso curto para reconciliacao operacional sem financeiro', () => {
    vi.useFakeTimers()
    const invalidateQueries = vi.fn().mockResolvedValue(undefined)
    const queryClient = { invalidateQueries } as unknown as QueryClient

    scheduleOperationsWorkspaceReconcile(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
      includeSummary: false,
    })

    vi.advanceTimersByTime(OPERATIONS_HOT_PATH_RECONCILE_DELAY_MS - 1)
    expect(invalidateQueries).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: OPERATIONS_LIVE_QUERY_PREFIX })
    vi.useRealTimers()
  })

  it('preserva atraso maior quando a reconciliacao inclui financeiro ou historico', () => {
    vi.useFakeTimers()
    const invalidateQueries = vi.fn().mockResolvedValue(undefined)
    const queryClient = { invalidateQueries } as unknown as QueryClient

    scheduleOperationsWorkspaceReconcile(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
      includeFinance: true,
      includeOrders: true,
    })

    vi.advanceTimersByTime(OPERATIONS_COMMERCIAL_RECONCILE_DELAY_MS - 1)
    expect(invalidateQueries).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['orders'] })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['finance', 'summary'] })
    vi.useRealTimers()
  })
})
