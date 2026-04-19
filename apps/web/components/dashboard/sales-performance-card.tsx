'use client'

import type { CurrencyCode, FinanceSummaryResponse } from '@contracts/contracts'
import { ChartSkeleton, Skeleton } from '@/components/shared/skeleton'
import { ChartResponsiveContainer } from '@/components/dashboard/chart-responsive-container'
import { formatCompactCurrency, formatCurrency } from '@/lib/currency'
import dynamic from 'next/dynamic'

const LazyPerformanceChart = dynamic(
  () =>
    import('recharts').then((mod) => {
      const { Bar, CartesianGrid, ComposedChart, Line, Tooltip, XAxis, YAxis } = mod

      function PerformanceChart({
        timeline,
        displayCurrency,
        formatCompactFn,
        tooltipContent,
      }: Readonly<{
        timeline: Array<Record<string, unknown>>
        displayCurrency: string
        formatCompactFn: (v: number, c: CurrencyCode) => string
        tooltipContent: React.ReactElement
      }>) {
        return (
          <ComposedChart data={timeline} margin={{ top: 4, right: 4, left: -14, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis axisLine={false} dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} />
            <YAxis
              axisLine={false}
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              tickFormatter={(v: number) => formatCompactFn(v, displayCurrency as CurrencyCode)}
              tickLine={false}
              width={68}
            />
            <Tooltip content={tooltipContent} />
            <Bar
              dataKey="revenue"
              fill="var(--accent)"
              fillOpacity={0.2}
              maxBarSize={28}
              name="Receita"
              radius={[4, 4, 0, 0]}
              stroke="var(--accent)"
              strokeOpacity={0.35}
            />
            <Line
              dataKey="profit"
              dot={{ fill: 'var(--success)', r: 2.5, strokeWidth: 0 }}
              name="Lucro"
              stroke="var(--success)"
              strokeWidth={2.1}
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

  return (
    <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-panel)]">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold tracking-[-0.02em] text-[var(--text-primary)] md:text-[1.1rem]">
            Receita & Lucro
          </h3>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">por hora · 08h - 18h</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">mês corrente</p>
          <p className="mt-1 font-mono text-sm text-[var(--text-soft)] tabular-nums">
            {isLoading ? '—' : formatCurrency(finance?.totals.currentMonthRevenue ?? 0, displayCurrency)}
          </p>
        </div>
      </div>

      <div className="mb-4 h-[188px] w-full">
        {isLoading ? (
          <Skeleton className="h-full w-full rounded-[8px]" />
        ) : timeline.length > 0 ? (
          <ChartResponsiveContainer>
            <LazyPerformanceChart
              displayCurrency={displayCurrency}
              formatCompactFn={formatCompactCurrency}
              timeline={timeline}
              tooltipContent={<PerformanceTooltip displayCurrency={displayCurrency} />}
            />
          </ChartResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-[8px] border border-dashed border-[var(--border-strong)] bg-[color-mix(in_srgb,var(--surface-muted)_64%,transparent)]">
            <p className="text-xs text-[var(--text-muted)]">Sem dados de vendas ainda</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
        <p>últimos {timeline.length > 0 ? timeline.length : 6} períodos</p>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[var(--accent)] opacity-80 ring-1 ring-[var(--accent)]" />
            Receita
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-[2px] w-3 rounded-full bg-[var(--success)]" />
            Lucro
          </span>
        </div>
      </div>
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
  if (!active || !payload?.length) {return null}

  return (
    <div className="min-w-[180px] rounded-[8px] border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-3.5 shadow-[var(--shadow-panel)]">
      <p className="mb-2.5 text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</p>
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
