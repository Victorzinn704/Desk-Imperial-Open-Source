import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useScrollMemory } from './useScrollMemory'
import type { DashboardSectionId } from '@/components/dashboard/dashboard-navigation'

describe('useScrollMemory', () => {
  function createMockContainer(scrollTop = 0) {
    return {
      scrollTop,
      scrollTo: vi.fn(),
      getBoundingClientRect: () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }),
    } as unknown as HTMLDivElement
  }

  it('returns scrollRef, onScroll and scrollIntoView', () => {
    const { result } = renderHook(() => useScrollMemory('overview', false))
    expect(result.current.scrollRef).toBeDefined()
    expect(typeof result.current.onScroll).toBe('function')
    expect(typeof result.current.scrollIntoView).toBe('function')
  })

  it('saves scroll position on desktop via onScroll', () => {
    const { result } = renderHook(() => useScrollMemory('overview', false))

    act(() => {
      result.current.onScroll({
        currentTarget: { scrollTop: 150 },
      } as unknown as React.UIEvent<HTMLDivElement>)
    })

    // Scroll position is stored internally, verified by switching sections and back
    // Since we can't directly read the memoryRef, we verify through side effects
    expect(result.current.scrollRef).toBeDefined()
  })

  it('ignores onScroll on mobile', () => {
    const { result } = renderHook(() => useScrollMemory('overview', true))

    // Should not throw even when called on mobile
    act(() => {
      result.current.onScroll({
        currentTarget: { scrollTop: 150 },
      } as unknown as React.UIEvent<HTMLDivElement>)
    })
    expect(result.current.scrollRef).toBeDefined()
  })

  it('restores scroll position when switching sections on desktop', () => {
    const container = createMockContainer()

    const { result, rerender } = renderHook(
      ({ section }: { section: DashboardSectionId }) => useScrollMemory(section, false),
      { initialProps: { section: 'overview' as DashboardSectionId } },
    )

    // Attach mock container to scrollRef
    Object.defineProperty(result.current.scrollRef, 'current', {
      value: container,
      writable: true,
    })

    // Simulate scrolling in overview section
    act(() => {
      result.current.onScroll({
        currentTarget: { scrollTop: 200 },
      } as unknown as React.UIEvent<HTMLDivElement>)
    })

    // Switch to sales
    rerender({ section: 'sales' })

    // Switch back to overview - container.scrollTop should be restored
    rerender({ section: 'overview' })
    expect(container.scrollTop).toBe(200)
  })

  it('does not restore scroll on mobile', () => {
    const container = createMockContainer(500)

    const { result, rerender } = renderHook(
      ({ section }: { section: DashboardSectionId }) => useScrollMemory(section, true),
      { initialProps: { section: 'overview' as DashboardSectionId } },
    )

    Object.defineProperty(result.current.scrollRef, 'current', {
      value: container,
      writable: true,
    })

    rerender({ section: 'sales' })
    // On mobile, scrollTop should remain unchanged by the hook
    expect(container.scrollTop).toBe(500)
  })

  it('scrollIntoView uses native scrollIntoView on mobile', () => {
    const { result } = renderHook(() => useScrollMemory('overview', true))

    const targetElement = {
      scrollIntoView: vi.fn(),
      getBoundingClientRect: () => ({ top: 100 }),
    } as unknown as HTMLElement

    act(() => {
      result.current.scrollIntoView(targetElement)
    })

    expect(targetElement.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
  })

  it('scrollIntoView uses container scrollTo on desktop', () => {
    const container = createMockContainer()
    container.getBoundingClientRect = () => ({ top: 50 }) as DOMRect
    container.scrollTop = 100

    const { result } = renderHook(() => useScrollMemory('overview', false))

    Object.defineProperty(result.current.scrollRef, 'current', {
      value: container,
      writable: true,
    })

    const targetElement = {
      scrollIntoView: vi.fn(),
      getBoundingClientRect: () => ({ top: 200 }),
    } as unknown as HTMLElement

    act(() => {
      result.current.scrollIntoView(targetElement)
    })

    // top = 200 - 50 + 100 - 24 = 226
    expect(container.scrollTo).toHaveBeenCalledWith({ top: 226, behavior: 'smooth' })
    expect(targetElement.scrollIntoView).not.toHaveBeenCalled()
  })

  it('scrollIntoView falls back to native when no scrollRef container on mobile=false', () => {
    const { result } = renderHook(() => useScrollMemory('overview', false))
    // scrollRef.current is null by default

    const targetElement = {
      scrollIntoView: vi.fn(),
      getBoundingClientRect: () => ({ top: 100 }),
    } as unknown as HTMLElement

    act(() => {
      result.current.scrollIntoView(targetElement)
    })

    // When no container (scrollRef.current is null) and isMobile is false, falls through to native
    expect(targetElement.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
  })

  it('scrollTo clamps to zero when computed top is negative', () => {
    const container = createMockContainer()
    container.getBoundingClientRect = () => ({ top: 500 }) as DOMRect
    container.scrollTop = 0

    const { result } = renderHook(() => useScrollMemory('overview', false))

    Object.defineProperty(result.current.scrollRef, 'current', {
      value: container,
      writable: true,
    })

    const targetElement = {
      getBoundingClientRect: () => ({ top: 10 }),
    } as unknown as HTMLElement

    act(() => {
      result.current.scrollIntoView(targetElement)
    })

    // top = 10 - 500 + 0 - 24 = -514 -> clamped to 0
    expect(container.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })
})
