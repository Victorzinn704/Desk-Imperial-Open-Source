type WebVitalsMetric = {
  name: 'FCP' | 'LCP' | 'CLS' | 'FID' | 'TTFB' | 'INP'
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta: number
  id: string
}

export type VitalsCallback = (metric: WebVitalsMetric) => void

const THRESHOLDS = {
  FCP: { good: 1800, poor: 3000 },
  LCP: { good: 2500, poor: 4000 },
  CLS: { good: 0.1, poor: 0.25 },
  FID: { good: 100, poor: 300 },
  TTFB: { good: 800, poor: 1800 },
  INP: { good: 200, poor: 500 },
}

export type WebVitalsMetricPayload = WebVitalsMetric

function getRating(name: keyof typeof THRESHOLDS, value: number): WebVitalsMetric['rating'] {
  const threshold = THRESHOLDS[name]
  if (value <= threshold.good) {
    return 'good'
  }
  if (value <= threshold.poor) {
    return 'needs-improvement'
  }
  return 'poor'
}

function reportMetric(onMetric: VitalsCallback | undefined, metric: WebVitalsMetric) {
  if (process.env.NODE_ENV === 'development') {
    const ratingIcons: Record<string, string> = { good: '✅', 'needs-improvement': '⚠️' }
    const color = ratingIcons[metric.rating] ?? '❌'
    console.warn(`${color} [Web Vitals] ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})`)
  }
  onMetric?.(metric)
}

function observeFCP(onMetric: VitalsCallback | undefined) {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name === 'first-contentful-paint') {
        const value = entry.startTime
        reportMetric(onMetric, {
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
  } catch {}
}

function observeLCP(onMetric: VitalsCallback | undefined) {
  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries()
    const lastEntry = entries[entries.length - 1]
    if (lastEntry) {
      const value = lastEntry.startTime
      reportMetric(onMetric, {
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
    const finalize = () => {
      observer.takeRecords()
      observer.disconnect()
    }
    document.addEventListener('visibilitychange', finalize, { once: true })
    document.addEventListener('pointerdown', finalize, { once: true })
  } catch {}
}

function observeCLS(onMetric: VitalsCallback | undefined) {
  let clsValue = 0
  let sessionValue = 0
  let sessionEntries: PerformanceEntry[] = []

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
      if (entry.hadRecentInput) {
        continue
      }

      const firstSessionEntry = sessionEntries[0] as (PerformanceEntry & { startTime: number }) | undefined
      const lastSessionEntry = sessionEntries[sessionEntries.length - 1] as
        | (PerformanceEntry & { startTime: number })
        | undefined
      const isSameSession =
        sessionValue &&
        entry.startTime - (lastSessionEntry?.startTime ?? 0) < 1000 &&
        entry.startTime - (firstSessionEntry?.startTime ?? 0) < 5000

      if (isSameSession) {
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
  })

  try {
    observer.observe({ type: 'layout-shift', buffered: true })
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.visibilityState === 'hidden') {
          reportMetric(onMetric, {
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
  } catch {}
}

function observeFID(onMetric: VitalsCallback | undefined) {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries() as (PerformanceEntry & { processingStart: number; startTime: number })[]) {
      const value = entry.processingStart - entry.startTime
      reportMetric(onMetric, {
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
  } catch {}
}

function observeTTFB(onMetric: VitalsCallback | undefined) {
  const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
  if (!navEntry) {
    return
  }

  const value = navEntry.responseStart
  reportMetric(onMetric, {
    name: 'TTFB',
    value,
    rating: getRating('TTFB', value),
    delta: value,
    id: `ttfb-${Date.now()}`,
  })
}

export function startWebVitalsObservers(onMetric?: VitalsCallback) {
  if (typeof window === 'undefined') {
    return
  }

  observeFCP(onMetric)
  observeLCP(onMetric)
  observeCLS(onMetric)
  observeFID(onMetric)
  observeTTFB(onMetric)
}
