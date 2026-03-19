'use client'

import { useEffect, useRef, useState } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import type { FinanceSummaryResponse } from '@contracts/contracts'
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
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [value])

  return (
    <span className="text-3xl font-bold text-white sm:text-4xl">
      {formatCurrency(displayed, currency)}
    </span>
  )
}

export function FinanceOverviewTotal({ finance, isLoading }: Props) {
  const { totals, categoryBreakdown, displayCurrency } = finance
  const growth = totals.revenueGrowthPercent
  const isPositive = growth >= 0

  if (isLoading) {
    return <CardSkeleton rows={1} />
  }

  return (
    <div className="imperial-card flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
      <FinanceDoughnutChart
        categoryBreakdown={categoryBreakdown}
        displayCurrency={displayCurrency}
      />

      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
          Receita realizada total
        </p>

        <AnimatedValue value={totals.realizedRevenue} currency={displayCurrency} />

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            {isPositive ? (
              <TrendingUp className="size-4 text-[#36f57c]" />
            ) : (
              <TrendingDown className="size-4 text-red-400" />
            )}
            <span className={`text-sm font-semibold ${isPositive ? 'text-[#36f57c]' : 'text-red-400'}`}>
              {isPositive ? '+' : ''}{growth.toFixed(1)}% vs mês anterior
            </span>
          </div>

          <span className="text-xs text-[var(--text-soft)]">
            {categoryBreakdown.length} categoria{categoryBreakdown.length !== 1 ? 's' : ''} ativas
          </span>

          <span className="rounded-full border border-[rgba(201,168,76,0.3)] bg-[rgba(201,168,76,0.08)] px-2.5 py-0.5 text-xs font-semibold text-[#C9A84C]">
            {displayCurrency}
          </span>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat label="Pedidos" value={String(totals.completedOrders)} />
          <MiniStat label="Lucro realizado" value={formatCurrency(totals.realizedProfit, displayCurrency)} />
          <MiniStat label="Margem média" value={`${totals.averageMarginPercent.toFixed(1)}%`} />
          <MiniStat label="Mês atual" value={formatCurrency(totals.currentMonthRevenue, displayCurrency)} />
        </div>
      </div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="imperial-card-soft rounded-xl px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  )
}
