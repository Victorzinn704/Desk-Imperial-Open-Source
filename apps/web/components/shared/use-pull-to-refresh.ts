'use client'

import { useCallback, useRef, useState, useEffect } from 'react'

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>
  threshold?: number
  maxPull?: number
}

/**
 * Hook de pull-to-refresh nativo via touch events.
 * Retorna ref para o container scrollável + indicador visual.
 *
 * Uso:
 *   const { containerRef, indicatorStyle, isPulling, isRefreshing } = usePullToRefresh({ onRefresh })
 *   <div ref={containerRef} style={{ position: 'relative' }}>
 *     <PullIndicator style={indicatorStyle} isRefreshing={isRefreshing} />
 *     ...children
 *   </div>
 */
export function usePullToRefresh({ onRefresh, threshold = 80, maxPull = 120 }: UsePullToRefreshOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const startY = useRef(0)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isPulling, setIsPulling] = useState(false)

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      const el = containerRef.current
      if (!el || el.scrollTop > 0 || isRefreshing) return
      startY.current = e.touches[0].clientY
      setIsPulling(true)
    },
    [isRefreshing],
  )

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isPulling || isRefreshing) return
      const delta = e.touches[0].clientY - startY.current
      if (delta < 0) {
        setPullDistance(0)
        return
      }
      // Resistência logarítmica para sensação natural
      const dampened = Math.min(delta * 0.5, maxPull)
      setPullDistance(dampened)
      if (dampened > 10) {
        e.preventDefault()
      }
    },
    [isPulling, isRefreshing, maxPull],
  )

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return
    setIsPulling(false)

    if (pullDistance >= threshold) {
      setIsRefreshing(true)
      setPullDistance(threshold * 0.6) // Mantém indicador visível durante refresh
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
        setPullDistance(0)
      }
    } else {
      setPullDistance(0)
    }
  }, [isPulling, pullDistance, threshold, onRefresh])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    el.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  const progress = Math.min(pullDistance / threshold, 1)

  const indicatorStyle: React.CSSProperties = {
    position: 'absolute' as const,
    top: 0,
    left: '50%',
    transform: `translate(-50%, ${pullDistance - 40}px)`,
    opacity: progress,
    transition: isPulling ? 'none' : 'all 0.3s ease-out',
    zIndex: 50,
    pointerEvents: 'none' as const,
  }

  return {
    containerRef,
    indicatorStyle,
    pullDistance,
    isPulling,
    isRefreshing,
    progress,
  }
}
