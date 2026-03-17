'use client'

import { TrendingUp, TrendingDown } from 'lucide-react'
import type { FinanceSummaryResponse } from '@contracts/contracts'
import { formatCurrency } from '@/lib/currency'

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

  const maxRevenue = Math.max(...timeline.map((t) => t.revenue), 1)

  return (
    <div className="group relative flex w-full flex-col rounded-[28px] bg-[var(--surface)] p-5 shadow-2xl transition-all duration-300 hover:scale-[1.01]">
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
              style={{
                background: 'linear-gradient(135deg, var(--accent), rgba(212,177,106,0.6))',
              }}
            >
              <TrendingUp className="size-4 text-[var(--surface)]" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                Performance comercial
              </p>
              <h3 className="text-sm font-semibold text-white">Receita &amp; lucro</h3>
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
            growth={revenueGrowth}
            isLoading={isLoading}
            label="Receita do mês"
            value={isLoading ? '—' : formatCurrency(currentRevenue, displayCurrency)}
          />
          <MetricTile
            growth={profitGrowth}
            isLoading={isLoading}
            label="Lucro do mês"
            value={isLoading ? '—' : formatCurrency(currentProfit, displayCurrency)}
          />
        </div>

        {/* bar chart — 6 months revenue timeline */}
        <div className="mb-5 h-24 w-full overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3">
          {isLoading ? (
            <div className="flex h-full items-end justify-between gap-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  className="skeleton-shimmer flex-1 rounded-sm"
                  key={i}
                  style={{ height: `${40 + Math.random() * 50}%` }}
                />
              ))}
            </div>
          ) : timeline.length > 0 ? (
            <div className="flex h-full items-end justify-between gap-1">
              {timeline.map((bucket) => {
                const heightPct = maxRevenue > 0 ? Math.max(8, (bucket.revenue / maxRevenue) * 100) : 8
                return (
                  <div
                    className="group/bar relative flex-1 rounded-sm"
                    key={bucket.label}
                    style={{
                      height: `${heightPct}%`,
                      background: 'rgba(212,177,106,0.15)',
                    }}
                    title={`${bucket.label}: ${formatCurrency(bucket.revenue, displayCurrency)}`}
                  >
                    <div
                      className="h-full w-full rounded-sm transition-all duration-500"
                      style={{
                        background: 'linear-gradient(to top, var(--accent), rgba(212,177,106,0.5))',
                        opacity: bucket.revenue > 0 ? 1 : 0.3,
                      }}
                    />
                    {/* tooltip on hover */}
                    <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[10px] text-[var(--text-soft)] group-hover/bar:block">
                      {bucket.label}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-xs text-[var(--text-muted)]">Sem dados de vendas ainda</p>
            </div>
          )}
        </div>

        {/* footer */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-[var(--text-soft)]">
            Últimos {timeline.length > 0 ? timeline.length : 6} meses
          </p>
          <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-soft)]">
            <span className="size-2 rounded-full" style={{ background: 'var(--accent)' }} />
            Receita mensal
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricTile({
  growth,
  isLoading,
  label,
  value,
}: Readonly<{
  growth: number
  isLoading: boolean
  label: string
  value: string
}>) {
  const isPositive = growth >= 0
  const GrowthIcon = isPositive ? TrendingUp : TrendingDown

  return (
    <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-soft)] p-3">
      <p className="text-[11px] font-medium text-[var(--text-soft)]">{label}</p>
      {isLoading ? (
        <div className="skeleton-shimmer mt-1.5 h-6 w-24 rounded-md" />
      ) : (
        <p className="mt-1 text-base font-semibold text-white">{value}</p>
      )}
      {!isLoading && (
        <span
          className="mt-1 flex items-center gap-1 text-[11px] font-semibold"
          style={{ color: isPositive ? 'var(--success)' : 'var(--danger)' }}
        >
          <GrowthIcon className="size-3" />
          {isPositive ? '+' : ''}
          {growth.toFixed(1)}% vs mês anterior
        </span>
      )}
    </div>
  )
}
