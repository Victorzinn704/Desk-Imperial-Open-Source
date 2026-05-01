'use client'

import { useEffect, useRef, useState } from 'react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import type { FinanceSummaryResponse, ProductRecord } from '@contracts/contracts'
import {
  LAB_NUMERIC_COMPACT_CLASS,
  LAB_NUMERIC_HERO_CLASS,
  LAB_RESPONSIVE_FOUR_UP_GRID,
} from '@/components/design-lab/lab-primitives'
import { formatCurrency } from '@/lib/currency'
import { useLowPerformanceMode } from '@/hooks/use-performance'
import { CardSkeleton } from '@/components/shared/skeleton'
import { FinanceCategoryStructureChart } from './finance-category-structure-chart'
import { FinanceDoughnutChart } from './finance-doughnut-chart'
import { FinanceCategoryFlowPanel, type FinanceCategoryFlowTab } from './finance-category-flow-panel'

type Props = {
  finance: FinanceSummaryResponse
  isLoading?: boolean
  products?: ProductRecord[]
}

function AnimatedValue({ value, currency }: { value: number; currency: FinanceSummaryResponse['displayCurrency'] }) {
  const isLowPerformance = useLowPerformanceMode()
  const [displayed, setDisplayed] = useState(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (isLowPerformance) {
      rafRef.current = requestAnimationFrame(() => {
        setDisplayed(value)
      })
      return
    }

    const duration = 900
    const start = performance.now()
    const from = 0
    const to = value

    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - (1 - progress) ** 3
      setDisplayed(from + (to - from) * eased)
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [isLowPerformance, value])

  return (
    <span className={`inline-flex text-[var(--text-primary)] ${LAB_NUMERIC_HERO_CLASS}`}>
      {formatCurrency(displayed, currency)}
    </span>
  )
}

export function FinanceOverviewTotal({ finance, isLoading, products = [] }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<FinanceCategoryFlowTab>('products')

  if (isLoading) {
    return <CardSkeleton rows={1} />
  }

  const financeMix = buildFinanceMixSummary(finance)

  return (
    <div className="imperial-card p-6 sm:p-8">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.95fr)] xl:items-start">
        <FinanceOverviewPrimary
          activeCategory={selectedCategory}
          finance={financeMix}
          onSelectCategory={(category) => {
            setSelectedCategory(category)
            setSelectedCategoryTab('products')
          }}
        />
        <FinanceCategoryFlowPanel
          finance={financeMix}
          products={products}
          selectedCategory={selectedCategory}
          selectedTab={selectedCategoryTab}
          onSelectedCategoryChange={setSelectedCategory}
          onSelectedTabChange={setSelectedCategoryTab}
        />
      </div>
    </div>
  )
}

function FinanceOverviewPrimary({
  activeCategory,
  finance,
  onSelectCategory,
}: {
  activeCategory: string | null
  finance: FinanceSummaryResponse
  onSelectCategory: (category: string | null) => void
}) {
  const { totals, categoryBreakdown, displayCurrency } = finance
  const mixBreakdown = finance.salesCategoryBreakdown?.length ? finance.salesCategoryBreakdown : categoryBreakdown
  const growth = totals.revenueGrowthPercent
  const isPositive = growth >= 0

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-start">
        <div className="flex justify-center pt-1 lg:justify-start">
          <FinanceDoughnutChart
            activeCategory={activeCategory}
            categoryBreakdown={mixBreakdown}
            displayCurrency={displayCurrency}
            onSelectCategory={onSelectCategory}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
            Receita realizada total
          </p>
          <AnimatedValue currency={displayCurrency} value={totals.realizedRevenue} />
          <FinanceOverviewDelta
            categoryCount={mixBreakdown.length}
            currency={displayCurrency}
            growth={growth}
            isPositive={isPositive}
          />
          <FinanceOverviewMetricStrip displayCurrency={displayCurrency} totals={totals} />
        </div>
      </div>

      <FinanceCategoryStructureChart
        activeCategory={activeCategory}
        categoryBreakdown={mixBreakdown}
        displayCurrency={displayCurrency}
        onSelectCategory={(category) => onSelectCategory(category)}
      />
    </div>
  )
}

function buildFinanceMixSummary(finance: FinanceSummaryResponse): FinanceSummaryResponse {
  const categoryBreakdown = finance.salesCategoryBreakdown?.length
    ? finance.salesCategoryBreakdown
    : finance.categoryBreakdown

  return {
    ...finance,
    categoryBreakdown,
  }
}

function FinanceOverviewDelta({
  categoryCount,
  currency,
  growth,
  isPositive,
}: {
  categoryCount: number
  currency: FinanceSummaryResponse['displayCurrency']
  growth: number
  isPositive: boolean
}) {
  return (
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
        {categoryCount} categoria{categoryCount !== 1 ? 's' : ''} ativas
      </span>
      <span className="rounded-full border border-[rgba(0,140,255,0.3)] bg-[rgba(0,140,255,0.08)] px-2.5 py-0.5 text-xs font-semibold text-[#008CFF]">
        {currency}
      </span>
    </div>
  )
}

function FinanceOverviewMetricStrip({
  displayCurrency,
  totals,
}: {
  displayCurrency: FinanceSummaryResponse['displayCurrency']
  totals: FinanceSummaryResponse['totals']
}) {
  return (
    <div className="mt-2 overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--border)]">
      <div className={`grid gap-px bg-[var(--border)] ${LAB_RESPONSIVE_FOUR_UP_GRID}`}>
        <MetricTile label="Pedidos" value={String(totals.completedOrders)} />
        <MetricTile label="Lucro realizado" value={formatCurrency(totals.realizedProfit, displayCurrency)} />
        <MetricTile label="Margem média" value={`${totals.averageMarginPercent.toFixed(1)}%`} />
        <MetricTile label="Mês atual" value={formatCurrency(totals.currentMonthRevenue, displayCurrency)} />
      </div>
    </div>
  )
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--surface-soft)] px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">{label}</p>
      <p className={`mt-1 text-[var(--text-primary)] ${LAB_NUMERIC_COMPACT_CLASS}`}>{value}</p>
    </div>
  )
}
