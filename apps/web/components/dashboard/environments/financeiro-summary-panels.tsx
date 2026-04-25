'use client'

import Link from 'next/link'
import type { FinanceSummaryResponse, ProductRecord } from '@contracts/contracts'
import {
  LabFactPill,
  LAB_NUMERIC_COMPACT_CLASS,
  LAB_NUMERIC_SECTION_CLASS,
  LAB_RESPONSIVE_FOUR_UP_GRID,
  LabMiniStat,
  LabPageHeader,
  LabPanel,
  LabStatusPill,
  type LabStatusTone,
} from '@/components/design-lab/lab-primitives'
import { FinanceOverviewTotal } from '@/components/dashboard/finance-overview-total'
import { formatCurrency } from '@/lib/currency'
import { type FinanceiroView, financeiroViewCopy, formatPercent, viewLabel } from './financeiro-model'
import { buildFinanceRadar } from './financeiro-radar-model'

export type FinanceSnapshot = {
  averageMargin: number
  averageMarkup: number
  averageRevenuePerWindow: number
  averageTicket: number
  cancelledOrders: number
  completedOrders: number
  displayCurrency: FinanceSummaryResponse['displayCurrency']
  expenses: number
  lowStockItems: number
  peakRevenueLabel: string
  peakRevenueValue: number
  profit: number
  profitGrowthPercent: number
  realizedCost: number
  realizedProfit: number
  realizedRevenue: number
  revenue: number
  revenueGrowthPercent: number
  salesWindowCount: number
  topCategory: string
  topChannel: string
  topCustomer: string
  topCustomerRevenue: number
  view: FinanceiroView
}

export function FinanceiroHeader({
  snapshot,
}: Readonly<{
  snapshot: FinanceSnapshot
}>) {
  const copy = financeiroViewCopy[snapshot.view]

  return (
    <LabPageHeader
      description={copy.description}
      eyebrow={copy.eyebrow}
      meta={<FinanceMetaSummary snapshot={snapshot} />}
      title={copy.title}
    >
      <FinanceHeaderKpis snapshot={snapshot} />
    </LabPageHeader>
  )
}

export function FinanceiroAuthState({ view }: Readonly<{ view: FinanceiroView }>) {
  const copy = financeiroViewCopy[view]

  return (
    <section className="space-y-5">
      <LabPageHeader
        description={copy.description}
        eyebrow={copy.eyebrow}
        meta={
          <div className="space-y-3">
            <FinanceMetaRow label="sessão" tone="warning" value="entrar" />
            <FinanceMetaRow label="dados" tone="neutral" value="bloqueados" />
            <FinanceMetaRow label="aba" tone="info" value={view} />
          </div>
        }
        title={copy.title}
      >
        <div className={`grid gap-3 ${LAB_RESPONSIVE_FOUR_UP_GRID}`}>
          <LabMiniStat label="receita" value="R$ 0,00" />
          <LabMiniStat label="custo estimado" value="R$ 0,00" />
          <LabMiniStat label="lucro" value="R$ 0,00" />
          <LabMiniStat label={view === 'contas' ? 'ticket médio' : 'margem'} value={view === 'contas' ? 'R$ 0,00' : '0%'} />
        </div>
      </LabPageHeader>

      <LabPanel
        action={
          <Link
            className="inline-flex h-9 items-center rounded-[8px] border border-[var(--lab-blue-border)] bg-[var(--lab-blue-soft)] px-3 text-sm font-medium text-[var(--lab-blue)] transition hover:bg-[var(--lab-surface-hover)]"
            href="/login"
          >
            Entrar
          </Link>
        }
        padding="md"
        title="Autenticação necessária"
      >
        <div className={`grid gap-3 ${LAB_RESPONSIVE_FOUR_UP_GRID}`}>
          <FinanceAuthTile label="movimentação" value="bloqueada" />
          <FinanceAuthTile label="fluxo" value="bloqueado" />
          <FinanceAuthTile label="dre" value="bloqueada" />
          <FinanceAuthTile label="mapa" value="bloqueado" />
        </div>
      </LabPanel>
    </section>
  )
}

export function FinanceiroLabSummary({
  finance,
  products = [],
  snapshot,
}: Readonly<{
  finance: FinanceSummaryResponse | undefined
  products?: ProductRecord[]
  snapshot: FinanceSnapshot
}>) {
  if (snapshot.view !== 'movimentacao') {
    return null
  }

  return (
    <div className="space-y-5">
      {finance ? <FinanceOverviewTotal finance={finance} isLoading={false} products={products} /> : null}
      <FinanceRadarPanel finance={finance} snapshot={snapshot} />
    </div>
  )
}

function FinanceHeaderKpis({ snapshot }: Readonly<{ snapshot: FinanceSnapshot }>) {
  const metrics = buildFinanceHeaderMetrics(snapshot)
  const facts = buildFinanceHeaderFacts(snapshot)

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-[20px] border border-[var(--lab-border)] bg-[var(--lab-surface)]">
        <div className={`grid gap-px bg-[var(--lab-border)] ${LAB_RESPONSIVE_FOUR_UP_GRID}`}>
          {metrics.map((metric) => (
            <FinanceHeaderMetric
              description={metric.description}
              key={metric.label}
              label={metric.label}
              value={metric.value}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {facts.map((fact) => (
          <LabFactPill key={fact.label} label={fact.label} value={fact.value} />
        ))}
      </div>
    </div>
  )
}

function FinanceRadarPanel({
  finance,
  snapshot,
}: Readonly<{
  finance: FinanceSummaryResponse | undefined
  snapshot: FinanceSnapshot
}>) {
  const radar = buildFinanceRadar(finance, snapshot.displayCurrency)

  return (
    <LabPanel
      action={<LabStatusPill tone="neutral">{radar.categoryCount} categorias</LabStatusPill>}
      padding="md"
      title="Radar financeiro"
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_280px]">
        <div className="space-y-5">
          <div className="overflow-hidden rounded-[18px] border border-[var(--lab-border)] bg-[var(--lab-surface-raised)]">
            <div className={`grid gap-px bg-[var(--lab-border)] ${LAB_RESPONSIVE_FOUR_UP_GRID}`}>
              <FinanceStripStat label="receita" value={formatCurrency(snapshot.revenue, snapshot.displayCurrency)} />
              <FinanceStripStat label="margem" value={formatPercent(snapshot.averageMargin)} />
              <FinanceStripStat label="canal líder" value={radar.channelLead} />
              <FinanceStripStat label="cliente líder" value={radar.customerLead} />
            </div>
          </div>
          <FinanceChannelList channels={radar.channels} displayCurrency={snapshot.displayCurrency} />
        </div>

        <div className="space-y-4 border-t border-dashed border-[var(--lab-border)] pt-4 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
          <FinanceSignalRow label="recebido" tone="success" value={String(radar.completedOrders)} />
          <FinanceSignalRow label="cancelado" tone={radar.cancelTone} value={String(radar.cancelledOrders)} />
          <FinanceSignalRow label="categoria líder" tone="neutral" value={radar.categoryLead} />
          <FinanceSignalRow label="cliente líder" tone="info" value={radar.customerRevenue} />
        </div>
      </div>
    </LabPanel>
  )
}

function FinanceChannelList({
  channels,
  displayCurrency,
}: Readonly<{
  channels: FinanceSummaryResponse['salesByChannel']
  displayCurrency: FinanceSummaryResponse['displayCurrency']
}>) {
  if (channels.length === 0) {
    return null
  }

  return (
    <div className="space-y-1">
      {channels.map((channel) => (
        <div className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--lab-border)] px-1 py-4 last:border-b-0" key={channel.channel}>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--lab-fg)]">{channel.channel}</p>
            <p className="mt-1 text-xs text-[var(--lab-fg-soft)]">{channel.orders} pedidos no período</p>
          </div>
          <LabStatusPill tone="info">{formatCurrency(channel.revenue, displayCurrency)}</LabStatusPill>
        </div>
      ))}
    </div>
  )
}

function FinanceMetaSummary({ snapshot }: Readonly<{ snapshot: FinanceSnapshot }>) {
  const items = buildFinanceMetaItems(snapshot)

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <FinanceMetaRow key={item.label} label={item.label} tone={item.tone} value={item.value} />
      ))}
    </div>
  )
}

function FinanceStripStat({
  label,
  value,
}: Readonly<{
  label: string
  value: string
}>) {
  return (
    <div className="bg-[var(--lab-surface)] px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--lab-fg-muted)]">{label}</p>
      <p className={`mt-2 text-[var(--lab-fg)] ${LAB_NUMERIC_COMPACT_CLASS}`}>
        {value}
      </p>
    </div>
  )
}

function FinanceAuthTile({
  label,
  value,
}: Readonly<{
  label: string
  value: string
}>) {
  return (
    <div className="rounded-[18px] border border-dashed border-[var(--lab-border)] px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--lab-fg-muted)]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[var(--lab-fg)]">{value}</p>
    </div>
  )
}

function FinanceMetaRow({
  label,
  tone,
  value,
}: Readonly<{
  label: string
  tone: LabStatusTone
  value: string
}>) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--lab-border)] pb-3 last:border-b-0 last:pb-0">
      <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--lab-fg-muted)]">{label}</span>
      <LabStatusPill tone={tone}>{value}</LabStatusPill>
    </div>
  )
}

function FinanceSignalRow({
  label,
  tone,
  value,
}: Readonly<{
  label: string
  tone: LabStatusTone
  value: string
}>) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--lab-border)] pb-4 last:border-b-0 last:pb-0">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--lab-fg-muted)]">{label}</p>
      <LabStatusPill size="md" tone={tone}>{value}</LabStatusPill>
    </div>
  )
}

function FinanceHeaderMetric({
  label,
  value,
  description,
}: Readonly<{
  label: string
  value: string
  description: string
}>) {
  return (
    <article className="min-w-0 bg-[var(--lab-surface-raised)] px-5 py-5">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--lab-fg-muted)]">{label}</p>
      <p className={`mt-3 text-[var(--lab-fg)] ${LAB_NUMERIC_SECTION_CLASS}`}>
        {value}
      </p>
      <p className="mt-3 text-xs leading-5 text-[var(--lab-fg-soft)]">{description}</p>
    </article>
  )
}

function buildFinanceHeaderMetrics(snapshot: FinanceSnapshot) {
  switch (snapshot.view) {
    case 'fluxo':
      return [
        {
          label: 'entrada realizada',
          value: formatCurrency(snapshot.realizedRevenue, snapshot.displayCurrency),
          description: 'valor já convertido na curva atual',
        },
        {
          label: 'custo realizado',
          value: formatCurrency(snapshot.realizedCost, snapshot.displayCurrency),
          description: 'saída capturada no mesmo recorte',
        },
        {
          label: 'ritmo médio',
          value: formatCurrency(snapshot.averageRevenuePerWindow, snapshot.displayCurrency),
          description: 'média por janela de leitura',
        },
        {
          label: 'janelas',
          value: String(snapshot.salesWindowCount),
          description: 'pontos disponíveis na leitura do fluxo',
        },
      ]
    case 'dre':
      return [
        {
          label: 'receita bruta',
          value: formatCurrency(snapshot.revenue, snapshot.displayCurrency),
          description: 'entrada consolidada do período',
        },
        {
          label: 'custo realizado',
          value: formatCurrency(snapshot.realizedCost, snapshot.displayCurrency),
          description: 'custo registrado na base atual',
        },
        {
          label: 'lucro líquido',
          value: formatCurrency(snapshot.profit, snapshot.displayCurrency),
          description: 'resultado final do período',
        },
        {
          label: 'margem média',
          value: formatPercent(snapshot.averageMargin),
          description: 'retenção média sobre cada venda',
        },
      ]
    case 'contas':
      return [
        {
          label: 'recebido',
          value: formatCurrency(snapshot.realizedRevenue, snapshot.displayCurrency),
          description: 'valor realizado no período',
        },
        {
          label: 'ticket médio',
          value: formatCurrency(snapshot.averageTicket, snapshot.displayCurrency),
          description: 'média por pedido concluído',
        },
        {
          label: 'canal líder',
          value: snapshot.topChannel,
          description: 'origem dominante da receita atual',
        },
        {
          label: 'maior cliente',
          value: snapshot.topCustomer,
          description: 'cliente com maior concentração de receita',
        },
      ]
    case 'movimentacao':
    default:
      return [
        {
          label: 'receita',
          value: formatCurrency(snapshot.revenue, snapshot.displayCurrency),
          description: 'receita consolidada no período',
        },
        {
          label: 'lucro',
          value: formatCurrency(snapshot.profit, snapshot.displayCurrency),
          description: 'resultado líquido do recorte',
        },
        {
          label: 'pedidos',
          value: String(snapshot.completedOrders),
          description: 'volume já convertido em caixa',
        },
        {
          label: 'estoque em alerta',
          value: String(snapshot.lowStockItems),
          description: snapshot.lowStockItems > 0 ? 'itens pressionando a venda' : 'sem pressão crítica no estoque',
        },
      ]
  }
}

function buildFinanceHeaderFacts(snapshot: FinanceSnapshot) {
  switch (snapshot.view) {
    case 'fluxo':
      return [
        { label: 'visão ativa', value: viewLabel(snapshot.view) },
        { label: 'pico', value: snapshot.peakRevenueLabel },
        { label: 'pedidos', value: String(snapshot.completedOrders) },
      ]
    case 'dre':
      return [
        { label: 'visão ativa', value: viewLabel(snapshot.view) },
        { label: 'receita vs mês anterior', value: formatPercent(snapshot.revenueGrowthPercent) },
        { label: 'lucro vs mês anterior', value: formatPercent(snapshot.profitGrowthPercent) },
      ]
    case 'contas':
      return [
        { label: 'visão ativa', value: viewLabel(snapshot.view) },
        { label: 'canal líder', value: snapshot.topChannel },
        { label: 'cliente líder', value: snapshot.topCustomer },
      ]
    case 'movimentacao':
    default:
      return [
        { label: 'visão ativa', value: viewLabel(snapshot.view) },
        { label: 'ticket', value: formatCurrency(snapshot.averageTicket, snapshot.displayCurrency) },
        { label: 'margem', value: formatPercent(snapshot.averageMargin) },
      ]
  }
}

function buildFinanceMetaItems(snapshot: FinanceSnapshot) {
  switch (snapshot.view) {
    case 'fluxo':
      return [
        { label: 'pico da curva', value: snapshot.peakRevenueLabel, tone: 'info' as const },
        { label: 'janelas lidas', value: String(snapshot.salesWindowCount), tone: 'neutral' as const },
        {
          label: 'crescimento da receita',
          value: formatPercent(snapshot.revenueGrowthPercent),
          tone: snapshot.revenueGrowthPercent >= 0 ? ('success' as const) : ('danger' as const),
        },
      ]
    case 'dre':
      return [
        { label: 'lucro líquido', value: formatCurrency(snapshot.profit, snapshot.displayCurrency), tone: snapshot.profit >= 0 ? ('success' as const) : ('danger' as const) },
        { label: 'markup médio', value: formatPercent(snapshot.averageMarkup), tone: snapshot.averageMarkup >= 60 ? ('success' as const) : ('warning' as const) },
        { label: 'categoria líder', value: snapshot.topCategory, tone: 'neutral' as const },
      ]
    case 'contas':
      return [
        { label: 'maior cliente', value: snapshot.topCustomer, tone: 'neutral' as const },
        { label: 'canal líder', value: snapshot.topChannel, tone: 'info' as const },
        {
          label: 'cancelados',
          value: String(snapshot.cancelledOrders),
          tone: snapshot.cancelledOrders > 0 ? ('warning' as const) : ('success' as const),
        },
      ]
    case 'movimentacao':
    default:
      return [
        { label: 'pedidos concluídos', value: String(snapshot.completedOrders), tone: 'neutral' as const },
        { label: 'ticket médio', value: formatCurrency(snapshot.averageTicket, snapshot.displayCurrency), tone: 'info' as const },
        {
          label: 'estoque em alerta',
          value: String(snapshot.lowStockItems),
          tone: snapshot.lowStockItems > 0 ? ('warning' as const) : ('success' as const),
        },
      ]
  }
}
