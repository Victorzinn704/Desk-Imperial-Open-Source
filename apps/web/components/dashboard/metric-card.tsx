import type { LucideIcon } from 'lucide-react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { MetricCardSkeleton } from '@/components/shared/skeleton'

export function MetricCard({
  color,
  hint,
  icon: Icon,
  label,
  value,
  loading = false,
  trend,
}: Readonly<{
  color?: string
  hint?: string
  icon: LucideIcon
  label: string
  value: string
  loading?: boolean
  trend?: number[]
}>) {
  if (loading) return <MetricCardSkeleton />

  const hasTrend = trend && trend.length >= 2
  let trendPercent = 0
  let isUp = true

  if (hasTrend) {
    const prev = trend[trend.length - 2]
    const curr = trend[trend.length - 1]
    isUp = curr >= prev
    trendPercent = prev !== 0 ? Math.abs(((curr - prev) / prev) * 100) : 100
  }

  return (
    <article className="imperial-card p-5 md:p-6">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-xl"
        style={
          color
            ? {
                backgroundColor: `${color}14`,
                color,
              }
            : { backgroundColor: 'var(--surface-soft)', color: 'var(--text-muted)' }
        }
      >
        <Icon className="size-6" style={color ? { color } : { color: 'var(--text-muted)' }} />
      </div>

      <div className="flex items-end justify-between mt-5">
        <div>
          <span className="text-sm text-[var(--text-muted)]">{label}</span>
          <h4 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{value}</h4>
          {hint ? <p className="mt-1 max-w-44 text-xs leading-5 text-[var(--text-muted)]">{hint}</p> : null}
        </div>

        {hasTrend && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
              isUp
                ? 'bg-[color-mix(in_srgb,_var(--success)_10%,_transparent)] text-[var(--success)]'
                : 'bg-[color-mix(in_srgb,_var(--danger)_10%,_transparent)] text-[var(--danger)]'
            }`}
          >
            {isUp ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
            {trendPercent.toFixed(1)}%
          </span>
        )}
      </div>
    </article>
  )
}
