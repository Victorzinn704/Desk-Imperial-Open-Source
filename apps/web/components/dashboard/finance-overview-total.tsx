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
    <span className="text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
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
    <div className="imperial-card grid gap-6 p-6 xl:grid-cols-[280px_minmax(0,1fr)] xl:items-center xl:p-8">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-5">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-soft)]">Distribuição</p>
          <span className="rounded-full border border-[rgba(0,140,255,0.24)] bg-[rgba(0,140,255,0.08)] px-2.5 py-1 text-[11px] font-semibold text-[var(--accent)]">
            {displayCurrency}
          </span>
        </div>
        <div className="mt-4 flex justify-center">
          <FinanceDoughnutChart categoryBreakdown={categoryBreakdown} displayCurrency={displayCurrency} />
        </div>
        <p className="mt-4 text-center text-xs leading-6 text-[var(--text-soft)]">
          {categoryBreakdown.length} categoria{categoryBreakdown.length !== 1 ? 's' : ''} ativas no retrato financeiro atual.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-soft)]">
              Receita realizada total
            </p>
            <div className="mt-3">
              <AnimatedValue value={totals.realizedRevenue} currency={displayCurrency} />
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-soft)]">
              Painel consolidado do turno financeiro, com faturamento, lucro e margem média da operação.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 xl:min-w-[240px]">
            <div className="flex items-center gap-1.5">
              {isPositive ? (
                <TrendingUp className="size-4 text-[#22c55e]" />
              ) : (
                <TrendingDown className="size-4 text-[var(--danger)]" />
              )}
              <span className={`text-sm font-semibold ${isPositive ? 'text-[#22c55e]' : 'text-[var(--danger)]'}`}>
                {isPositive ? '+' : ''}
                {growth.toFixed(1)}% vs mês anterior
              </span>
            </div>
            <p className="mt-2 text-xs leading-6 text-[var(--text-soft)]">
              Evolução líquida da receita frente ao fechamento do mês passado.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">{label}</p>
      <p className="mt-1.5 text-sm font-semibold text-[var(--text-primary)]">{value}</p>
    </div>
  )
}
