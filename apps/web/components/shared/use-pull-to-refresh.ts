'use client'

import { type CSSProperties, type RefObject, useCallback, useEffect, useRef, useState } from 'react'

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>
  enabled?: boolean
  threshold?: number
  maxPull?: number
}

type PullGestureMode = 'idle' | 'pending' | 'pulling'

type PullToRefreshState = ReturnType<typeof usePullState>

const PULL_IGNORE_SELECTOR = [
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  '[contenteditable="true"]',
  '[role="button"]',
  '[role="link"]',
  '[role="dialog"]',
  '[data-pull-to-refresh-ignore]',
].join(',')

function getSingleTouch(event: TouchEvent) {
  return event.touches.length === 1 ? event.touches[0] : null
}

function shouldIgnorePullTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(PULL_IGNORE_SELECTOR))
}

function canStartPull(el: HTMLDivElement | null, event: TouchEvent, isRefreshing: boolean) {
  const startsAtTop = Boolean(el && el.scrollTop <= 0)
  return startsAtTop && !isRefreshing && Boolean(getSingleTouch(event)) && !shouldIgnorePullTarget(event.target)
}

function shouldLockVerticalPull(deltaX: number, deltaY: number) {
  const minimumIntentPx = 8
  const horizontalNoiseLimit = Math.abs(deltaX) * 1.25

  return deltaY > minimumIntentPx && deltaY > horizontalNoiseLimit
}

function usePullState() {
  const gestureModeRef = useRef<PullGestureMode>('idle')
  const pullDistanceRef = useRef(0)
  const startPointRef = useRef({ x: 0, y: 0 })
  const [pullDistance, setPullDistance] = useState(0)
  const [isPulling, setIsPulling] = useState(false)

  const resetPullState = useCallback(() => {
    gestureModeRef.current = 'idle'
    pullDistanceRef.current = 0
    setPullDistance(0)
    setIsPulling(false)
  }, [])

  const updatePullDistance = useCallback((distance: number) => {
    pullDistanceRef.current = distance
    setPullDistance(distance)
  }, [])

  return {
    gestureModeRef,
    isPulling,
    pullDistance,
    pullDistanceRef,
    resetPullState,
    setIsPulling,
    startPointRef,
    updatePullDistance,
  }
}

function usePullStartHandler(
  containerRef: RefObject<HTMLDivElement | null>,
  isRefreshing: boolean,
  state: PullToRefreshState,
) {
  const { gestureModeRef, resetPullState, startPointRef } = state

  return useCallback(
    (event: TouchEvent) => {
      if (!canStartPull(containerRef.current, event, isRefreshing)) {
        resetPullState()
        return
      }

      const touch = getSingleTouch(event)
      if (!touch) {
        resetPullState()
        return
      }

      startPointRef.current = { x: touch.clientX, y: touch.clientY }
      gestureModeRef.current = 'pending'
    },
    [containerRef, gestureModeRef, isRefreshing, resetPullState, startPointRef],
  )
}

function usePullMoveHandler(isRefreshing: boolean, maxPull: number, state: PullToRefreshState) {
  const { gestureModeRef, resetPullState, setIsPulling, startPointRef, updatePullDistance } = state

  return useCallback(
    (event: TouchEvent) => {
      if (gestureModeRef.current === 'idle' || isRefreshing) {
        return
      }

      const touch = getSingleTouch(event)
      if (!touch) {
        resetPullState()
        return
      }

      const deltaX = touch.clientX - startPointRef.current.x
      const deltaY = touch.clientY - startPointRef.current.y
      if (deltaY <= 0) {
        resetPullState()
        return
      }

      if (gestureModeRef.current === 'pending' && !shouldLockVerticalPull(deltaX, deltaY)) {
        return
      }

      gestureModeRef.current = 'pulling'
      setIsPulling(true)
      updatePullDistance(Math.min(deltaY * 0.5, maxPull))
      event.preventDefault()
    },
    [gestureModeRef, isRefreshing, maxPull, resetPullState, setIsPulling, startPointRef, updatePullDistance],
  )
}

function usePullEndHandler(
  onRefresh: () => Promise<void>,
  setIsRefreshing: (isRefreshing: boolean) => void,
  state: PullToRefreshState,
  threshold: number,
) {
  const { gestureModeRef, pullDistanceRef, setIsPulling } = state

  return useCallback(() => {
    const shouldRefresh = gestureModeRef.current === 'pulling' && pullDistanceRef.current >= threshold
    if (gestureModeRef.current === 'idle') {
      return
    }

    gestureModeRef.current = 'idle'
    setIsPulling(false)
    void finishPullGesture({ onRefresh, setIsRefreshing, shouldRefresh, state, threshold })
  }, [gestureModeRef, onRefresh, pullDistanceRef, setIsRefreshing, setIsPulling, state, threshold])
}

async function finishPullGesture({
  onRefresh,
  setIsRefreshing,
  shouldRefresh,
  state,
  threshold,
}: {
  onRefresh: () => Promise<void>
  setIsRefreshing: (isRefreshing: boolean) => void
  shouldRefresh: boolean
  state: PullToRefreshState
  threshold: number
}) {
  if (!shouldRefresh) {
    state.updatePullDistance(0)
    return
  }

  setIsRefreshing(true)
  state.updatePullDistance(threshold * 0.6)
  try {
    await onRefresh()
  } finally {
    setIsRefreshing(false)
    state.updatePullDistance(0)
  }
}

function usePullEventListeners({
  containerRef,
  enabled,
  handleTouchEnd,
  handleTouchMove,
  handleTouchStart,
  resetPullState,
}: {
  containerRef: RefObject<HTMLDivElement | null>
  enabled: boolean
  handleTouchEnd: () => void
  handleTouchMove: (event: TouchEvent) => void
  handleTouchStart: (event: TouchEvent) => void
  resetPullState: () => void
}) {
  useEffect(() => {
    const el = containerRef.current
    if (!el || !enabled) {
      resetPullState()
      return
    }

    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    el.addEventListener('touchend', handleTouchEnd, { passive: true })
    el.addEventListener('touchcancel', resetPullState, { passive: true })

    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
      el.removeEventListener('touchcancel', resetPullState)
    }
  }, [containerRef, enabled, handleTouchStart, handleTouchMove, handleTouchEnd, resetPullState])
}

function buildPullIndicatorStyle(pullDistance: number, progress: number, isPulling: boolean): CSSProperties {
  return {
    left: '50%',
    opacity: progress,
    pointerEvents: 'none',
    position: 'absolute',
    top: 0,
    transform: `translate(-50%, ${pullDistance - 40}px)`,
    transition: isPulling ? 'none' : 'all 0.3s ease-out',
    zIndex: 50,
  }
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
export function usePullToRefresh({
  enabled = true,
  onRefresh,
  threshold = 80,
  maxPull = 120,
}: UsePullToRefreshOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const state = usePullState()
  const handleTouchStart = usePullStartHandler(containerRef, isRefreshing, state)
  const handleTouchMove = usePullMoveHandler(isRefreshing, maxPull, state)
  const handleTouchEnd = usePullEndHandler(onRefresh, setIsRefreshing, state, threshold)
  const progress = Math.min(state.pullDistance / threshold, 1)
  const indicatorStyle = buildPullIndicatorStyle(state.pullDistance, progress, state.isPulling)

  usePullEventListeners({
    containerRef,
    enabled,
    handleTouchEnd,
    handleTouchMove,
    handleTouchStart,
    resetPullState: state.resetPullState,
  })

  return {
    containerRef,
    indicatorStyle,
    isRefreshing,
    isPulling: state.isPulling,
    pullDistance: state.pullDistance,
    progress,
  }
}
