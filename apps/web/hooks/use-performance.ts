'use client'

import { useEffect, useCallback, useState, useRef } from 'react'

/**
 * Hook para monitoramento de Web Vitals em mobile
 * Coleta métricas de performance e pode enviar para analytics
 */

interface WebVitalsMetric {
  name: 'FCP' | 'LCP' | 'CLS' | 'FID' | 'TTFB' | 'INP'
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta: number
  id: string
}

type VitalsCallback = (metric: WebVitalsMetric) => void

// Thresholds baseados no Google Web Vitals
const THRESHOLDS = {
  FCP: { good: 1800, poor: 3000 },
  LCP: { good: 2500, poor: 4000 },
  CLS: { good: 0.1, poor: 0.25 },
  FID: { good: 100, poor: 300 },
  TTFB: { good: 800, poor: 1800 },
  INP: { good: 200, poor: 500 },
}

function getRating(name: keyof typeof THRESHOLDS, value: number): WebVitalsMetric['rating'] {
  const threshold = THRESHOLDS[name]
  if (value <= threshold.good) return 'good'
  if (value <= threshold.poor) return 'needs-improvement'
  return 'poor'
}

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
    if (typeof window === 'undefined') return

    const reportMetric = (metric: WebVitalsMetric) => {
      // Log em development
      if (process.env.NODE_ENV === 'development') {
        const ratingIcons: Record<string, string> = { good: '✅', 'needs-improvement': '⚠️' }
        const color = ratingIcons[metric.rating] ?? '❌'
        console.warn(`${color} [Web Vitals] ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})`)
      }
      onMetric?.(metric)
    }

    // First Contentful Paint
    const observeFCP = () => {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            const value = entry.startTime
            reportMetric({
              name: 'FCP',
              value,
              rating: getRating('FCP', value),
              delta: value,
              id: `fcp-${Date.now()}`,
            })
            observer.disconnect()
          }
        }
      })
      try {
        observer.observe({ type: 'paint', buffered: true })
      } catch {
        // PerformanceObserver not supported
      }
    }

    // Largest Contentful Paint
    const observeLCP = () => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        if (lastEntry) {
          const value = lastEntry.startTime
          reportMetric({
            name: 'LCP',
            value,
            rating: getRating('LCP', value),
            delta: value,
            id: `lcp-${Date.now()}`,
          })
        }
      })
      try {
        observer.observe({ type: 'largest-contentful-paint', buffered: true })
        // Finalizar LCP na interação do usuário
        const finalize = () => {
          observer.takeRecords()
          observer.disconnect()
        }
        document.addEventListener('visibilitychange', finalize, { once: true })
        document.addEventListener('pointerdown', finalize, { once: true })
      } catch {
        // PerformanceObserver not supported
      }
    }

    // Cumulative Layout Shift
    const observeCLS = () => {
      let clsValue = 0
      let sessionValue = 0
      let sessionEntries: PerformanceEntry[] = []

      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
          if (!entry.hadRecentInput) {
            const firstSessionEntry = sessionEntries[0] as (PerformanceEntry & { startTime: number }) | undefined
            const lastSessionEntry = sessionEntries[sessionEntries.length - 1] as
              | (PerformanceEntry & { startTime: number })
              | undefined

            if (
              sessionValue &&
              entry.startTime - (lastSessionEntry?.startTime ?? 0) < 1000 &&
              entry.startTime - (firstSessionEntry?.startTime ?? 0) < 5000
            ) {
              sessionValue += entry.value
              sessionEntries.push(entry)
            } else {
              sessionValue = entry.value
              sessionEntries = [entry]
            }

            if (sessionValue > clsValue) {
              clsValue = sessionValue
            }
          }
        }
      })

      try {
        observer.observe({ type: 'layout-shift', buffered: true })

        // Reportar CLS quando a página fica hidden
        document.addEventListener(
          'visibilitychange',
          () => {
            if (document.visibilityState === 'hidden') {
              reportMetric({
                name: 'CLS',
                value: clsValue,
                rating: getRating('CLS', clsValue),
                delta: clsValue,
                id: `cls-${Date.now()}`,
              })
              observer.disconnect()
            }
          },
          { once: true },
        )
      } catch {
        // PerformanceObserver not supported
      }
    }

    // First Input Delay
    const observeFID = () => {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as (PerformanceEntry & {
          processingStart: number
          startTime: number
        })[]) {
          const value = entry.processingStart - entry.startTime
          reportMetric({
            name: 'FID',
            value,
            rating: getRating('FID', value),
            delta: value,
            id: `fid-${Date.now()}`,
          })
          observer.disconnect()
        }
      })
      try {
        observer.observe({ type: 'first-input', buffered: true })
      } catch {
        // PerformanceObserver not supported
      }
    }

    // Time to First Byte
    const observeTTFB = () => {
      const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
      if (navEntry) {
        const value = navEntry.responseStart
        reportMetric({
          name: 'TTFB',
          value,
          rating: getRating('TTFB', value),
          delta: value,
          id: `ttfb-${Date.now()}`,
        })
      }
    }

    // Iniciar observadores
    observeFCP()
    observeLCP()
    observeCLS()
    observeFID()
    observeTTFB()
  }, [onMetric])
}

/**
 * Detecta se o dispositivo é de baixa performance (função pura, sem hooks)
 */
function detectLowPerformance(): boolean {
  if (typeof window === 'undefined') return false

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
