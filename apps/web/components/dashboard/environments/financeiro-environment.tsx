'use client'

import { ArrowDownRight, ArrowUpRight, BarChart3, Percent, Wallet } from 'lucide-react'
import type { FinanceSummaryResponse } from '@contracts/contracts'
import type { DashboardTabId } from '@/components/dashboard/dashboard-navigation'
import { FinanceOrdersTable } from '@/components/dashboard/finance-orders-table'
import { SalesPerformanceCard } from '@/components/dashboard/sales-performance-card'
import {
  LabMetric,
  LabPageHeader,
  LabPanel,
  LabStatusPill,
  type LabStatusTone,
} from '@/components/design-lab/lab-primitives'
import { useDashboardQueries } from '@/components/dashboard/hooks/useDashboardQueries'
import { ApiError } from '@/lib/api'
import { formatCurrency } from '@/lib/currency'

type FinanceiroView = 'movimentacao' | 'fluxo' | 'dre' | 'contas'

const viewCopy: Record<FinanceiroView, { eyebrow: string; title: string; description: string }> = {
  movimentacao: {
    eyebrow: 'Visao financeira',
    title: 'Movimentacao do periodo',
    description: 'Receita, resultado e distribuicao por categoria em uma leitura limpa, direta e sem empilhamento gratuito.',
  },
  fluxo: {
    eyebrow: 'Fluxo de caixa',
    title: 'Entrada e saida por periodo',
    description: 'A leitura privilegia ritmo de caixa, canais e o historico mais recente da operacao.',
  },
  dre: {
    eyebrow: 'DRE gerencial',
    title: 'Resultado do negocio',
    description: 'Um quadro direto para comparar receita, custo estimado, margem e resultado sem ruido visual.',
  },
  contas: {
    eyebrow: 'Contas operacionais',
    title: 'Receber e acompanhamento',
    description: 'Sem inventar ERP. Aqui a leitura usa o que ja existe no caixa para acompanhar o periodo.',
  },
}

export function FinanceiroEnvironment({ activeTab }: Readonly<{ activeTab: DashboardTabId | null }>) {
  const { sessionQuery, financeQuery } = useDashboardQueries({ section: 'financeiro' })
  const user = sessionQuery.data?.user
  const finance = financeQuery.data
  const financeError = financeQuery.error instanceof ApiError ? financeQuery.error.message : null

  if (!user) return null

  const view = resolveFinanceView(activeTab)
  const copy = viewCopy[view]
  const displayCurrency = (finance?.displayCurrency ??
    user.preferredCurrency) as FinanceSummaryResponse['displayCurrency']
  const totals = finance?.totals
  const revenue = totals?.currentMonthRevenue ?? 0
  const profit = totals?.currentMonthProfit ?? 0
  const expenses = Math.max(0, revenue - profit)
  const completedOrders = totals?.completedOrders ?? 0
  const averageMargin = totals?.averageMarginPercent ?? 0
  const averageTicket = completedOrders > 0 ? revenue / Math.max(1, completedOrders) : 0

  return (
    <section className="space-y-5">
      <LabPageHeader
        description={copy.description}
        eyebrow={copy.eyebrow}
        meta={
          <FinanceMetaSummary
            averageTicket={averageTicket}
            completedOrders={completedOrders}
            displayCurrency={displayCurrency}
            averageMargin={averageMargin}
          />
        }
        title={copy.title}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <FinanceMetricTile
          hint="caixa bruto consolidado no periodo"
          icon={Wallet}
          label="receita do mes"
          tone="info"
          value={formatCurrency(revenue, displayCurrency)}
        />
        <FinanceMetricTile
          hint="despesas e custos estimados"
          icon={ArrowDownRight}
          label="custo estimado"
          tone="neutral"
          value={formatCurrency(expenses, displayCurrency)}
        />
        <FinanceMetricTile
          hint="resultado liquido atual"
          icon={ArrowUpRight}
          label="lucro liquido"
          tone={profit >= 0 ? 'success' : 'danger'}
          value={formatCurrency(profit, displayCurrency)}
        />
        <FinanceMetricTile
          hint={view === 'contas' ? 'media por pedido concluido' : 'qualidade do mix vendido'}
          icon={Percent}
          label={view === 'contas' ? 'ticket medio' : 'margem media'}
          tone="info"
          value={view === 'contas' ? formatCurrency(averageTicket, displayCurrency) : formatPercent(averageMargin)}
        />
      </div>

      {financeError ? (
        <LabPanel padding="md">
          <p className="text-sm text-[var(--danger)]">{financeError}</p>
        </LabPanel>
      ) : null}

      {!financeError ? renderFinanceView(view, finance, financeQuery.isLoading, displayCurrency) : null}
    </section>
  )
}

function renderFinanceView(
  view: FinanceiroView,
  finance: FinanceSummaryResponse | undefined,
  isLoading: boolean,
  displayCurrency: FinanceSummaryResponse['displayCurrency'],
) {
  switch (view) {
    case 'fluxo':
      return (
        <>
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
            <FinanceLedgerPanel displayCurrency={displayCurrency} finance={finance} />
            <FinanceCategoryPanel finance={finance} isCompact />
          </div>
          <FinanceOrdersBlock
            description="Pedidos registrados no periodo, usados como base para leitura do caixa."
            displayCurrency={displayCurrency}
            orders={finance?.recentOrders ?? []}
            title="Fluxo recente"
          />
        </>
      )
    case 'dre':
      return (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
          <DreStatementPanel displayCurrency={displayCurrency} finance={finance} />
          <FinanceCategoryPanel finance={finance} />
        </div>
      )
    case 'contas':
      return (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
          <FinanceOrdersBlock
            description="Leitura operacional das transacoes confirmadas e canceladas do periodo."
            displayCurrency={displayCurrency}
            orders={finance?.recentOrders ?? []}
            title="Contas do periodo"
          />
          <AccountsSummaryPanel displayCurrency={displayCurrency} finance={finance} />
        </div>
      )
    case 'movimentacao':
    default:
      return (
        <>
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
            <SalesPerformanceCard finance={finance} isLoading={isLoading} />
            <FinanceCategoryPanel finance={finance} />
          </div>
          <FinanceOrdersBlock
            description="Ultimas movimentacoes registradas no financeiro do workspace."
            displayCurrency={displayCurrency}
            orders={finance?.recentOrders ?? []}
            title="Lancamentos recentes"
          />
        </>
      )
  }
}

function resolveFinanceView(activeTab: DashboardTabId | null): FinanceiroView {
  if (activeTab === 'fluxo' || activeTab === 'dre' || activeTab === 'contas') {
    return activeTab
  }

  return 'movimentacao'
}

function formatPercent(value: number) {
  return `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: Math.abs(value) < 10 ? 1 : 0,
    maximumFractionDigits: 1,
  }).format(value)}%`
}

function FinanceMetaSummary({
  averageMargin,
  averageTicket,
  completedOrders,
  displayCurrency,
}: Readonly<{
  averageMargin: number
  averageTicket: number
  completedOrders: number
  displayCurrency: FinanceSummaryResponse['displayCurrency']
}>) {
  const items = [
    { label: 'pedidos concluidos', value: String(completedOrders), tone: 'neutral' as const },
    { label: 'ticket medio', value: formatCurrency(averageTicket, displayCurrency), tone: 'info' as const },
    {
      label: 'margem media',
      value: formatPercent(averageMargin),
      tone: averageMargin >= 30 ? 'success' as const : 'warning' as const,
    },
  ]

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--lab-border)] pb-3 last:border-b-0 last:pb-0" key={item.label}>
          <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--lab-fg-muted)]">{item.label}</span>
          <LabStatusPill tone={item.tone}>{item.value}</LabStatusPill>
        </div>
      ))}
    </div>
  )
}

function FinanceMetricTile({
  hint,
  icon,
  label,
  tone,
  value,
}: Readonly<{
  hint: string
  icon: typeof Wallet
  label: string
  tone: LabStatusTone
  value: string
}>) {
  return <LabMetric className="h-full" hint={hint} icon={icon} label={label} value={value} delta={toneLabel(tone)} deltaTone={tone} />
}

function toneLabel(tone: LabStatusTone) {
  switch (tone) {
    case 'success':
      return 'saudavel'
    case 'danger':
      return 'atencao'
    case 'warning':
      return 'monitorar'
    case 'neutral':
      return 'base'
    case 'info':
    default:
      return 'foco'
  }
}

function FinanceOrdersBlock({
  description,
  displayCurrency,
  orders,
  title,
}: Readonly<{
  description: string
  displayCurrency: FinanceSummaryResponse['displayCurrency']
  orders: FinanceSummaryResponse['recentOrders']
  title: string
}>) {
  return (
    <LabPanel
      action={<LabStatusPill tone="neutral">{orders.length} itens</LabStatusPill>}
      padding="md"
      subtitle={description}
      title={title}
    >
      <FinanceOrdersTable displayCurrency={displayCurrency as FinanceSummaryResponse['displayCurrency']} orders={orders} />
    </LabPanel>
  )
}

function FinanceCategoryPanel({
  finance,
  isCompact = false,
}: Readonly<{
  finance?: FinanceSummaryResponse
  isCompact?: boolean
}>) {
  const displayCurrency = finance?.displayCurrency ?? 'BRL'
  const categories = finance?.categoryBreakdown.slice(0, isCompact ? 4 : 6) ?? []
  const total = categories.reduce((sum, category) => sum + category.inventorySalesValue, 0)

  return (
    <LabPanel
      action={<BarChart3 className="size-4 text-[var(--accent)]" />}
      padding="md"
      subtitle="Peso financeiro do estoque no periodo."
      title="Categorias"
    >
      <div className="space-y-3">
        {categories.length > 0 ? (
          categories.map((category) => {
            const pct = total > 0 ? (category.inventorySalesValue / total) * 100 : 0
            return (
              <div key={category.category}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-[var(--text-primary)]">{category.category}</span>
                  <span className="shrink-0 text-[var(--text-soft)]">
                    {formatCurrency(category.inventorySalesValue, displayCurrency)} · {pct.toFixed(0)}%
                  </span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-[color-mix(in_srgb,var(--border)_70%,transparent)]">
                  <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.max(6, Math.min(100, pct))}%` }} />
                </div>
              </div>
            )
          })
        ) : (
          <p className="text-sm text-[var(--text-soft)]">Sem categorias suficientes para leitura agora.</p>
        )}
      </div>
    </LabPanel>
  )
}

function FinanceLedgerPanel({
  displayCurrency,
  finance,
}: Readonly<{
  displayCurrency: FinanceSummaryResponse['displayCurrency']
  finance?: FinanceSummaryResponse
}>) {
  const timeline = finance?.revenueTimeline ?? []

  return (
    <LabPanel
      action={<LabStatusPill tone="neutral">{timeline.length || 0} periodos</LabStatusPill>}
      padding="md"
      subtitle="Cada linha mostra receita, lucro e pedidos do bloco."
      title="Fluxo consolidado"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-dashed border-[var(--border-strong)] text-left text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
              <th className="px-0 py-3 font-semibold">Periodo</th>
              <th className="px-0 py-3 font-semibold text-right">Receita</th>
              <th className="px-0 py-3 font-semibold text-right">Lucro</th>
              <th className="px-0 py-3 font-semibold text-right">Pedidos</th>
            </tr>
          </thead>
          <tbody>
            {timeline.length > 0 ? (
              timeline.map((row) => (
                <tr className="border-b border-dashed border-[var(--border)]" key={row.label}>
                  <td className="px-0 py-3 text-[var(--text-primary)]">{row.label}</td>
                  <td className="px-0 py-3 text-right text-[var(--text-primary)]">{formatCurrency(row.revenue, displayCurrency)}</td>
                  <td className="px-0 py-3 text-right text-[var(--text-soft)]">{formatCurrency(row.profit, displayCurrency)}</td>
                  <td className="px-0 py-3 text-right text-[var(--text-soft)]">{row.orders}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-0 py-8 text-sm text-[var(--text-soft)]" colSpan={4}>
                  Sem historico suficiente para montar o fluxo agora.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </LabPanel>
  )
}

function DreStatementPanel({
  displayCurrency,
  finance,
}: Readonly<{
  displayCurrency: FinanceSummaryResponse['displayCurrency']
  finance?: FinanceSummaryResponse
}>) {
  const totals = finance?.totals
  const revenue = totals?.currentMonthRevenue ?? 0
  const profit = totals?.currentMonthProfit ?? 0
  const estimatedCosts = Math.max(0, revenue - profit)
  const rows = [
    { label: 'Receita bruta', value: formatCurrency(revenue, displayCurrency), tone: 'neutral' as const },
    { label: 'Custo + despesas estimadas', value: formatCurrency(estimatedCosts, displayCurrency), tone: 'neutral' as const },
    { label: 'Lucro liquido', value: formatCurrency(profit, displayCurrency), tone: 'success' as const },
    { label: 'Margem media', value: formatPercent(totals?.averageMarginPercent ?? 0), tone: 'info' as const },
    { label: 'Pedidos concluidos', value: String(totals?.completedOrders ?? 0), tone: 'neutral' as const },
  ]

  return (
    <LabPanel padding="md" subtitle="Leitura gerencial baseada no consolidado disponivel hoje." title="Demonstracao resumida">
      <div className="space-y-2">
        {rows.map((row) => (
          <div className="flex items-center justify-between gap-4 rounded-[12px] border border-[var(--border)] px-4 py-3" key={row.label}>
            <span className="text-sm text-[var(--text-soft)]">{row.label}</span>
            <LabStatusPill tone={row.tone}>{row.value}</LabStatusPill>
          </div>
        ))}
      </div>
    </LabPanel>
  )
}

function AccountsSummaryPanel({
  displayCurrency,
  finance,
}: Readonly<{
  displayCurrency: FinanceSummaryResponse['displayCurrency']
  finance?: FinanceSummaryResponse
}>) {
  const recentOrders = finance?.recentOrders ?? []
  const confirmed = recentOrders.filter((order) => order.status === 'COMPLETED')
  const cancelled = recentOrders.filter((order) => order.status === 'CANCELLED')
  const topCustomer = finance?.topCustomers[0]
  const channels = finance?.salesByChannel.slice(0, 4) ?? []

  return (
    <LabPanel padding="md" subtitle="Um quadro curto para acompanhar recebimento, cancelamento e origem." title="Resumo de contas">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <SummaryRow
          label="Recebido"
          tone="success"
          value={formatCurrency(
            confirmed.reduce((sum, order) => sum + order.totalRevenue, 0),
            displayCurrency,
          )}
        />
        <SummaryRow
          label="Cancelado"
          tone="danger"
          value={formatCurrency(
            cancelled.reduce((sum, order) => sum + order.totalRevenue, 0),
            displayCurrency,
          )}
        />
        <SummaryRow
          label="Maior cliente"
          tone="info"
          value={topCustomer ? `${topCustomer.customerName} · ${formatCurrency(topCustomer.revenue, displayCurrency)}` : 'Sem registro'}
        />
      </div>

      <div className="mt-5 space-y-2">
        {channels.map((channel) => (
          <div className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--border)] pb-2 last:border-b-0 last:pb-0" key={channel.channel}>
            <span className="text-sm text-[var(--text-primary)]">{channel.channel}</span>
            <span className="text-sm text-[var(--text-soft)]">
              {channel.orders} pedidos · {formatCurrency(channel.revenue, displayCurrency)}
            </span>
          </div>
        ))}
      </div>
    </LabPanel>
  )
}

function SummaryRow({
  label,
  tone,
  value,
}: Readonly<{
  label: string
  tone: LabStatusTone
  value: string
}>) {
  return (
    <div className="rounded-[12px] border border-[var(--border)] px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</p>
      <div className="mt-2">
        <LabStatusPill tone={tone}>{value}</LabStatusPill>
      </div>
    </div>
  )
}
