import type { FinanceSummaryResponse, ProductRecord } from '@contracts/contracts'
import {
  LAB_NUMERIC_SECTION_CLASS,
  LAB_RESPONSIVE_FOUR_UP_GRID,
  LabFactPill,
  LabPanel,
  LabSignalRow,
  LabStatusPill,
  type LabStatusTone,
} from '@/components/design-lab/lab-primitives'
import { OverviewTopProducts } from '@/components/dashboard/overview-top-products'
import { OverviewRecentOrders } from '@/components/dashboard/overview-recent-orders'
import { SalesPerformanceCard } from '@/components/dashboard/sales-performance-card'
import { formatCurrency } from '@/lib/currency'
import { formatPercent, type OverviewSnapshot } from './overview-environment.model'

export function LabMetaRow({
  label,
  tone,
  value,
}: Readonly<{
  label: string
  tone: LabStatusTone
  value: string
}>) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--lab-border)] pb-3 last:border-b-0 last:pb-0">
      <span className="text-xs uppercase text-[var(--lab-fg-muted)]">{label}</span>
      <span className={`max-w-[56%] text-right ${labToneClass(tone)}`}>{value}</span>
    </div>
  )
}

export function OverviewExecutivePanel({
  dailyRevenueNeed,
  finance,
  isLoading,
  products,
  snapshot,
  targetProgress,
  targetRevenue,
}: Readonly<{
  dailyRevenueNeed: number
  finance: FinanceSummaryResponse | undefined
  isLoading: boolean
  products: ProductRecord[]
  snapshot: OverviewSnapshot
  targetProgress: number
  targetRevenue: number
}>) {
  return (
    <div className="space-y-5">
      <ExecutiveSummary
        dailyRevenueNeed={dailyRevenueNeed}
        snapshot={snapshot}
        targetProgress={targetProgress}
        targetRevenue={targetRevenue}
      />
      <ExecutiveCommercialGrid finance={finance} isLoading={isLoading} snapshot={snapshot} />
      <ExecutiveDemandGrid finance={finance} isLoading={isLoading} products={products} snapshot={snapshot} />
    </div>
  )
}

function ExecutiveSummary({
  dailyRevenueNeed,
  snapshot,
  targetProgress,
  targetRevenue,
}: Readonly<{
  dailyRevenueNeed: number
  snapshot: OverviewSnapshot
  targetProgress: number
  targetRevenue: number
}>) {
  return (
    <section className="space-y-3">
      <OverviewMetricBoard items={buildExecutiveMetricItems(snapshot)} />
      <ExecutiveFactPills
        dailyRevenueNeed={dailyRevenueNeed}
        snapshot={snapshot}
        targetProgress={targetProgress}
        targetRevenue={targetRevenue}
      />
    </section>
  )
}

function ExecutiveCommercialGrid({
  finance,
  isLoading,
  snapshot,
}: Readonly<{
  finance: FinanceSummaryResponse | undefined
  isLoading: boolean
  snapshot: OverviewSnapshot
}>) {
  const channelCount = (finance?.salesByChannel ?? []).slice(0, 4).length

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_360px] xl:items-start">
      <SalesPerformanceCard finance={finance} isLoading={isLoading} surface="lab" />
      <LabPanel
        action={<LabStatusPill tone="neutral">{channelCount} canais</LabStatusPill>}
        padding="md"
        title="Radar comercial"
      >
        <OverviewRadarSection finance={finance} snapshot={snapshot} />
      </LabPanel>
    </div>
  )
}

function ExecutiveDemandGrid({
  finance,
  isLoading,
  products,
  snapshot,
}: Readonly<{
  finance: FinanceSummaryResponse | undefined
  isLoading: boolean
  products: ProductRecord[]
  snapshot: OverviewSnapshot
}>) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] xl:items-start">
      <OverviewRecentOrders
        displayCurrency={snapshot.displayCurrency}
        isLoading={isLoading}
        orders={finance?.recentOrders ?? []}
        summaryText={snapshot.completedOrders > 0 ? `${snapshot.completedOrders} pedidos` : null}
        surface="lab"
      />
      <OverviewTopProducts finance={finance} isLoading={isLoading} products={products} surface="lab" />
    </div>
  )
}

function ExecutiveFactPills({
  dailyRevenueNeed,
  snapshot,
  targetProgress,
  targetRevenue,
}: Readonly<{
  dailyRevenueNeed: number
  snapshot: OverviewSnapshot
  targetProgress: number
  targetRevenue: number
}>) {
  const targetDeltaLabel =
    targetProgress >= 100
      ? 'meta coberta pelo ritmo atual'
      : `faltam ${formatCurrency(dailyRevenueNeed, snapshot.displayCurrency)} por dia útil`

  return (
    <div className="flex flex-wrap gap-2">
      <LabFactPill label="meta projetada" value={formatCurrency(targetRevenue, snapshot.displayCurrency)} />
      <LabFactPill label="ritmo diário" value={targetDeltaLabel} />
      <LabFactPill label="ticket médio" value={formatCurrency(snapshot.averageTicket, snapshot.displayCurrency)} />
      {snapshot.topProductName ? <LabFactPill label="produto líder" value={snapshot.topProductName} /> : null}
    </div>
  )
}

export function OverviewMetricBoard({
  items,
}: Readonly<{
  items: Array<{
    description: string
    label: string
    tone: LabStatusTone
    value: string
  }>
}>) {
  return (
    <div className="overflow-hidden rounded-[20px] border border-[var(--lab-border)] bg-[var(--lab-surface)]">
      <div className={`grid gap-px bg-[var(--lab-border)] ${LAB_RESPONSIVE_FOUR_UP_GRID}`}>
        {items.map((item) => (
          <article className="min-w-0 bg-[var(--lab-surface-raised)] px-5 py-5" key={item.label}>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--lab-fg-muted)]">{item.label}</p>
            <p className={`mt-3 text-[var(--lab-fg)] ${LAB_NUMERIC_SECTION_CLASS}`}>{item.value}</p>
            <p className={`mt-3 text-xs leading-5 ${labToneClass(item.tone)}`}>{item.description}</p>
          </article>
        ))}
      </div>
    </div>
  )
}

function OverviewRadarSection({
  finance,
  snapshot,
}: Readonly<{
  finance: FinanceSummaryResponse | undefined
  snapshot: OverviewSnapshot
}>) {
  const channels = finance?.salesByChannel.slice(0, 4) ?? []

  return (
    <div className="space-y-4">
      <LabSignalRow
        label="Ticket médio"
        note="Valor médio por pedido fechado."
        tone="info"
        value={formatCurrency(snapshot.averageTicket, snapshot.displayCurrency)}
      />
      <LabSignalRow
        label="Margem média"
        note="Qualidade do mix vendido neste período."
        tone={snapshot.averageMargin >= 30 ? 'success' : 'warning'}
        value={formatPercent(snapshot.averageMargin)}
      />
      <LabSignalRow
        label="Produto líder"
        note="Item com maior tração comercial até agora."
        tone="neutral"
        value={snapshot.topProductName ?? 'Sem destaque claro'}
      />
      <LabSignalRow
        label="Próxima ação"
        note="Sinal operacional derivado do estado atual."
        tone={snapshot.lowStockItems > 0 ? 'warning' : 'success'}
        value={nextActionLabel(snapshot)}
      />
      {channels.length > 0 ? <ChannelPills channels={channels} /> : null}
    </div>
  )
}

function ChannelPills({ channels }: Readonly<{ channels: Array<{ channel: string }> }>) {
  return (
    <div className="border-t border-dashed border-[var(--lab-border)] pt-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--lab-fg-muted)]">Canais no radar</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {channels.map((channel) => (
          <LabStatusPill key={channel.channel} tone="neutral">
            {channel.channel}
          </LabStatusPill>
        ))}
      </div>
    </div>
  )
}

function buildExecutiveMetricItems(snapshot: OverviewSnapshot): Array<{
  description: string
  label: string
  tone: LabStatusTone
  value: string
}> {
  const revenueTone: LabStatusTone = snapshot.revenueGrowth >= 0 ? 'success' : 'danger'
  const stockTone: LabStatusTone = snapshot.lowStockItems > 0 ? 'warning' : 'success'

  return [
    {
      description: `${snapshot.revenueGrowth >= 0 ? '+' : ''}${formatPercent(snapshot.revenueGrowth)} vs mês anterior`,
      label: 'receita do mês',
      tone: revenueTone,
      value: formatCurrency(snapshot.currentRevenue, snapshot.displayCurrency),
    },
    {
      description: `${snapshot.profitGrowth >= 0 ? '+' : ''}${formatPercent(snapshot.profitGrowth)} no lucro líquido`,
      label: 'lucro do mês',
      tone: snapshot.profitGrowth >= 0 ? 'success' : 'danger',
      value: formatCurrency(snapshot.currentProfit, snapshot.displayCurrency),
    },
    {
      description:
        snapshot.completedOrders > 0 ? 'pedidos já consolidados em caixa' : 'ainda sem fechamento no período',
      label: 'pedidos fechados',
      tone: 'info' as const,
      value: String(snapshot.completedOrders),
    },
    {
      description:
        snapshot.lowStockItems > 0
          ? `${snapshot.lowStockItems} itens pedem reposição`
          : 'sem alerta crítico de estoque',
      label: 'margem média',
      tone: stockTone,
      value: formatPercent(snapshot.averageMargin),
    },
  ]
}

function nextActionLabel(snapshot: OverviewSnapshot) {
  return snapshot.lowStockItems > 0 ? 'Repor insumos do campeão de vendas' : 'Sustentar giro do item que lidera o caixa'
}

function labToneClass(tone: LabStatusTone) {
  return {
    danger: 'text-[var(--lab-danger)]',
    info: 'text-[var(--lab-blue)]',
    neutral: 'text-[var(--lab-fg)]',
    success: 'text-[var(--lab-success)]',
    warning: 'text-[var(--lab-warning)]',
  }[tone]
}
