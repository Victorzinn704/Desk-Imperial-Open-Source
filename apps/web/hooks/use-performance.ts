'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { startWebVitalsObservers, type VitalsCallback } from './performance-web-vitals'

/**
 * Hook para monitoramento de Web Vitals em mobile
 * Coleta métricas de performance e pode enviar para analytics
 */

/**
 * Hook para coletar Web Vitals
 *
 * @example
 * useWebVitals((metric) => {
 *   console.log(metric.name, metric.value, metric.rating)
 *   // Enviar para analytics
 * })
 */
export function useWebVitals(onMetric?: VitalsCallback) {
  useEffect(() => {
    startWebVitalsObservers(onMetric)
  }, [onMetric])
}

/**
 * Detecta se o dispositivo é de baixa performance (função pura, sem hooks)
 */
function detectLowPerformance(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  const nav = navigator as Navigator & {
    deviceMemory?: number
    hardwareConcurrency?: number
    connection?: { effectiveType?: string; saveData?: boolean }
  }

  const lowMemory = nav.deviceMemory !== undefined && nav.deviceMemory < 4
  const lowCores = nav.hardwareConcurrency !== undefined && nav.hardwareConcurrency < 4
  const slowConnection = nav.connection?.effectiveType === '2g' || nav.connection?.effectiveType === 'slow-2g'
  const dataSaver = nav.connection?.saveData === true
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return lowMemory || lowCores || slowConnection || dataSaver || prefersReducedMotion
}

/**
 * Hook para detectar dispositivos de baixa performance
 * Retorna true se o dispositivo deve usar modo de performance reduzida
 */
export function useLowPerformanceMode(): boolean {
  // Calcular valor inicial de forma lazy (apenas no cliente)
  const [isLowPerf] = useState(() => detectLowPerformance())
  return isLowPerf
}

type UseDeferredRenderOptions = {
  delayMs?: number
  disabled?: boolean
}

/**
 * Adia a montagem de superfícies pesadas até o browser ficar ocioso
 * ou até um timeout curto. Bom para widgets e charts fora do caminho crítico.
 */
export function useDeferredRender(options: UseDeferredRenderOptions = {}): boolean {
  const { delayMs = 180, disabled = false } = options
  const [isReady, setIsReady] = useState(() => disabled)

  useEffect(() => {
    if (disabled) {
      return
    }

    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let idleId: number | null = null

    const markReady = () => {
      if (!cancelled) {
        setIsReady(true)
      }
    }

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(markReady, { timeout: delayMs })
    } else {
      timeoutId = setTimeout(markReady, delayMs)
    }

    return () => {
      cancelled = true
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      if (idleId != null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId)
      }
    }
  }, [delayMs, disabled])

  return disabled || isReady
}

/**
 * Hook para debounce de callbacks com cleanup automático
 */
export function useDebouncedCallback<T extends (...args: Parameters<T>) => void>(callback: T, delay: number): T {
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current)
      }
    }
  }, [])

  const debouncedFn = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current)
      }
      timeoutIdRef.current = setTimeout(() => {
        callback(...args)
      }, delay)
    },
    [callback, delay],
  ) as T

  return debouncedFn
}

/**
 * Hook para throttle de callbacks
 */
export function useThrottledCallback<T extends (...args: Parameters<T>) => void>(callback: T, delay: number): T {
  const lastCallRef = useRef(0)

  const throttledFn = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now()
      if (now - lastCallRef.current >= delay) {
        lastCallRef.current = now
        callback(...args)
      }
    },
    [callback, delay],
  ) as T

  return throttledFn
}
