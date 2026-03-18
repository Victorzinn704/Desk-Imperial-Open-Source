import type { LucideIcon } from 'lucide-react'
import { ResponsiveContainer, LineChart, Line } from 'recharts'
import { MetricCardSkeleton } from '@/components/shared/skeleton'
import { Tooltip } from '@/components/shared/tooltip'

export function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
  loading = false,
  trend,
}: Readonly<{
  icon: LucideIcon
  label: string
  value: string
  hint: string
  loading?: boolean
  trend?: number[]
}>) {
  if (loading) return <MetricCardSkeleton />

  const trendColor =
    !trend || trend.length < 2
      ? '#7a8896'
      : trend[trend.length - 1] >= trend[0]
        ? '#36f57c'
        : '#ef4444'

  const sparkData = trend?.map((v, i) => ({ i, v }))

  return (
    <article className="imperial-card-stat p-5">
      <div className="flex items-start justify-between gap-2">
        <Tooltip content={hint} side="top">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[rgba(212,177,106,0.08)] text-[var(--accent)]">
            <Icon className="size-5" />
          </span>
        </Tooltip>

        {sparkData && sparkData.length > 1 && (
          <div className="h-10 w-20 shrink-0">
            <ResponsiveContainer height="100%" width="100%">
              <LineChart data={sparkData}>
                <Line
                  dataKey="v"
                  dot={false}
                  isAnimationActive={false}
                  stroke={trendColor}
                  strokeWidth={1.5}
                  type="monotone"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <p className="mt-5 text-sm font-medium text-[var(--text-soft)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-[var(--text-soft)]">{hint}</p>
    </article>
  )
}
