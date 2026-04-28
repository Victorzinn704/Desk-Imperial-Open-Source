'use client'

import type { CurrencyCode, FinanceSummaryResponse } from '@contracts/contracts'
import { ChartResponsiveContainer } from '@/components/dashboard/chart-responsive-container'
import { LabPanel, LabStatusPill } from '@/components/design-lab/lab-primitives'
import { ChartSkeleton, Skeleton } from '@/components/shared/skeleton'
import { formatCompactCurrency, formatCurrency } from '@/lib/currency'
import dynamic from 'next/dynamic'
import { SalesPerformanceTooltip } from './sales-performance-tooltip'

const LazyPerformanceChart = dynamic(
  () => import('./sales-performance-chart').then((mod) => mod.SalesPerformanceChart),
  { ssr: false, loading: () => <ChartSkeleton /> },
)

type SharedPanelProps = Readonly<{
  finance?: FinanceSummaryResponse
  isLoading?: boolean
  isLowPerformance: boolean
  isChartReady: boolean
}>

function getLabPanelCopy(isOrdersTicket: boolean) {
  return isOrdersTicket
    ? {
        title: 'Pedidos e ticket médio',
        subtitle: 'Volume concluído e ticket médio por período.',
      }
    : {
        title: 'Receita e lucro',
        subtitle: 'Ritmo de receita e lucro no período atual.',
      }
}

function ChartLegend({ isOrdersTicket, tone = 'default' }: { isOrdersTicket: boolean; tone?: 'default' | 'lab' }) {
  const toneTextClass = tone === 'lab' ? 'text-[var(--lab-fg-muted)]' : 'text-[var(--text-muted)]'
  const dotClass =
    tone === 'lab' ? 'bg-[var(--lab-blue)] ring-[var(--lab-blue)]' : 'bg-[var(--accent)] ring-[var(--accent)]'
  let lineClass = 'bg-[var(--success)]'
  if (isOrdersTicket) {
    lineClass = 'bg-[#C9A84C]'
  } else if (tone === 'lab') {
    lineClass = 'bg-[var(--lab-success)]'
  }

  return (
    <div className={`flex items-center gap-3 text-[11px] uppercase tracking-[0.14em] ${toneTextClass}`}>
      <span className="flex items-center gap-1.5">
        <span className={`h-2 w-2 rounded-full ${dotClass} opacity-80 ring-1`} />
        {isOrdersTicket ? 'Pedidos' : 'Receita'}
      </span>
      <span className="flex items-center gap-1.5">
        <span className={`h-[2px] w-3 rounded-full ${lineClass}`} />
        {isOrdersTicket ? 'Ticket médio' : 'Lucro'}
      </span>
    </div>
  )
}

function LabSalesHeadline({
  isLoading,
  isOrdersTicket,
  averageTicket,
  revenueTotal,
  displayCurrency,
}: {
  isLoading: boolean
  isOrdersTicket: boolean
  averageTicket: number
  revenueTotal: number
  displayCurrency: CurrencyCode
}) {
  let headlineValue = '—'
  if (!isLoading) {
    headlineValue = isOrdersTicket
      ? formatCurrency(averageTicket, displayCurrency)
      : formatCurrency(revenueTotal, displayCurrency)
  }

  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--lab-fg-muted)]">
          {isOrdersTicket ? 'ticket médio atual' : 'receita consolidada'}
        </p>
        <p className="mt-2 text-2xl font-semibold text-[var(--lab-fg)]">{headlineValue}</p>
      </div>
      <ChartLegend isOrdersTicket={isOrdersTicket} tone="lab" />
    </div>
  )
}

function DefaultSalesHeader({
  finance,
  isLoading,
  displayCurrency,
}: {
  finance?: FinanceSummaryResponse
  isLoading: boolean
  displayCurrency: CurrencyCode
}) {
  return (
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
  )
}

function LabChartEmptyState() {
  return (
    <div className="flex h-full items-center justify-center rounded-[12px] border border-dashed border-[var(--lab-border)] bg-[var(--lab-surface-raised)]">
      <p className="text-xs text-[var(--lab-fg-muted)]">Sem dados de vendas ainda</p>
    </div>
  )
}

function DefaultChartEmptyState() {
  return (
    <div className="flex h-full items-center justify-center rounded-[8px] border border-dashed border-[var(--border-strong)] bg-[color-mix(in_srgb,var(--surface-muted)_64%,transparent)]">
      <p className="text-xs text-[var(--text-muted)]">Sem dados de vendas ainda</p>
    </div>
  )
}

function ChartBlock({
  timeline,
  displayCurrency,
  isLoading = false,
  isChartReady,
  isLowPerformance,
  mode,
  heightClassName,
  emptyState,
  surface,
}: {
  timeline: FinanceSummaryResponse['revenueTimeline']
  displayCurrency: CurrencyCode
  isLoading?: boolean
  isChartReady: boolean
  isLowPerformance: boolean
  mode: 'revenue-profit' | 'orders-ticket'
  heightClassName: string
  emptyState: React.ReactElement
  surface: 'default' | 'lab'
}) {
  if (isLoading) {
    return (
      <Skeleton className={`w-full ${heightClassName} ${surface === 'lab' ? 'rounded-[12px]' : 'rounded-[8px]'}`} />
    )
  }

  if (!isChartReady) {
    return (
      <Skeleton className={`w-full ${heightClassName} ${surface === 'lab' ? 'rounded-[12px]' : 'rounded-[8px]'}`} />
    )
  }

  if (!timeline.length) {
    return emptyState
  }

  return (
    <ChartResponsiveContainer>
      <LazyPerformanceChart
        displayCurrency={displayCurrency}
        formatCompactFn={formatCompactCurrency}
        isAnimationActive={!isLowPerformance}
        mode={mode}
        timeline={timeline}
        tooltipContent={<SalesPerformanceTooltip displayCurrency={displayCurrency} surface={surface} variant={mode} />}
      />
    </ChartResponsiveContainer>
  )
}

export function LabSalesPerformancePanel({
  finance,
  isLoading = false,
  isLowPerformance,
  isChartReady,
  variant,
}: SharedPanelProps & { variant: 'revenue-profit' | 'orders-ticket' }) {
  const timeline = finance?.revenueTimeline ?? []
  const displayCurrency = finance?.displayCurrency ?? 'BRL'
  const revenueTotal = finance?.totals.currentMonthRevenue ?? 0
  const totalOrders = finance?.totals.completedOrders ?? 0
  const averageTicket = totalOrders > 0 ? revenueTotal / totalOrders : 0
  const isOrdersTicket = variant === 'orders-ticket'
  const { title, subtitle } = getLabPanelCopy(isOrdersTicket)

  return (
    <LabPanel
      action={
        <LabStatusPill tone="info">{timeline.length > 0 ? `${timeline.length} períodos` : 'sem leitura'}</LabStatusPill>
      }
      padding="md"
      subtitle={subtitle}
      title={title}
    >
      <div className="space-y-4">
        <LabSalesHeadline
          averageTicket={averageTicket}
          displayCurrency={displayCurrency}
          isLoading={isLoading}
          isOrdersTicket={isOrdersTicket}
          revenueTotal={revenueTotal}
        />
        <div className="h-[216px] w-full">
          <ChartBlock
            displayCurrency={displayCurrency}
            emptyState={<LabChartEmptyState />}
            heightClassName="h-[216px]"
            isChartReady={isChartReady}
            isLoading={isLoading}
            isLowPerformance={isLowPerformance}
            mode={variant}
            surface="lab"
            timeline={timeline}
          />
        </div>
      </div>
    </LabPanel>
  )
}

export function DefaultSalesPerformancePanel({
  finance,
  isLoading = false,
  isLowPerformance,
  isChartReady,
}: SharedPanelProps) {
  const timeline = finance?.revenueTimeline ?? []
  const displayCurrency = finance?.displayCurrency ?? 'BRL'

  return (
    <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-panel)]">
      <DefaultSalesHeader displayCurrency={displayCurrency} finance={finance} isLoading={isLoading} />

      <div className="mb-4 h-[188px] w-full">
        <ChartBlock
          displayCurrency={displayCurrency}
          emptyState={<DefaultChartEmptyState />}
          heightClassName="h-[188px]"
          isChartReady={isChartReady}
          isLoading={isLoading}
          isLowPerformance={isLowPerformance}
          mode="revenue-profit"
          surface="default"
          timeline={timeline}
        />
      </div>

      <div className="flex items-center justify-between gap-4 text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
        <p>últimos {timeline.length > 0 ? timeline.length : 6} períodos</p>
        <ChartLegend isOrdersTicket={false} />
      </div>
    </div>
  )
}
