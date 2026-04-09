import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useEvaluationCountdown } from './useEvaluationCountdown'

describe('useEvaluationCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-09T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns isEvaluation=false when evaluationAccess is null', () => {
    const { result } = renderHook(() => useEvaluationCountdown(null))
    expect(result.current.isEvaluation).toBe(false)
    expect(result.current.remainingSeconds).toBe(0)
  })

  it('returns isEvaluation=true with remaining seconds when evaluationAccess is provided', () => {
    const evaluationAccess = {
      sessionExpiresAt: '2026-04-09T12:05:00.000Z', // 5 minutes from now
      dailyLimitMinutes: 30,
    }
    const { result } = renderHook(() => useEvaluationCountdown(evaluationAccess))
    expect(result.current.isEvaluation).toBe(true)
    expect(result.current.remainingSeconds).toBe(300)
  })

  it('counts down every second', () => {
    const evaluationAccess = {
      sessionExpiresAt: '2026-04-09T12:05:00.000Z',
      dailyLimitMinutes: 30,
    }
    const { result } = renderHook(() => useEvaluationCountdown(evaluationAccess))
    expect(result.current.remainingSeconds).toBe(300)

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.remainingSeconds).toBe(299)

    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(result.current.remainingSeconds).toBe(296)
  })

  it('never goes below 0 remaining seconds', () => {
    const evaluationAccess = {
      sessionExpiresAt: '2026-04-09T12:00:02.000Z', // 2 seconds from now
      dailyLimitMinutes: 30,
    }
    const { result } = renderHook(() => useEvaluationCountdown(evaluationAccess))
    expect(result.current.remainingSeconds).toBe(2)

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(result.current.remainingSeconds).toBe(0)
  })

  it('calls onExpire when session expires', () => {
    const onExpire = vi.fn()
    const evaluationAccess = {
      sessionExpiresAt: '2026-04-09T12:00:03.000Z', // 3 seconds from now
      dailyLimitMinutes: 30,
    }
    renderHook(() => useEvaluationCountdown(evaluationAccess, onExpire))
    expect(onExpire).not.toHaveBeenCalled()

    // Advance past expiration + the 150ms buffer
    act(() => {
      vi.advanceTimersByTime(3150 + 50)
    })
    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  it('does not call onExpire when evaluationAccess is null', () => {
    const onExpire = vi.fn()
    renderHook(() => useEvaluationCountdown(null, onExpire))

    act(() => {
      vi.advanceTimersByTime(10000)
    })
    expect(onExpire).not.toHaveBeenCalled()
  })

  it('clears timers on unmount', () => {
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval')
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout')

    const evaluationAccess = {
      sessionExpiresAt: '2026-04-09T12:05:00.000Z',
      dailyLimitMinutes: 30,
    }
    const { unmount } = renderHook(() => useEvaluationCountdown(evaluationAccess))

    unmount()
    expect(clearIntervalSpy).toHaveBeenCalled()
    expect(clearTimeoutSpy).toHaveBeenCalled()

    clearIntervalSpy.mockRestore()
    clearTimeoutSpy.mockRestore()
  })

  it('handles already-expired session (expiresAt in the past)', () => {
    const onExpire = vi.fn()
    const evaluationAccess = {
      sessionExpiresAt: '2026-04-09T11:50:00.000Z', // 10 min in the past
      dailyLimitMinutes: 30,
    }
    const { result } = renderHook(() => useEvaluationCountdown(evaluationAccess, onExpire))
    expect(result.current.remainingSeconds).toBe(0)
    expect(result.current.isEvaluation).toBe(true)

    // The timeout should fire with Math.max(0, negative) + 150 = 150ms
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  it('uses latest onExpire callback via ref (no stale closure)', () => {
    const onExpire1 = vi.fn()
    const onExpire2 = vi.fn()
    const evaluationAccess = {
      sessionExpiresAt: '2026-04-09T12:00:03.000Z',
      dailyLimitMinutes: 30,
    }
    const { rerender } = renderHook(({ cb }) => useEvaluationCountdown(evaluationAccess, cb), {
      initialProps: { cb: onExpire1 },
    })

    // Update callback before expiration
    rerender({ cb: onExpire2 })

    act(() => {
      vi.advanceTimersByTime(3350)
    })
    expect(onExpire1).not.toHaveBeenCalled()
    expect(onExpire2).toHaveBeenCalledTimes(1)
  })
})
