'use client'

import { useEffect, useRef, useState } from 'react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import type { FinanceSummaryResponse } from '@contracts/contracts'
import {
  LAB_NUMERIC_COMPACT_CLASS,
  LAB_NUMERIC_HERO_CLASS,
  LAB_RESPONSIVE_FOUR_UP_GRID,
} from '@/components/design-lab/lab-primitives'
import { formatCurrency } from '@/lib/currency'
import { CardSkeleton } from '@/components/shared/skeleton'
import { FinanceDoughnutChart } from './finance-doughnut-chart'

type Props = {
  finance: FinanceSummaryResponse
  isLoading?: boolean
}

function AnimatedValue({ value, currency }: { value: number; currency: FinanceSummaryResponse['displayCurrency'] }) {
  const [displayed, setDisplayed] = useState(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const duration = 900
    const start = performance.now()
    const from = 0
    const to = value

    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayed(from + (to - from) * eased)
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) {cancelAnimationFrame(rafRef.current)}
    }
  }, [value])

  return (
    <span className={`inline-flex text-[var(--text-primary)] ${LAB_NUMERIC_HERO_CLASS}`}>
      {formatCurrency(displayed, currency)}
    </span>
  )
}

export function FinanceOverviewTotal({ finance, isLoading }: Props) {
  const { totals, categoryBreakdown, displayCurrency } = finance
  const growth = totals.revenueGrowthPercent
  const isPositive = growth >= 0
  const categoryTotal = categoryBreakdown.reduce((sum, category) => sum + category.inventorySalesValue, 0)
  const topCategories = categoryBreakdown
    .filter((category) => category.inventorySalesValue > 0)
    .slice(0, 4)
    .map((category) => ({
      ...category,
      share: categoryTotal > 0 ? (category.inventorySalesValue / categoryTotal) * 100 : 0,
    }))

  if (isLoading) {
    return <CardSkeleton rows={1} />
  }

  return (
    <div className="imperial-card grid gap-6 p-6 sm:p-8 xl:grid-cols-[auto_minmax(0,0.95fr)_minmax(320px,0.9fr)] xl:items-center">
      <div className="flex justify-center xl:justify-start">
        <FinanceDoughnutChart categoryBreakdown={categoryBreakdown} displayCurrency={displayCurrency} />
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
          Receita realizada total
        </p>

        <AnimatedValue currency={displayCurrency} value={totals.realizedRevenue} />

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            {isPositive ? (
              <TrendingUp className="size-4 text-[#36f57c]" />
            ) : (
              <TrendingDown className="size-4 text-red-400" />
            )}
            <span className={`text-sm font-semibold ${isPositive ? 'text-[#36f57c]' : 'text-red-400'}`}>
              {isPositive ? '+' : ''}
              {growth.toFixed(1)}% vs mês anterior
            </span>
          </div>

          <span className="text-xs text-[var(--text-soft)]">
            {categoryBreakdown.length} categoria{categoryBreakdown.length !== 1 ? 's' : ''} ativas
          </span>

          <span className="rounded-full border border-[rgba(0,140,255,0.3)] bg-[rgba(0,140,255,0.08)] px-2.5 py-0.5 text-xs font-semibold text-[#008CFF]">
            {displayCurrency}
          </span>
        </div>

        <div className="mt-2 overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--border)]">
          <div className={`grid gap-px bg-[var(--border)] ${LAB_RESPONSIVE_FOUR_UP_GRID}`}>
            <MetricTile label="Pedidos" value={String(totals.completedOrders)} />
            <MetricTile label="Lucro realizado" value={formatCurrency(totals.realizedProfit, displayCurrency)} />
            <MetricTile label="Margem média" value={`${totals.averageMarginPercent.toFixed(1)}%`} />
            <MetricTile label="Mês atual" value={formatCurrency(totals.currentMonthRevenue, displayCurrency)} />
          </div>
        </div>
      </div>

      <div className="space-y-4 xl:border-l xl:border-[var(--border)] xl:pl-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">Mix por categoria</p>
            <p className="mt-1 text-sm text-[var(--text-primary)]">Peso comercial do período</p>
          </div>
          <span className="text-xs text-[var(--text-soft)]">{topCategories.length || 0} faixas</span>
        </div>

        {topCategories.length > 0 ? (
          <div className="space-y-3">
            {topCategories.map((category) => (
              <CategoryShareRow
                category={category.category}
                currency={displayCurrency}
                key={category.category}
                share={category.share}
                value={category.inventorySalesValue}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[16px] border border-dashed border-[var(--border)] px-4 py-5 text-sm text-[var(--text-soft)]">
            O mix por categoria aparece quando houver leitura comercial suficiente no período.
          </div>
        )}
      </div>
    </div>
  )
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--surface-soft)] px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">{label}</p>
      <p className={`mt-1 text-[var(--text-primary)] ${LAB_NUMERIC_COMPACT_CLASS}`}>
        {value}
      </p>
    </div>
  )
}

function CategoryShareRow({
  category,
  share,
  value,
  currency,
}: {
  category: string
  share: number
  value: number
  currency: FinanceSummaryResponse['displayCurrency']
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="truncate text-[var(--text-primary)]">{category}</span>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-[var(--text-soft)]">{share.toFixed(1)}%</span>
          <span className="font-medium text-[var(--text-primary)]">{formatCurrency(value, currency)}</span>
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-soft)]">
        <div
          className="h-full rounded-full bg-[var(--accent)]"
          style={{ width: `${Math.max(10, Math.min(share, 100))}%` }}
        />
      </div>
    </div>
  )
}
