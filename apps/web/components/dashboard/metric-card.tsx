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

  const trendColor = color ?? (
    !trend || trend.length < 2
      ? '#7a8896'
      : trend[trend.length - 1] >= trend[0]
        ? '#36f57c'
        : '#ef4444'
  )

  const sparkData = trend?.map((v, i) => ({ i, v }))

  const [r, g, b] = hexToRgb(trendColor.startsWith('#') ? trendColor : '#d4b16a')
  const iconGlow = `0 0 10px rgba(${r},${g},${b},0.14)`
  const iconBorderColor = `rgba(${r},${g},${b},0.32)`
  const iconBg = `rgba(${r},${g},${b},0.1)`

  return (
    <article className="imperial-card-stat p-4 contain-layout">
      <div className="flex items-center justify-between gap-2">
        <Tooltip content={hint} side="top">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-xl border transition-colors duration-200"
            style={{
              background: iconBg,
              borderColor: iconBorderColor,
              boxShadow: iconGlow,
              color: trendColor,
            }}
          >
            <Icon className="size-4" />
          </span>
        </Tooltip>

        {sparkData && sparkData.length > 1 && (
          <div className="h-9 w-20 shrink-0 opacity-70">
            <ResponsiveContainer height="100%" width="100%">
              <LineChart data={sparkData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                <Line
                  dataKey="v"
                  dot={false}
                  isAnimationActive={false}
                  stroke={trendColor}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  type="natural"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">{label}</p>
      <p className="mt-1.5 text-xl font-semibold text-white">{value}</p>
    </article>
  )
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
  const n = parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
