import type { LucideIcon } from 'lucide-react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { MetricCardSkeleton } from '@/components/shared/skeleton'

export function MetricCard({
  icon: Icon,
  label,
  value,
  loading = false,
  trend,
}: Readonly<{
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
    <article className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 shadow-sm dark:shadow-none">
      <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
        <Icon className="text-gray-800 size-6 dark:text-gray-200" />
      </div>

      <div className="flex items-end justify-between mt-5">
        <div>
          <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
          <h4 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white/90">{value}</h4>
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
