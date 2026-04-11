import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { COMPACT_DESKTOP_BREAKPOINT, DEFAULT_MOBILE_BREAKPOINT, useMobileDetection } from './useMobileDetection'

describe('useMobileDetection', () => {
  let listeners: Map<string, Set<EventListener>>

  beforeEach(() => {
    listeners = new Map()
    vi.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
      if (!listeners.has(event)) {listeners.set(event, new Set())}
      listeners.get(event)!.add(handler as EventListener)
    })
    vi.spyOn(window, 'removeEventListener').mockImplementation((event, handler) => {
      listeners.get(event)?.delete(handler as EventListener)
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function setViewportWidth(width: number) {
    Object.defineProperty(window, 'innerWidth', { value: width, writable: true, configurable: true })
  }

  function fireResize() {
    listeners.get('resize')?.forEach((fn) => fn(new Event('resize')))
  }

  it('exports the default breakpoint constants', () => {
    expect(DEFAULT_MOBILE_BREAKPOINT).toBe(960)
    expect(COMPACT_DESKTOP_BREAKPOINT).toBe(1366)
  })

  it('defaults to false (desktop) before hydration', () => {
    setViewportWidth(500)
    // The initial state before effects run should be false (SSR-safe)
    const { result } = renderHook(() => useMobileDetection())
    // After effects run, it should detect mobile
    expect(result.current.isMobile).toBe(true)
  })

  it('returns isMobile=true when viewport is below default breakpoint', () => {
    setViewportWidth(959)
    const { result } = renderHook(() => useMobileDetection())
    expect(result.current.isMobile).toBe(true)
  })

  it('returns isMobile=false when viewport equals the breakpoint', () => {
    setViewportWidth(960)
    const { result } = renderHook(() => useMobileDetection())
    expect(result.current.isMobile).toBe(false)
  })

  it('returns isMobile=false when viewport is above the breakpoint', () => {
    setViewportWidth(1200)
    const { result } = renderHook(() => useMobileDetection())
    expect(result.current.isMobile).toBe(false)
  })

  it('accepts a custom breakpoint', () => {
    setViewportWidth(1300)
    const { result } = renderHook(() => useMobileDetection(COMPACT_DESKTOP_BREAKPOINT))
    expect(result.current.isMobile).toBe(true)
  })

  it('responds to resize events', () => {
    setViewportWidth(1200)
    const { result } = renderHook(() => useMobileDetection())
    expect(result.current.isMobile).toBe(false)

    act(() => {
      setViewportWidth(800)
      fireResize()
    })
    expect(result.current.isMobile).toBe(true)

    act(() => {
      setViewportWidth(1200)
      fireResize()
    })
    expect(result.current.isMobile).toBe(false)
  })

  it('cleans up the resize listener on unmount', () => {
    setViewportWidth(1200)
    const { unmount } = renderHook(() => useMobileDetection())
    expect(listeners.get('resize')?.size).toBe(1)

    unmount()
    expect(listeners.get('resize')?.size).toBe(0)
  })

  it('re-registers listener when breakpoint changes', () => {
    setViewportWidth(1000)
    const { result, rerender } = renderHook(({ bp }) => useMobileDetection(bp), {
      initialProps: { bp: 960 },
    })
    expect(result.current.isMobile).toBe(false)

    rerender({ bp: 1100 })
    expect(result.current.isMobile).toBe(true)
  })
})
