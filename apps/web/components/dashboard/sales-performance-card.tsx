'use client'

import { TrendingUp, TrendingDown } from 'lucide-react'
import type { FinanceSummaryResponse } from '@contracts/contracts'
import { Skeleton } from '@/components/shared/skeleton'
import { ChartResponsiveContainer } from '@/components/dashboard/chart-responsive-container'
import { formatCompactCurrency, formatCurrency } from '@/lib/currency'
import dynamic from 'next/dynamic'
import { ChartSkeleton } from '@/components/shared/skeleton'

const LazyPerformanceChart = dynamic(
  () =>
    import('recharts').then((mod) => {
      const { Bar, CartesianGrid, ComposedChart, Line, Tooltip, XAxis, YAxis } = mod

      function PerformanceChart({
        timeline,
        displayCurrency,
        formatCompactFn,
        tooltipContent,
      }: {
        timeline: Array<Record<string, unknown>>
        displayCurrency: string
        formatCompactFn: (v: number, c: string) => string
        tooltipContent: React.ReactElement
      }) {
        return (
          <ComposedChart data={timeline} margin={{ top: 4, right: 4, left: -14, bottom: 0 }}>
            <defs>
              <linearGradient id="perfRevenue" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#36f57c" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#36f57c" stopOpacity={0.55} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
            <XAxis axisLine={false} dataKey="label" tick={{ fill: '#6b7a8d', fontSize: 11 }} tickLine={false} />
            <YAxis
              axisLine={false}
              tick={{ fill: '#6b7a8d', fontSize: 11 }}
              tickFormatter={(v: number) => formatCompactFn(v, displayCurrency)}
              tickLine={false}
              width={68}
            />
            <Tooltip content={tooltipContent} />
            <Bar dataKey="revenue" fill="url(#perfRevenue)" maxBarSize={32} name="Receita" radius={[6, 6, 2, 2]} />
            <Line
              dataKey="profit"
              dot={{ fill: '#38bdf8', r: 3, strokeWidth: 0 }}
              name="Lucro"
              stroke="#38bdf8"
              strokeWidth={2.5}
              type="monotone"
            />
          </ComposedChart>
        )
      }
      return PerformanceChart
    }),
  {
    ssr: false,
    loading: () => <ChartSkeleton />,
  },
)

export function SalesPerformanceCard({
  finance,
  isLoading = false,
}: Readonly<{
  finance?: FinanceSummaryResponse
  isLoading?: boolean
}>) {
  const timeline = finance?.revenueTimeline ?? []
  const displayCurrency = finance?.displayCurrency ?? 'BRL'
  const revenueGrowth = finance?.totals.revenueGrowthPercent ?? 0
  const profitGrowth = finance?.totals.profitGrowthPercent ?? 0
  const currentRevenue = finance?.totals.currentMonthRevenue ?? 0
  const currentProfit = finance?.totals.currentMonthProfit ?? 0

  return (
    <div className="group relative flex w-full flex-col rounded-[28px] bg-[var(--surface)] p-5 shadow-2xl transition-shadow duration-300 hover:shadow-[0_12px_36px_rgba(0,0,0,0.4)]">
      {/* gradient border glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[28px] opacity-20 blur-sm transition-opacity duration-300 group-hover:opacity-35"
        style={{
          background: 'linear-gradient(135deg, var(--accent), rgba(52,242,127,0.8), rgba(143,183,255,0.9))',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-px rounded-[27px]"
        style={{ background: 'var(--surface)' }}
      />

      <div className="relative">
        {/* header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="flex size-9 items-center justify-center rounded-2xl"
              style={{ background: 'linear-gradient(135deg, #36f57c, #38bdf8)' }}
            >
              <TrendingUp className="size-4 text-[var(--surface)]" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                Performance comercial
              </p>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Receita &amp; lucro</h3>
            </div>
          </div>

          <span className="flex items-center gap-1.5 rounded-full border border-[rgba(52,242,127,0.2)] bg-[rgba(52,242,127,0.08)] px-2.5 py-1 text-[11px] font-semibold text-[#8fffb9]">
            <span className="size-1.5 animate-pulse rounded-full bg-[#36f57c]" />
            Ao vivo
          </span>
        </div>

        {/* two metrics */}
        <div className="mb-5 grid grid-cols-2 gap-3">
          <MetricTile
            color="#36f57c"
            growth={revenueGrowth}
            isLoading={isLoading}
            label="Receita do mês"
            value={isLoading ? '—' : formatCurrency(currentRevenue, displayCurrency)}
          />
          <MetricTile
            color="#38bdf8"
            growth={profitGrowth}
            isLoading={isLoading}
            label="Lucro do mês"
            value={isLoading ? '—' : formatCurrency(currentProfit, displayCurrency)}
          />
        </div>

        {/* chart */}
        <div className="mb-4 h-[188px] w-full">
          {isLoading ? (
            <Skeleton className="h-full w-full rounded-[14px]" />
          ) : timeline.length > 0 ? (
            <ChartResponsiveContainer>
              <LazyPerformanceChart
                timeline={timeline}
                displayCurrency={displayCurrency}
                formatCompactFn={formatCompactCurrency}
                tooltipContent={<PerformanceTooltip displayCurrency={displayCurrency} />}
              />
            </ChartResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-[14px] border border-dashed border-[var(--border)] bg-[var(--surface-soft)]">
              <p className="text-xs text-[var(--text-muted)]">Sem dados de vendas ainda</p>
            </div>
          )}
        </div>

        {/* legend */}
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-medium text-[var(--text-soft)]">
            Últimos {timeline.length > 0 ? timeline.length : 6} meses
          </p>
          <div className="flex items-center gap-3 text-[11px] font-medium text-[var(--text-soft)]">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-3 rounded-sm bg-[#36f57c]" />
              Receita
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-3 rounded-full bg-[#38bdf8]" />
              Lucro
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricTile({
  color,
  growth,
  isLoading,
  label,
  value,
}: Readonly<{
  color: string
  growth: number
  isLoading: boolean
  label: string
  value: string
}>) {
  const isPositive = growth >= 0
  const Icon = isPositive ? TrendingUp : TrendingDown

  return (
    <div className="rounded-[16px] border bg-[var(--surface-soft)] p-3" style={{ borderColor: `${color}22` }}>
      <p className="text-[11px] font-medium text-[var(--text-soft)]">{label}</p>
      {isLoading ? (
        <Skeleton className="mt-1.5 h-6 w-24 rounded-md" />
      ) : (
        <p className="mt-1 text-base font-semibold text-[var(--text-primary)]">{value}</p>
      )}
      {!isLoading && (
        <span
          className="mt-1 flex items-center gap-1 text-[11px] font-semibold"
          style={{ color: isPositive ? '#36f57c' : 'var(--danger)' }}
        >
          <Icon className="size-3" />
          {isPositive ? '+' : ''}
          {growth.toFixed(1)}% vs mês anterior
        </span>
      )}
    </div>
  )
}

function PerformanceTooltip({
  active,
  displayCurrency,
  label,
  payload,
}: {
  active?: boolean
  displayCurrency: string
  label?: string
  payload?: Array<{ name?: string; value?: number; color?: string }>
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="min-w-[180px] rounded-[16px] border border-[var(--border-strong)] bg-[rgba(12,15,19,0.96)] p-3.5 shadow-[var(--shadow-panel)]">
      <p className="mb-2.5 text-xs font-semibold text-[var(--text-soft)]">{label}</p>
      <div className="space-y-1.5">
        {payload.map((item) => (
          <div className="flex items-center justify-between gap-4 text-sm" key={item.name}>
            <span className="flex items-center gap-2 text-[var(--text-soft)]">
              <span className="size-2 rounded-full" style={{ background: item.color }} />
              {item.name}
            </span>
            <span className="font-semibold text-[var(--text-primary)]">
              {formatCurrency(item.value ?? 0, displayCurrency as 'BRL')}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
