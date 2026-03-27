'use client'

import { useEffect, useState } from 'react'

const DEFAULT_BREAKPOINT = 768

/**
 * Detects if the viewport is below a given breakpoint.
 * SSR-safe: defaults to `false` (desktop) until hydrated.
 */
export function useMobileDetection(breakpoint = DEFAULT_BREAKPOINT) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [breakpoint])

  return { isMobile }
}
