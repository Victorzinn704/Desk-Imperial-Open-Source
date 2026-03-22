'use client'

import { TrendingUp, TrendingDown } from 'lucide-react'
import type { FinanceSummaryResponse } from '@contracts/contracts'
import { formatCompactCurrency, formatCurrency } from '@/lib/currency'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { cn } from '@/lib/utils'

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
    <div className="group relative flex w-full flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md">
      <div className="relative">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10"
            >
              <TrendingUp className="size-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Performance comercial
              </p>
              <h3 className="text-sm font-semibold text-foreground">Receita &amp; lucro</h3>
            </div>
          </div>

          <span className="flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 py-1 flex-shrink-0 text-[10px] font-semibold text-emerald-500">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
            Ao vivo
          </span>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4">
          <MetricTile
            color="#10b981"
            growth={revenueGrowth}
            isLoading={isLoading}
            label="Receita do mês"
            value={isLoading ? '—' : formatCurrency(currentRevenue, displayCurrency)}
            isPositiveColor="text-emerald-500"
            negativeColor="text-destructive"
          />
          <MetricTile
            color="#0ea5e9"
            growth={profitGrowth}
            isLoading={isLoading}
            label="Lucro do mês"
            value={isLoading ? '—' : formatCurrency(currentProfit, displayCurrency)}
            isPositiveColor="text-sky-500"
            negativeColor="text-destructive"
          />
        </div>

        <div className="mb-2 h-[188px] w-full">
          {isLoading ? (
            <div className="flex h-full items-end justify-between gap-2 px-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  className="w-full flex-1 rounded-sm bg-muted animate-pulse"
                  key={i}
                  style={{ height: `${45 + (i % 3) * 18}%` }}
                />
              ))}
            </div>
          ) : timeline.length > 0 ? (
            <ResponsiveContainer height="100%" width="100%">
              <ComposedChart
                data={timeline}
                margin={{ top: 4, right: 4, left: -14, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="perfRevenue" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.2} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="var(--border)"
                  strokeDasharray="3 3"
                  vertical={false}
                  opacity={0.5}
                />
                <XAxis
                  axisLine={false}
                  dataKey="label"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickLine={false}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickFormatter={(v: number) => formatCompactCurrency(v, displayCurrency)}
                  tickLine={false}
                  width={68}
                  dx={-10}
                />
                <Tooltip
                  content={
                    <PerformanceTooltip displayCurrency={displayCurrency} />
                  }
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                />
                <Bar
                  dataKey="revenue"
                  fill="url(#perfRevenue)"
                  maxBarSize={32}
                  name="Receita"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  dataKey="profit"
                  dot={{ fill: '#0ea5e9', r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                  name="Lucro"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  type="monotone"
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border bg-background/50">
              <p className="text-xs text-muted-foreground">Sem dados de vendas ainda</p>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Últimos {timeline.length > 0 ? timeline.length : 6} meses
          </p>
          <div className="flex items-center gap-4 text-[11px] font-medium text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-emerald-500" />
              Receita
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
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
  isPositiveColor,
  negativeColor,
}: Readonly<{
  color: string
  growth: number
  isLoading: boolean
  label: string
  value: string
  isPositiveColor: string
  negativeColor: string
}>) {
  const isPositive = growth >= 0
  const Icon = isPositive ? TrendingUp : TrendingDown

  return (
    <div
      className="rounded-lg border border-border bg-background p-4 shadow-sm"
    >
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      {isLoading ? (
        <div className="mt-2 h-7 w-24 rounded-md bg-muted animate-pulse" />
      ) : (
        <p className="mt-1 text-xl font-semibold tracking-tight text-foreground">{value}</p>
      )}
      {!isLoading && (
        <span
          className={cn('mt-2 flex items-center gap-1 text-[11px] font-medium', isPositive ? isPositiveColor : negativeColor)}
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
    <div className="min-w-[180px] rounded-lg border border-border bg-card p-4 shadow-md">
      <p className="mb-3 text-xs font-semibold text-muted-foreground">{label}</p>
      <div className="space-y-2.5">
        {payload.map((item) => (
          <div className="flex items-center justify-between gap-4 text-sm" key={item.name}>
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="size-2 rounded-full" style={{ background: item.name === 'Receita' ? '#10b981' : '#0ea5e9' }} />
              {item.name}
            </span>
            <span className="font-semibold text-foreground">
              {formatCurrency(item.value ?? 0, displayCurrency as 'BRL')}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
