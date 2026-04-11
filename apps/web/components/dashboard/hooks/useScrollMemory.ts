'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { DashboardSectionId } from '@/components/dashboard/dashboard-navigation'

/**
 * Saves and restores scroll position per dashboard section.
 * On desktop, scrolling happens inside a workspace container (not the page).
 * On mobile, falls back to native `scrollIntoView`.
 */
export function useScrollMemory(activeSection: DashboardSectionId, isMobile: boolean) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const memoryRef = useRef<Partial<Record<DashboardSectionId, number>>>({})

  // Restore scroll position when switching sections
  useEffect(() => {
    if (isMobile) {return}
    const container = scrollRef.current
    if (!container) {return}
    container.scrollTop = memoryRef.current[activeSection] ?? 0
  }, [isMobile, activeSection])

  const onScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      if (isMobile) {return}
      memoryRef.current[activeSection] = event.currentTarget.scrollTop
    },
    [isMobile, activeSection],
  )

  const scrollIntoView = useCallback(
    (targetElement: HTMLElement) => {
      if (isMobile || !scrollRef.current) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }

      const container = scrollRef.current
      const top =
        targetElement.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - 24

      container.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
    },
    [isMobile],
  )

  return { scrollRef, onScroll, scrollIntoView }
}
