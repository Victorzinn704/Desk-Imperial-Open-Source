import { cn } from '@/lib/utils'
import { ArrowDown, ArrowUp, type LucideIcon } from 'lucide-react'
import { MetricCardSkeleton } from '@/components/shared/skeleton'

export function MetricCard({
  delta,
  deltaPositive,
  hint,
  icon: Icon,
  label,
  value,
  loading = false,
  trend,
}: Readonly<{
  delta?: number | string
  deltaPositive?: boolean
  hint?: string
  icon?: LucideIcon
  label: string
  value: string
  loading?: boolean
  trend?: number[]
}>) {
  if (loading) {
    return <MetricCardSkeleton />
  }

  const hasTrend = trend && trend.length >= 2
  let resolvedDelta: string | null = null
  let isUp = true

  if (typeof delta === 'number') {
    isUp = deltaPositive ?? delta >= 0
    resolvedDelta = `${Math.abs(delta).toFixed(1)}%`
  } else if (typeof delta === 'string' && delta.trim().length > 0) {
    const normalizedDelta = delta.trim()
    isUp = deltaPositive ?? !normalizedDelta.startsWith('-')
    resolvedDelta = normalizedDelta
  } else if (hasTrend) {
    const prev = trend[trend.length - 2]
    const curr = trend[trend.length - 1]
    isUp = curr >= prev
    const trendPercent = prev === 0 ? (curr === 0 ? 0 : 100) : Math.abs(((curr - prev) / prev) * 100)
    resolvedDelta = `${trendPercent.toFixed(1)}%`
  }

  return (
    <article className="relative rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 shadow-[var(--shadow-panel)] md:px-5 md:py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[0.82rem] uppercase tracking-[0.08em] text-[var(--text-muted)]">
            {Icon ? (
              <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--accent)]">
                <Icon className="size-3.5" />
              </span>
            ) : null}
            <span className="truncate text-[0.75rem]">{label}</span>
          </div>

          <h4 className="mt-3 text-[clamp(1.8rem,2.6vw,2.35rem)] font-semibold leading-none tracking-[-0.04em] text-[var(--text-primary)] tabular-nums">
            {value}
          </h4>
          {hint ? <p className="mt-2 text-[0.88rem] leading-5 text-[var(--text-muted)]">{hint}</p> : null}
        </div>

        {resolvedDelta ? (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[11px] font-semibold',
              isUp ? 'text-[var(--success)]' : 'text-[var(--danger)]',
            )}
            style={getDeltaToneStyle(isUp)}
          >
            {isUp ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
            {resolvedDelta}
          </span>
        ) : null}
      </div>
    </article>
  )
}

function getDeltaToneStyle(isPositive: boolean) {
  const tone = isPositive ? 'var(--success)' : 'var(--danger)'
  return {
    borderColor: `color-mix(in srgb, ${tone} 32%, var(--border))`,
    backgroundColor: `color-mix(in srgb, ${tone} 10%, var(--surface))`,
  }
}
