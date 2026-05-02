import { monitorEventLoopDelay, type IntervalHistogram } from 'node:perf_hooks'
import { metrics } from '@opentelemetry/api'

const meter = metrics.getMeter('desk-imperial-api')

const eventLoopLagHistogram = meter.createHistogram('desk.process.event_loop_lag', {
  description: 'Latência observada do event loop do Node.js (nanossegundos convertidos para ms).',
  unit: 'ms',
})

type EventLoopMonitorHandle = {
  stop: () => void
}

let activeHandle: EventLoopMonitorHandle | null = null

export function startEventLoopMonitor(options?: {
  sampleIntervalMs?: number
  resolutionMs?: number
}): EventLoopMonitorHandle {
  if (activeHandle) {
    return activeHandle
  }

  const sampleIntervalMs = Math.max(1_000, options?.sampleIntervalMs ?? 15_000)
  const resolutionMs = Math.max(10, options?.resolutionMs ?? 20)

  const histogram: IntervalHistogram = monitorEventLoopDelay({ resolution: resolutionMs })
  histogram.enable()

  const timer = setInterval(() => {
    const p50 = histogram.percentile(50) / 1_000_000
    const p95 = histogram.percentile(95) / 1_000_000
    const p99 = histogram.percentile(99) / 1_000_000
    const maxMs = histogram.max / 1_000_000

    eventLoopLagHistogram.record(p50, { 'desk.process.event_loop_lag.percentile': 'p50' })
    eventLoopLagHistogram.record(p95, { 'desk.process.event_loop_lag.percentile': 'p95' })
    eventLoopLagHistogram.record(p99, { 'desk.process.event_loop_lag.percentile': 'p99' })
    eventLoopLagHistogram.record(maxMs, { 'desk.process.event_loop_lag.percentile': 'max' })

    histogram.reset()
  }, sampleIntervalMs)

  if (typeof timer.unref === 'function') {
    timer.unref()
  }

  const handle: EventLoopMonitorHandle = {
    stop: () => {
      clearInterval(timer)
      histogram.disable()
      if (activeHandle === handle) {
        activeHandle = null
      }
    },
  }

  activeHandle = handle
  return handle
}

export function stopEventLoopMonitor() {
  activeHandle?.stop()
}
