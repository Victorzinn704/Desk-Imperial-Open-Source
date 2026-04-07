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
  className,
}: Readonly<{
  color?: string
  hint?: string
  icon: LucideIcon
  label: string
  value: string
  loading?: boolean
  trend?: number[]
  className?: string
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

  const rootClasses = [
    'grid h-full gap-3 rounded-2xl border border-white/[0.08] bg-white/80 p-5 shadow-sm transition duration-200 ease-in-out dark:border-white/5 dark:bg-white/[0.02] dark:shadow-none md:p-6',
    className,
  ]

  return (
    <article className={rootClasses.filter(Boolean).join(' ')}>
      <div className="flex items-center justify-between gap-4">
        <span
          className="flex h-12 w-12 items-center justify-center rounded-xl border"
          style={{
            borderColor: color ? `${color}40` : 'transparent',
            backgroundColor: color ? `${color}15` : 'transparent',
            color: color || 'currentColor',
          }}
        >
          <Icon className="size-6" style={color ? { color } : undefined} />
        </span>
        {hasTrend && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold ${
              isUp
                ? 'border-green-300 bg-green-50 text-green-600 dark:border-green-500/40 dark:bg-green-500/10'
                : 'border-red-300 bg-red-50 text-red-600 dark:border-red-500/40 dark:bg-red-500/10'
            }`}
          >
            {isUp ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
            {trendPercent.toFixed(1)}%
          </span>
        )}
      </div>

      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-soft)]">{label}</p>
        <h4 className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">{value}</h4>
        {hint ? (
          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{hint}</p>
        ) : null}
      </div>
    </article>
  )
}
