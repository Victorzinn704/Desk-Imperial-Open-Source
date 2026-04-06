import type { LucideIcon } from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer, Tooltip as ReTooltip } from 'recharts'
import { MetricCardSkeleton } from '@/components/shared/skeleton'
import { Tooltip } from '@/components/shared/tooltip'

export function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
  loading = false,
  trend,
  color,
}: Readonly<{
  icon: LucideIcon
  label: string
  value: string
  hint: string
  loading?: boolean
  trend?: number[]
  color?: string
}>) {
  if (loading) return <MetricCardSkeleton />

  const isUp = trend && trend.length >= 2 ? trend[trend.length - 1] >= trend[0] : null
  const accentColor = color ?? (isUp === null ? '#a7b2be' : isUp ? '#639371' : '#d47373')

  const pct =
    trend && trend.length >= 2 && trend[0] !== 0
      ? (((trend[trend.length - 1] - trend[0]) / Math.abs(trend[0])) * 100).toFixed(1)
      : null

  const pillClass =
    isUp === null ? 'desk-pill desk-pill-neutral' : isUp ? 'desk-pill desk-pill-up' : 'desk-pill desk-pill-down'

  const sparkData = trend?.map((v, i) => ({ i, v }))
  const gradientId = `sparkgrad-${label.replace(/\s+/g, '')}`

  return (
    <article
      className="desk-stat-card flex flex-col gap-0 overflow-hidden"
      style={{ '--stat-accent': accentColor } as React.CSSProperties}
    >
      {/* Top row: icon + pill */}
      <div className="flex items-start justify-between gap-2 px-5 pt-5">
        <Tooltip content={hint} side="top">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-xl border transition-colors duration-200"
            style={{
              background: `color-mix(in srgb, ${accentColor} 12%, transparent)`,
              borderColor: `color-mix(in srgb, ${accentColor} 28%, transparent)`,
              color: accentColor,
            }}
          >
            <Icon className="size-4" />
          </span>
        </Tooltip>

        {pct !== null && (
          <span className={pillClass}>
            {isUp ? '↑' : '↓'} {Math.abs(Number(pct))}%
          </span>
        )}
      </div>

      {/* Label + value */}
      <div className="px-5 pb-4 pt-3">
        <p className="desk-data-label">{label}</p>
        <p className="desk-data-value-lg mt-1">{value}</p>
      </div>

      {/* Full-width area sparkline at bottom */}
      {sparkData && sparkData.length > 1 && (
        <div className="desk-sparkline mt-auto h-14 w-full">
          <ResponsiveContainer height="100%" width="100%">
            <AreaChart data={sparkData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient gradientUnits="userSpaceOnUse" id={gradientId} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={accentColor} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={accentColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <ReTooltip
                contentStyle={{
                  background: 'var(--color-desk-surface-raised)',
                  border: '1px solid var(--color-desk-line)',
                  borderRadius: '0.5rem',
                  fontSize: '0.75rem',
                  color: 'var(--color-desk-fg)',
                  padding: '4px 8px',
                }}
                cursor={false}
                formatter={(v: number) => [v, label]}
                itemStyle={{ color: accentColor }}
              />
              <Area
                dataKey="v"
                dot={false}
                fill={`url(#${gradientId})`}
                isAnimationActive={false}
                stroke={accentColor}
                strokeLinecap="round"
                strokeWidth={1.5}
                type="monotone"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </article>
  )
}
