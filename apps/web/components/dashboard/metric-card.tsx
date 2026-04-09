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
    trendPercent = prev === 0 ? 100 : Math.abs(((curr - prev) / prev) * 100)
  }

  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-panel)] md:p-6">
      <div
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--surface-muted)]"
        style={
          color
            ? {
                backgroundColor: `${color}1A`,
                color,
              }
            : undefined
        }
      >
        <Icon className="size-5 text-[var(--text-primary)]" style={color ? { color } : undefined} />
      </div>

      <div className="flex items-end justify-between mt-5">
        <div>
          <span className="text-sm text-[var(--text-soft)]">{label}</span>
          <h4 className="mt-2 text-2xl font-bold text-gray-900 dark:text-[var(--text-primary)]/90">{value}</h4>
          {hint ? <p className="mt-1 max-w-44 truncate text-xs leading-5 text-[var(--text-muted)]">{hint}</p> : null}
        </div>

        {hasTrend && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
              isUp
                ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-500'
                : 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-500'
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
