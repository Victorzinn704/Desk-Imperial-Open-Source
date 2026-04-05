import type { LucideIcon } from 'lucide-react'
import { LineChart, Line } from 'recharts'
import { MetricCardSkeleton } from '@/components/shared/skeleton'
import { ChartResponsiveContainer } from '@/components/dashboard/chart-responsive-container'
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

  const trendColor =
    color ?? (!trend || trend.length < 2 ? '#7a8896' : trend[trend.length - 1] >= trend[0] ? '#36f57c' : '#ef4444')

  const sparkData = trend?.map((v, i) => ({ i, v }))

  const [r, g, b] = hexToRgb(trendColor.startsWith('#') ? trendColor : '#d4b16a')
  const iconGlow = `0 0 18px rgba(${r},${g},${b},0.28)`
  const iconBorderColor = `rgba(${r},${g},${b},0.32)`
  const iconBg = `rgba(${r},${g},${b},0.1)`

  return (
    <article className="imperial-card-stat p-5">
      <div className="flex items-start justify-between gap-2">
        <Tooltip content={hint} side="top">
          <span
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl border transition-colors duration-200"
            style={{
              background: iconBg,
              borderColor: iconBorderColor,
              boxShadow: iconGlow,
              color: trendColor,
            }}
          >
            <Icon className="size-5" />
          </span>
        </Tooltip>

        {sparkData && sparkData.length > 1 && (
          <div className="h-12 w-24 shrink-0">
            <ChartResponsiveContainer>
              <LineChart data={sparkData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                <Line
                  dataKey="v"
                  dot={false}
                  isAnimationActive={false}
                  stroke={trendColor}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  type="natural"
                />
              </LineChart>
            </ChartResponsiveContainer>
          </div>
        )}
      </div>

      <p className="mt-5 text-sm font-medium text-[var(--text-soft)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-[var(--text-soft)]">{hint}</p>
    </article>
  )
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean
  const n = parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
