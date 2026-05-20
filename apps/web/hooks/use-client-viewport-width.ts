'use client'

import { useEffect, useState } from 'react'

function readViewportWidth() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.innerWidth
}

export function useClientViewportWidth() {
  const [viewportWidth, setViewportWidth] = useState<number | null>(() => readViewportWidth())

  useEffect(() => {
    const syncViewport = () => setViewportWidth(readViewportWidth())
    syncViewport()
    window.addEventListener('resize', syncViewport)
    return () => window.removeEventListener('resize', syncViewport)
  }, [])

  return viewportWidth
}
