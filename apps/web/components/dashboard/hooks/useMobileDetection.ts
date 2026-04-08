'use client'

import { useEffect, useState } from 'react'

export const DEFAULT_MOBILE_BREAKPOINT = 960
export const COMPACT_DESKTOP_BREAKPOINT = 1366

/**
 * Detects if the viewport is below a given breakpoint.
 * SSR-safe: defaults to `false` (desktop) until hydrated.
 */
export function useMobileDetection(breakpoint = DEFAULT_MOBILE_BREAKPOINT) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [breakpoint])

  return { isMobile }
}
