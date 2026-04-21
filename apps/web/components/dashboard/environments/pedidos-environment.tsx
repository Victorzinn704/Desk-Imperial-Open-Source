'use client'

import Link from 'next/link'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ClipboardList, ReceiptText, Rows3, SquareKanban } from 'lucide-react'
import type { OrderRecord } from '@contracts/contracts'
import type { DashboardTabId } from '@/components/dashboard/dashboard-navigation'
import {
  LabEmptyState,
  LabFactPill,
  LabMiniStat,
  LabMetric,
  LabMetricStrip,
  LabMetricStripItem,
  LAB_RESPONSIVE_FOUR_UP_GRID,
  LabPageHeader,
  LabPanel,
  LabSignalRow,
  LabStatusPill,
  LabTable,
  type LabStatusTone,
} from '@/components/design-lab/lab-primitives'
import { useDashboardQueries } from '@/components/dashboard/hooks/useDashboardQueries'
import { ApiError, fetchOrders } from '@/lib/api'
import { formatCurrency } from '@/lib/currency'
import { formatOrderReference } from '@/lib/order-reference'

type PedidosView = 'tabela' | 'timeline' | 'kanban' | 'detalhe' | 'historico'
type PedidosSurface = 'legacy' | 'lab'

const viewCopy: Record<PedidosView, { eyebrow: string; title: string; description: string }> = {
  tabela: {
    eyebrow: 'Tabela com filtros',
    title: 'Pedidos do periodo',
    description: 'Histórico, status e receita.',
  },
  timeline: {
    eyebrow: 'Linha do tempo',
    title: 'Sequencia de eventos',
    description: 'Ritmo e sequência operacional.',
  },
  kanban: {
    eyebrow: 'Kanban por status',
    title: 'Status dos pedidos',
    description: 'Concluídos, cancelados e pendências.',
  },
  detalhe: {
    eyebrow: 'Detalhe do pedido',
    title: 'Pedido selecionado',
    description: 'Itens, cliente e valores.',
  },
  historico: {
    eyebrow: 'Historico consolidado',
    title: 'Auditoria operacional',
    description: 'Leitura diaria de pedidos, operadores, canais e ocorrencias.',
  },
}

export function PedidosEnvironment({
  activeTab,
  surface = 'legacy',
}: Readonly<{ activeTab: DashboardTabId | 'historico' | null; surface?: PedidosSurface }>) {
  const { sessionQuery } = useDashboardQueries({ section: 'pedidos' })
  const view = resolvePedidosView(activeTab)
  const copy = viewCopy[view]
  const user = sessionQuery.data?.user
  const ordersQuery = useQuery({
    queryKey: ['orders', 'detail', 'pedidos'],
    queryFn: () => fetchOrders({ includeCancelled: true, includeItems: true }),
    enabled: Boolean(user),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  if (sessionQuery.isLoading) {
    return (
      <section className="space-y-5">
        <LabPageHeader description={copy.description} eyebrow={copy.eyebrow} title={copy.title} />
        <LabPanel padding="md">
          <p className="text-sm text-[var(--lab-fg-soft)]">Carregando sessão para abrir a visão de pedidos.</p>
        </LabPanel>
      </section>
    )
  }

  if (!user) {
    return <PedidosLockedState copy={copy} view={view} />
  }

  const orders = ordersQuery.data?.items ?? []
  const totals = ordersQuery.data?.totals
  const displayCurrency = user.preferredCurrency as OrderRecord['displayCurrency']
  const error = ordersQuery.error instanceof ApiError ? ordersQuery.error.message : null
  const insights = buildPedidosInsights({ orders, totals })
  const headerStats = buildPedidosHeaderStats({
    currency: displayCurrency,
    insights,
    view,
  })

  return (
    <section className="space-y-5">
      <LabPageHeader
        description={copy.description}
        eyebrow={copy.eyebrow}
        meta={<PedidosMetaSummary currency={displayCurrency} insights={insights} view={view} />}
        title={copy.title}
      >
        {surface === 'lab' ? (
          <LabMetricStrip>
            {headerStats.map((stat) => (
              <LabMetricStripItem
                description={stat.description}
                key={stat.label}
                label={stat.label}
                value={stat.value}
              />
            ))}
          </LabMetricStrip>
        ) : (
          <div className={`grid gap-3 ${LAB_RESPONSIVE_FOUR_UP_GRID}`}>
            {headerStats.map((stat) => (
              <LabMiniStat description={stat.description} key={stat.label} label={stat.label} value={stat.value} />
            ))}
          </div>
        )}
      </LabPageHeader>

      {surface === 'legacy' ? (
        <div className={`grid gap-4 ${LAB_RESPONSIVE_FOUR_UP_GRID}`}>
          <PedidosMetricTile hint="pedidos liquidados no periodo" icon={ClipboardList} label="concluidos" value={String(totals?.completedOrders ?? 0)} />
          <PedidosMetricTile hint="pedidos cancelados" icon={Rows3} label="cancelados" value={String(totals?.cancelledOrders ?? 0)} tone="danger" />
          <PedidosMetricTile hint="receita realizada pelo historico atual" icon={ReceiptText} label="receita" value={formatCurrency(totals?.realizedRevenue ?? 0, displayCurrency)} tone="success" />
          <PedidosMetricTile hint="media por pedido concluido" icon={SquareKanban} label="ticket medio" value={formatCurrency(insights.averageTicket, displayCurrency)} />
        </div>
      ) : null}

      {!error && surface === 'lab' ? (
        <PedidosLabSummary currency={displayCurrency} insights={insights} view={view} />
      ) : null}

      {error ? (
        <LabPanel padding="md">
          <p className="text-sm text-[var(--danger)]">{error}</p>
        </LabPanel>
      ) : null}

      {!error && view === 'tabela' ? <OrdersTablePanel currency={displayCurrency} orders={orders} /> : null}
      {!error && view === 'timeline' ? <OrdersTimelinePanel currency={displayCurrency} orders={orders} /> : null}
      {!error && view === 'kanban' ? <OrdersKanbanPanel currency={displayCurrency} orders={orders} /> : null}
      {!error && view === 'detalhe' ? <OrderDetailPanel currency={displayCurrency} order={orders[0] ?? null} /> : null}
      {!error && view === 'historico' ? <OrdersHistoryPanel currency={displayCurrency} orders={orders} /> : null}
    </section>
  )
}

type PedidosInsights = {
  sortedOrders: OrderRecord[]
  groups: Array<{ key: string; label: string; orders: OrderRecord[] }>
  latest: OrderRecord | null
  biggest: OrderRecord | null
  topChannel: { channel: string; count: number } | null
  topOperator: { name: string; revenue: number } | null
  busiestDay: { key: string; label: string; orders: OrderRecord[] } | null
  completedCount: number
  cancelledCount: number
  completedRevenue: number
  completedProfit: number
  totalItems: number
  uniqueChannels: number
  uniqueOperators: number
  activeDays: number
  averagePerDay: number
  ordersToday: number
  averageTicket: number
  cancelRate: string
  lastCancelled: OrderRecord | null
}

type PedidosHeaderStat = {
  label: string
  value: string
  description: string
}

type PedidosSummaryRow = {
  label: string
  value: string
  note?: string
  tone?: LabStatusTone
}

type PedidosSummaryConfig = {
  primaryTitle: string
  primaryAction: string
  primaryFacts?: Array<{ label: string; value: string }>
  primaryRows: PedidosSummaryRow[]
  secondaryTitle: string
  secondaryAction: string
  secondaryRows: PedidosSummaryRow[]
}

const KANBAN_COLUMN_PREVIEW_LIMIT = 6

function PedidosLockedState({
  copy,
  view,
}: Readonly<{
  copy: (typeof viewCopy)[PedidosView]
  view: PedidosView
}>) {
  const preview = buildLockedPedidosPreview(view)

  return (
    <section className="space-y-5">
      <LabPageHeader description={copy.description} eyebrow={copy.eyebrow} title={copy.title}>
        <LabMetricStrip>
          {preview.stats.map((stat) => (
            <LabMetricStripItem
              description={stat.description}
              key={stat.label}
              label={stat.label}
              value={stat.value}
            />
          ))}
        </LabMetricStrip>
      </LabPageHeader>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <LabPanel
          action={<LabStatusPill tone="warning">sessao necessaria</LabStatusPill>}
          padding="md"
          title={preview.primaryTitle}
        >
          <div className="space-y-4">
            <PedidosLockedPreviewBoard view={view} />

            <div className="space-y-0">
              {preview.primaryRows.map((row) => (
                <LabSignalRow key={row.label} label={row.label} note={row.note} tone={row.tone ?? 'neutral'} value={row.value} />
              ))}
            </div>

            <div className="pt-1">
              <Link
                className="inline-flex h-11 items-center justify-center rounded-xl border border-transparent bg-[var(--accent)] px-5 text-sm font-medium text-[var(--on-accent)] transition hover:bg-[var(--accent-strong)]"
                href="/login"
              >
                Entrar para liberar pedidos
              </Link>
            </div>
          </div>
        </LabPanel>

        <LabPanel
          action={<LabStatusPill tone="info">preview</LabStatusPill>}
          padding="md"
          title={preview.secondaryTitle}
        >
          <div className="space-y-0">
            {preview.secondaryRows.map((row) => (
              <LabSignalRow key={row.label} label={row.label} note={row.note} tone={row.tone ?? 'neutral'} value={row.value} />
            ))}
          </div>
        </LabPanel>
      </div>
    </section>
  )
}

function PedidosLockedPreviewBoard({ view }: Readonly<{ view: PedidosView }>) {
  if (view === 'timeline') {
    return (
      <div className="rounded-[16px] border border-dashed border-[var(--lab-border)] bg-[var(--lab-surface-raised)] p-4">
        <div className="space-y-3">
          {[
            { day: 'hoje', time: '19:42', title: 'Mesa 12 fechou no balcao', value: 'R$ 128,00', tone: 'success' as const },
            { day: 'hoje', time: '18:10', title: 'Cancelamento em delivery', value: 'R$ 42,00', tone: 'warning' as const },
            { day: 'ontem', time: '23:18', title: 'Pico do turno noturno', value: '8 pedidos', tone: 'info' as const },
          ].map((entry) => (
            <div
              className="grid gap-3 rounded-[12px] border border-[var(--lab-border)] bg-[var(--lab-surface)] px-4 py-3 md:grid-cols-[88px_minmax(0,1fr)_auto]"
              key={`${entry.day}-${entry.time}-${entry.title}`}
            >
              <div className="text-xs font-medium text-[var(--lab-fg-soft)]">
                {entry.day} · {entry.time}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--lab-fg)]">{entry.title}</p>
                <p className="mt-1 text-xs text-[var(--lab-fg-soft)]">ordem dos eventos, operador e pico comercial</p>
              </div>
              <div className="md:justify-self-end">
                <LabStatusPill tone={entry.tone}>{entry.value}</LabStatusPill>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (view === 'kanban') {
    const columns = [
      {
        id: 'completed',
        label: 'Concluidos',
        tone: 'success' as const,
        items: [
          { customer: 'Mesa 7', value: 'R$ 94,00', note: 'balcao' },
          { customer: 'Delivery Ana', value: 'R$ 58,00', note: 'delivery' },
        ],
      },
      {
        id: 'cancelled',
        label: 'Cancelados',
        tone: 'warning' as const,
        items: [{ customer: 'Evento Centro', value: 'R$ 36,00', note: 'revisao' }],
      },
    ]

    return (
      <div className="grid gap-3 md:grid-cols-2">
        {columns.map((column) => (
          <div
            className="rounded-[16px] border border-dashed border-[var(--lab-border)] bg-[var(--lab-surface-raised)] p-4"
            key={column.id}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[var(--lab-fg)]">{column.label}</p>
              <LabStatusPill tone={column.tone}>{column.items.length}</LabStatusPill>
            </div>
            <div className="mt-3 space-y-2">
              {column.items.map((item) => (
                <div className="rounded-[12px] border border-[var(--lab-border)] bg-[var(--lab-surface)] px-3 py-2.5" key={`${column.id}-${item.customer}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--lab-fg)]">{item.customer}</p>
                      <p className="mt-1 text-xs text-[var(--lab-fg-soft)]">{item.note}</p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-[var(--lab-fg)]">{item.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (view === 'detalhe') {
    return (
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="rounded-[16px] border border-dashed border-[var(--lab-border)] bg-[var(--lab-surface-raised)] p-4">
          <div className="rounded-[12px] border border-[var(--lab-border)] bg-[var(--lab-surface)] px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--lab-fg-muted)]">cliente</p>
            <p className="mt-2 text-sm font-semibold text-[var(--lab-fg)]">Mesa 9 · Camila</p>
            <p className="mt-1 text-xs text-[var(--lab-fg-soft)]">delivery · 19/04 21:18</p>
          </div>
          <div className="mt-3 rounded-[12px] border border-[var(--lab-border)] bg-[var(--lab-surface)] px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--lab-fg-muted)]">itens</p>
            <div className="mt-3 space-y-2">
              {[
                '2x Deher Garrafa',
                '1x Coca-Cola Lata',
                '1x Batata G',
              ].map((line) => (
                <div className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--lab-border)] pb-2 text-sm last:border-b-0 last:pb-0" key={line}>
                  <span className="text-[var(--lab-fg)]">{line}</span>
                  <span className="text-[var(--lab-fg-soft)]">preview</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[16px] border border-dashed border-[var(--lab-border)] bg-[var(--lab-surface-raised)] p-4">
          <div className="space-y-0">
            <LabSignalRow label="valor" note="receita do pedido em foco" tone="success" value="R$ 148,00" />
            <LabSignalRow label="lucro" note="resultado projetado do pedido" tone="neutral" value="R$ 61,00" />
            <LabSignalRow label="status" note="situacao operacional atual" tone="info" value="Concluido" />
          </div>
        </div>
      </div>
    )
  }

  if (view === 'historico') {
    return (
      <div className="rounded-[16px] border border-dashed border-[var(--lab-border)] bg-[var(--lab-surface-raised)] p-4">
        <div className="space-y-1">
          {[
            { day: '19/04', customer: 'Mesa 3', channel: 'balcao', value: 'R$ 84,00' },
            { day: '18/04', customer: 'Cliente 12', channel: 'evento', value: 'R$ 146,00' },
            { day: '17/04', customer: 'Delivery 4', channel: 'delivery', value: 'R$ 52,00' },
          ].map((row) => (
            <div
              className="grid gap-3 border-b border-dashed border-[var(--lab-border)] px-1 py-3 last:border-b-0 md:grid-cols-[72px_minmax(0,1fr)_120px_100px]"
              key={`${row.day}-${row.customer}`}
            >
              <div className="text-xs font-medium text-[var(--lab-fg-soft)]">{row.day}</div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--lab-fg)]">{row.customer}</p>
                <p className="mt-1 text-xs text-[var(--lab-fg-soft)]">operador, horario e ocorrencias entram com a sessao</p>
              </div>
              <div className="text-sm text-[var(--lab-fg-soft)]">{row.channel}</div>
              <div className="text-right text-sm font-medium text-[var(--lab-fg)]">{row.value}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-[16px] border border-dashed border-[var(--lab-border)] bg-[var(--lab-surface-raised)]">
      <div className="grid grid-cols-[92px_minmax(0,1fr)_96px_96px] gap-3 border-b border-dashed border-[var(--lab-border)] px-4 py-2 text-[11px] uppercase tracking-[0.14em] text-[var(--lab-fg-muted)]">
        <span>id</span>
        <span>cliente</span>
        <span>canal</span>
        <span className="text-right">valor</span>
      </div>
      {[
        { id: 'A3F81', customer: 'Mesa 12', channel: 'balcao', value: 'R$ 128,00' },
        { id: 'Q7D14', customer: 'Cliente Ana', channel: 'delivery', value: 'R$ 64,00' },
        { id: 'M2K09', customer: 'Evento Centro', channel: 'evento', value: 'R$ 210,00' },
      ].map((row) => (
        <div className="grid grid-cols-[92px_minmax(0,1fr)_96px_96px] gap-3 border-b border-dashed border-[var(--lab-border)] px-4 py-3 last:border-b-0" key={row.id}>
          <span className="font-mono text-xs text-[var(--lab-fg-soft)]">{row.id}</span>
          <span className="truncate text-sm font-medium text-[var(--lab-fg)]">{row.customer}</span>
          <span className="text-sm text-[var(--lab-fg-soft)]">{row.channel}</span>
          <span className="text-right text-sm font-medium text-[var(--lab-fg)]">{row.value}</span>
        </div>
      ))}
    </div>
  )
}

function PedidosLabSummary({
  currency,
  insights,
  view,
}: Readonly<{
  currency: OrderRecord['displayCurrency']
  insights: PedidosInsights
  view: PedidosView
}>) {
  const config = buildPedidosSummaryConfig({ currency, insights, view })

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <LabPanel
        action={<LabStatusPill tone="info">{config.primaryAction}</LabStatusPill>}
        padding="md"
        title={config.primaryTitle}
      >
        <div className="space-y-5">
          {config.primaryFacts && config.primaryFacts.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {config.primaryFacts.map((fact) => (
                <LabFactPill key={fact.label} label={fact.label} value={fact.value} />
              ))}
            </div>
          ) : null}

          <div className="space-y-0">
            {config.primaryRows.map((row) => (
              <LabSignalRow key={row.label} label={row.label} note={row.note} tone={row.tone ?? 'neutral'} value={row.value} />
            ))}
          </div>
        </div>
      </LabPanel>

      <LabPanel
        action={<LabStatusPill tone="neutral">{config.secondaryAction}</LabStatusPill>}
        padding="md"
        title={config.secondaryTitle}
      >
        <div className="space-y-0">
          {config.secondaryRows.map((row) => (
            <LabSignalRow key={row.label} label={row.label} note={row.note} tone={row.tone ?? 'neutral'} value={row.value} />
          ))}
        </div>
      </LabPanel>
    </div>
  )
}

function pedidosViewLabel(view: PedidosView) {
  switch (view) {
    case 'timeline':
      return 'timeline'
    case 'kanban':
      return 'kanban'
    case 'detalhe':
      return 'detalhe'
    case 'historico':
      return 'historico'
    case 'tabela':
    default:
      return 'tabela'
  }
}

function buildPedidosHeaderStats({
  currency,
  insights,
  view,
}: Readonly<{
  currency: OrderRecord['displayCurrency']
  insights: PedidosInsights
  view: PedidosView
}>): PedidosHeaderStat[] {
  const { activeDays, averagePerDay, averageTicket, biggest, cancelledCount, cancelRate, completedCount, completedRevenue, latest, ordersToday, uniqueChannels, uniqueOperators, lastCancelled } =
    insights

  switch (view) {
    case 'timeline':
      return [
        { label: 'hoje', value: String(ordersToday), description: 'eventos no dia corrente' },
        { label: 'dias ativos', value: String(activeDays), description: 'datas com pedidos no recorte' },
        { label: 'media por dia', value: activeDays > 0 ? String(averagePerDay) : '0', description: 'cadencia media de registros' },
        { label: 'ultimo registro', value: latest ? formatOrderTime(latest.createdAt) : 'sem registro', description: 'horario mais recente do recorte' },
      ]
    case 'kanban':
      return [
        { label: 'concluidos', value: String(completedCount), description: 'pedidos liquidados no quadro' },
        { label: 'cancelados', value: String(cancelledCount), description: 'falhas ou desistencias no recorte' },
        { label: 'taxa de cancelamento', value: cancelRate, description: 'pressao de perda sobre o total' },
        { label: 'maior pedido', value: biggest ? formatCurrency(biggest.totalRevenue, currency) : 'R$ 0,00', description: 'ticket maximo registrado' },
      ]
    case 'detalhe':
      return [
        { label: 'cliente', value: latest?.customerName ?? 'nao informado', description: 'nome que abre o ultimo pedido' },
        { label: 'itens', value: String(latest?.totalItems ?? 0), description: 'volume da comanda selecionada' },
        { label: 'valor', value: latest ? formatCurrency(latest.totalRevenue, currency) : 'R$ 0,00', description: 'receita do pedido em foco' },
        { label: 'canal', value: latest?.channel ?? 'balcao', description: 'origem da venda atual' },
      ]
    case 'historico':
      return [
        { label: 'dias ativos', value: String(activeDays), description: 'janelas com movimentacao registrada' },
        { label: 'operadores', value: String(uniqueOperators), description: 'pessoas aparecendo no historico' },
        { label: 'canais', value: String(uniqueChannels), description: 'origens comerciais encontradas' },
        { label: 'ultimo cancelamento', value: lastCancelled ? formatOrderDate(lastCancelled.createdAt) : 'sem cancelamento', description: 'ultima excecao relevante' },
      ]
    case 'tabela':
    default:
      return [
        { label: 'registros', value: String(insights.sortedOrders.length), description: 'linhas carregadas na tabela' },
        { label: 'receita', value: formatCurrency(completedRevenue, currency), description: 'valor confirmado no recorte' },
        { label: 'canais', value: String(uniqueChannels), description: 'origens presentes na consulta' },
        { label: 'ticket medio', value: formatCurrency(averageTicket, currency), description: 'media dos pedidos concluidos' },
      ]
  }
}

function buildPedidosInsights({
  orders,
  totals,
}: Readonly<{
  orders: OrderRecord[]
  totals:
    | {
        completedOrders: number
        cancelledOrders: number
        realizedRevenue: number
        realizedProfit: number
        soldUnits: number
      }
    | undefined
}>): PedidosInsights {
  const sortedOrders = [...orders].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
  const groups = groupOrdersByDay(sortedOrders)
  const latest = sortedOrders[0] ?? null
  const biggest = [...orders].sort((left, right) => right.totalRevenue - left.totalRevenue)[0] ?? null
  const topChannel = topChannelEntry(orders)
  const topOperator = topOperatorEntry(orders)
  const busiestDay = [...groups].sort((left, right) => right.orders.length - left.orders.length)[0] ?? null
  const completedCount = totals?.completedOrders ?? orders.filter((order) => order.status === 'COMPLETED').length
  const cancelledCount = totals?.cancelledOrders ?? orders.filter((order) => order.status === 'CANCELLED').length
  const completedRevenue =
    totals?.realizedRevenue ?? orders.filter((order) => order.status === 'COMPLETED').reduce((sum, order) => sum + order.totalRevenue, 0)
  const completedProfit =
    totals?.realizedProfit ?? orders.filter((order) => order.status === 'COMPLETED').reduce((sum, order) => sum + order.totalProfit, 0)
  const totalItems = totals?.soldUnits ?? orders.reduce((sum, order) => sum + order.totalItems, 0)
  const uniqueChannels = new Set(orders.map((order) => order.channel ?? 'balcao')).size
  const uniqueOperators = new Set(orders.map((order) => order.sellerName).filter(Boolean)).size
  const activeDays = groups.length
  const averagePerDay = groups.length > 0 ? Math.round((orders.length / groups.length) * 10) / 10 : 0
  const ordersToday = orders.filter((order) => isSameDateKey(order.createdAt, new Date())).length
  const averageTicket = completedCount > 0 ? completedRevenue / Math.max(1, completedCount) : 0
  const cancelRate = orders.length > 0 ? `${Math.round((cancelledCount / Math.max(1, orders.length)) * 100)}%` : '0%'
  const lastCancelled = sortedOrders.find((order) => order.status === 'CANCELLED') ?? null

  return {
    sortedOrders,
    groups,
    latest,
    biggest,
    topChannel,
    topOperator,
    busiestDay,
    completedCount,
    cancelledCount,
    completedRevenue,
    completedProfit,
    totalItems,
    uniqueChannels,
    uniqueOperators,
    activeDays,
    averagePerDay,
    ordersToday,
    averageTicket,
    cancelRate,
    lastCancelled,
  }
}

function buildLockedPedidosPreview(view: PedidosView) {
  switch (view) {
    case 'timeline':
      return {
        primaryTitle: 'Preview travado · timeline',
        primaryFacts: [
          { label: 'foco', value: 'cadencia do turno' },
          { label: 'libera', value: 'ritmo por dia' },
          { label: 'corte', value: 'hora e operador' },
        ],
        stats: [
          { label: 'dias', value: '7', description: 'janelas visiveis ao autenticar' },
          { label: 'marcos', value: '4', description: 'leituras do ritmo operacional' },
          { label: 'eventos', value: 'hora', description: 'sequencia da operacao' },
          { label: 'alertas', value: '2', description: 'cancelamento e pico' },
        ],
        primaryRows: [
          { label: 'linha do tempo', value: 'bloqueada', note: 'libera ordem dos eventos do periodo', tone: 'warning' as const },
          { label: 'dia mais forte', value: 'ao entrar', note: 'destaca onde o caixa acelerou', tone: 'info' as const },
          { label: 'ultimo registro', value: 'ao entrar', note: 'mostra o fim do fluxo atual', tone: 'neutral' as const },
        ],
        secondaryTitle: 'O que abre na timeline',
        secondaryRows: [
          { label: 'dias ativos', value: 'sim', note: 'um bloco por dia com valor consolidado', tone: 'success' as const },
          { label: 'média por dia', value: 'sim', note: 'cadencia do recorte carregado', tone: 'info' as const },
          { label: 'maior pico', value: 'sim', note: 'jornada mais pesada do periodo', tone: 'neutral' as const },
        ],
      }
    case 'kanban':
      return {
        primaryTitle: 'Preview travado · kanban',
        primaryFacts: [
          { label: 'foco', value: 'status do pedido' },
          { label: 'libera', value: 'quadro comercial' },
          { label: 'corte', value: 'concluido e cancelado' },
        ],
        stats: [
          { label: 'colunas', value: '2', description: 'status principais do recorte' },
          { label: 'sinais', value: '4', description: 'pressao e perda em leitura curta' },
          { label: 'acoes', value: '3', description: 'conferencia por status' },
          { label: 'excecoes', value: '2', description: 'ultimo registro e maior ticket' },
        ],
        primaryRows: [
          { label: 'kanban', value: 'bloqueado', note: 'quadro por status entra com a sessao ativa', tone: 'warning' as const },
          { label: 'perda comercial', value: 'ao entrar', note: 'taxa de cancelamento e sinais do turno', tone: 'info' as const },
          { label: 'maior pedido', value: 'ao entrar', note: 'identifica o pico do recorte', tone: 'neutral' as const },
        ],
        secondaryTitle: 'O que abre no kanban',
        secondaryRows: [
          { label: 'concluidos', value: 'sim', note: 'pedidos liquidados por coluna', tone: 'success' as const },
          { label: 'cancelados', value: 'sim', note: 'quebras e desistencias do recorte', tone: 'warning' as const },
          { label: 'canal lider', value: 'sim', note: 'leitura de origem dominante', tone: 'info' as const },
        ],
      }
    case 'detalhe':
      return {
        primaryTitle: 'Preview travado · detalhe',
        primaryFacts: [
          { label: 'foco', value: 'ultimo pedido' },
          { label: 'libera', value: 'itens e notas' },
          { label: 'corte', value: 'cliente e canal' },
        ],
        stats: [
          { label: 'blocos', value: '4', description: 'cliente, itens, totais e contexto' },
          { label: 'totais', value: '3', description: 'receita, lucro e status' },
          { label: 'contexto', value: '4', description: 'operador, canal, horario e notas' },
          { label: 'itens', value: 'lista', description: 'produtos do pedido em foco' },
        ],
        primaryRows: [
          { label: 'pedido selecionado', value: 'bloqueado', note: 'abrir sessao libera a leitura completa', tone: 'warning' as const },
          { label: 'itens da comanda', value: 'ao entrar', note: 'quantidade, produto e subtotal', tone: 'info' as const },
          { label: 'valor e lucro', value: 'ao entrar', note: 'resumo do pedido em foco', tone: 'neutral' as const },
        ],
        secondaryTitle: 'O que abre no detalhe',
        secondaryRows: [
          { label: 'cliente', value: 'sim', note: 'nome e observacoes do pedido', tone: 'success' as const },
          { label: 'canal', value: 'sim', note: 'origem da venda detalhada', tone: 'info' as const },
          { label: 'operador', value: 'sim', note: 'responsavel pela venda', tone: 'neutral' as const },
        ],
      }
    case 'historico':
      return {
        primaryTitle: 'Preview travado · historico',
        primaryFacts: [
          { label: 'foco', value: 'auditoria do periodo' },
          { label: 'libera', value: 'dias, canais e operadores' },
          { label: 'corte', value: 'ocorrencias relevantes' },
        ],
        stats: [
          { label: 'dias', value: '7', description: 'blocos diarios no historico' },
          { label: 'canais', value: '3', description: 'origens consolidadas na auditoria' },
          { label: 'operadores', value: '4', description: 'leitura por time e turno' },
          { label: 'sinais', value: '4', description: 'cancelamento, receita e cobertura' },
        ],
        primaryRows: [
          { label: 'auditoria', value: 'bloqueada', note: 'o consolidado entra com login ativo', tone: 'warning' as const },
          { label: 'ultimo cancelamento', value: 'ao entrar', note: 'ultima excecao do periodo', tone: 'info' as const },
          { label: 'dias ativos', value: 'ao entrar', note: 'datas com pedidos no recorte', tone: 'neutral' as const },
        ],
        secondaryTitle: 'O que abre no historico',
        secondaryRows: [
          { label: 'operadores', value: 'sim', note: 'quem movimentou o periodo', tone: 'success' as const },
          { label: 'canais', value: 'sim', note: 'de onde veio o faturamento', tone: 'info' as const },
          { label: 'timeline diaria', value: 'sim', note: 'um bloco por dia com resumo', tone: 'neutral' as const },
        ],
      }
    case 'tabela':
    default:
      return {
        primaryTitle: 'Preview travado · tabela',
        primaryFacts: [
          { label: 'foco', value: 'consulta operacional' },
          { label: 'libera', value: 'linhas reais de pedido' },
          { label: 'corte', value: 'canal e operador' },
        ],
        stats: [
          { label: 'colunas', value: '7', description: 'id, data, cliente, itens, valor, canal e status' },
          { label: 'filtros', value: '4', description: 'recorte por operacao e consulta' },
          { label: 'canais', value: '3', description: 'origens comerciais na leitura' },
          { label: 'status', value: '2', description: 'concluido e cancelado' },
        ],
        primaryRows: [
          { label: 'tabela', value: 'bloqueada', note: 'a sessao libera a lista completa', tone: 'warning' as const },
          { label: 'receita por pedido', value: 'ao entrar', note: 'valor liquido em cada linha', tone: 'info' as const },
          { label: 'ticket medio', value: 'ao entrar', note: 'media dos concluidos no recorte', tone: 'neutral' as const },
        ],
        secondaryTitle: 'O que abre na tabela',
        secondaryRows: [
          { label: 'canal lider', value: 'sim', note: 'origem dominante do periodo', tone: 'success' as const },
          { label: 'operador lider', value: 'sim', note: 'quem mais puxou receita', tone: 'info' as const },
          { label: 'ultimo registro', value: 'sim', note: 'pedido mais recente da janela', tone: 'neutral' as const },
        ],
      }
  }
}

function buildPedidosSummaryConfig({
  currency,
  insights,
  view,
}: Readonly<{
  currency: OrderRecord['displayCurrency']
  insights: PedidosInsights
  view: PedidosView
}>): PedidosSummaryConfig {
  switch (view) {
    case 'timeline':
      return {
        primaryTitle: 'Cadencia do periodo',
        primaryAction: `${insights.activeDays} dias`,
        primaryFacts: [
          { label: 'visao', value: 'ritmo por dia' },
          { label: 'pico', value: insights.busiestDay?.label ?? 'sem leitura' },
          { label: 'ultimo evento', value: insights.latest ? formatOrderTime(insights.latest.createdAt) : 'sem pedido' },
        ],
        primaryRows: [
          { label: 'dias ativos', value: String(insights.activeDays), note: 'datas com pedidos registrados', tone: 'neutral' },
          { label: 'media por dia', value: insights.activeDays > 0 ? String(insights.averagePerDay) : '0', note: 'volume medio da rotina', tone: 'info' },
          { label: 'dia mais forte', value: insights.busiestDay?.label ?? 'sem leitura', note: 'bloco com maior concentracao de pedidos', tone: 'success' },
          { label: 'receita do recorte', value: formatCurrency(insights.completedRevenue, currency), note: 'valor confirmado no periodo', tone: 'neutral' },
        ],
        secondaryTitle: 'Ritmo operacional',
        secondaryAction: pedidosViewLabel(view),
        secondaryRows: [
          { label: 'hoje', value: String(insights.ordersToday), note: 'eventos encontrados no dia corrente', tone: 'info' },
          { label: 'canal lider', value: insights.topChannel?.channel ?? 'sem leitura', note: 'origem dominante da rotina', tone: 'neutral' },
          { label: 'operador lider', value: insights.topOperator?.name ?? 'sem leitura', note: 'quem mais puxou receita', tone: 'success' },
          { label: 'cancelados', value: String(insights.cancelledCount), note: 'quebras registradas no fluxo', tone: insights.cancelledCount > 0 ? 'warning' : 'neutral' },
        ],
      }
    case 'kanban':
      return {
        primaryTitle: 'Pressao por status',
        primaryAction: `${insights.sortedOrders.length} pedidos`,
        primaryFacts: [
          { label: 'visao', value: 'quadro comercial' },
          { label: 'perda', value: insights.cancelRate },
          { label: 'ultimo', value: insights.latest ? formatOrderDate(insights.latest.createdAt) : 'sem pedido' },
        ],
        primaryRows: [
          { label: 'concluidos', value: String(insights.completedCount), note: 'pedidos liquidados no recorte', tone: 'success' },
          { label: 'cancelados', value: String(insights.cancelledCount), note: 'pedidos perdidos no quadro', tone: insights.cancelledCount > 0 ? 'warning' : 'neutral' },
          { label: 'taxa de cancelamento', value: insights.cancelRate, note: 'peso da perda sobre o total', tone: 'info' },
          { label: 'ticket medio', value: formatCurrency(insights.averageTicket, currency), note: 'media dos pedidos concluidos', tone: 'neutral' },
        ],
        secondaryTitle: 'Fila comercial',
        secondaryAction: insights.topChannel?.channel ?? 'sem canal',
        secondaryRows: [
          { label: 'maior pedido', value: insights.biggest ? formatCurrency(insights.biggest.totalRevenue, currency) : 'R$ 0,00', note: 'pico comercial do recorte', tone: 'success' },
          { label: 'canal lider', value: insights.topChannel?.channel ?? 'sem leitura', note: 'origem dominante do quadro', tone: 'info' },
          { label: 'operador lider', value: insights.topOperator?.name ?? 'sem leitura', note: 'responsavel pela maior puxada', tone: 'neutral' },
          { label: 'itens vendidos', value: String(insights.totalItems), note: 'volume total ja girado no periodo', tone: 'neutral' },
        ],
      }
    case 'detalhe':
      return {
        primaryTitle: 'Pedido em foco',
        primaryAction: insights.latest ? formatOrderReference(insights.latest.id) : 'sem pedido',
        primaryFacts: [
          { label: 'cliente', value: insights.latest?.customerName ?? 'nao informado' },
          { label: 'canal', value: insights.latest?.channel ?? 'balcao' },
          { label: 'operador', value: insights.latest?.sellerName ?? 'sem operador' },
        ],
        primaryRows: [
          { label: 'valor', value: insights.latest ? formatCurrency(insights.latest.totalRevenue, currency) : 'R$ 0,00', note: 'receita do pedido selecionado', tone: 'success' },
          { label: 'lucro', value: insights.latest ? formatCurrency(insights.latest.totalProfit, currency) : 'R$ 0,00', note: 'resultado do pedido em foco', tone: 'neutral' },
          { label: 'itens', value: String(insights.latest?.totalItems ?? 0), note: 'volume da comanda detalhada', tone: 'info' },
          { label: 'status', value: insights.latest ? (insights.latest.status === 'COMPLETED' ? 'concluido' : 'cancelado') : 'sem leitura', note: 'situacao atual do registro', tone: insights.latest?.status === 'CANCELLED' ? 'warning' : 'success' },
        ],
        secondaryTitle: 'Contexto do pedido',
        secondaryAction: pedidosViewLabel(view),
        secondaryRows: [
          { label: 'horario', value: insights.latest ? formatOrderDate(insights.latest.createdAt) : 'sem pedido', note: 'momento do registro em foco', tone: 'neutral' },
          { label: 'bairro', value: insights.latest?.buyerDistrict ?? 'sem localizacao', note: 'origem geografica do cliente', tone: 'info' },
          { label: 'cidade', value: insights.latest?.buyerCity ?? 'sem cidade', note: 'cidade associada ao pedido', tone: 'neutral' },
          { label: 'ultimo cancelado', value: insights.lastCancelled ? formatOrderDate(insights.lastCancelled.createdAt) : 'sem cancelamento', note: 'ultima excecao no periodo', tone: insights.lastCancelled ? 'warning' : 'neutral' },
        ],
      }
    case 'historico':
      return {
        primaryTitle: 'Auditoria do periodo',
        primaryAction: `${insights.activeDays} dias`,
        primaryFacts: [
          { label: 'visao', value: 'consolidado diario' },
          { label: 'canais', value: String(insights.uniqueChannels) },
          { label: 'operadores', value: String(insights.uniqueOperators) },
        ],
        primaryRows: [
          { label: 'dias ativos', value: String(insights.activeDays), note: 'datas com movimentacao registrada', tone: 'neutral' },
          { label: 'receita consolidada', value: formatCurrency(insights.completedRevenue, currency), note: 'valor confirmado no historico', tone: 'success' },
          { label: 'ticket medio', value: formatCurrency(insights.averageTicket, currency), note: 'media dos pedidos concluidos', tone: 'info' },
          { label: 'ultimo cancelamento', value: insights.lastCancelled ? formatOrderDate(insights.lastCancelled.createdAt) : 'sem cancelamento', note: 'ultima excecao relevante do periodo', tone: insights.lastCancelled ? 'warning' : 'neutral' },
        ],
        secondaryTitle: 'Sinais de auditoria',
        secondaryAction: insights.topChannel?.channel ?? 'sem canal',
        secondaryRows: [
          { label: 'canal lider', value: insights.topChannel?.channel ?? 'sem leitura', note: 'origem dominante no consolidado', tone: 'info' },
          { label: 'operador lider', value: insights.topOperator?.name ?? 'sem leitura', note: 'quem mais puxou receita', tone: 'success' },
          { label: 'dia mais forte', value: insights.busiestDay?.label ?? 'sem leitura', note: 'janela com mais pedidos', tone: 'neutral' },
          { label: 'maior pedido', value: insights.biggest ? formatCurrency(insights.biggest.totalRevenue, currency) : 'R$ 0,00', note: 'pico do recorte auditado', tone: 'neutral' },
        ],
      }
    case 'tabela':
    default:
      return {
        primaryTitle: 'Leitura da consulta',
        primaryAction: `${insights.sortedOrders.length} linhas`,
        primaryFacts: [
          { label: 'visao', value: 'tabela operacional' },
          { label: 'canal lider', value: insights.topChannel?.channel ?? 'sem leitura' },
          { label: 'operador lider', value: insights.topOperator?.name ?? 'sem leitura' },
        ],
        primaryRows: [
          { label: 'receita do recorte', value: formatCurrency(insights.completedRevenue, currency), note: 'valor confirmado nos pedidos concluidos', tone: 'success' },
          { label: 'ticket medio', value: formatCurrency(insights.averageTicket, currency), note: 'media por pedido concluido', tone: 'info' },
          { label: 'itens vendidos', value: String(insights.totalItems), note: 'volume total movimentado', tone: 'neutral' },
          { label: 'maior pedido', value: insights.biggest ? formatCurrency(insights.biggest.totalRevenue, currency) : 'R$ 0,00', note: 'pico do recorte consultado', tone: 'neutral' },
        ],
        secondaryTitle: 'Cobertura da consulta',
        secondaryAction: `${insights.uniqueChannels} canais`,
        secondaryRows: [
          { label: 'dias ativos', value: String(insights.activeDays), note: 'datas com pedidos na tabela', tone: 'neutral' },
          { label: 'ultimo registro', value: insights.latest ? formatOrderDate(insights.latest.createdAt) : 'sem pedido', note: 'pedido mais recente carregado', tone: 'info' },
          { label: 'cancelados', value: String(insights.cancelledCount), note: 'quebras visiveis na leitura', tone: insights.cancelledCount > 0 ? 'warning' : 'neutral' },
          { label: 'lucro do recorte', value: formatCurrency(insights.completedProfit, currency), note: 'resultado acumulado dos concluidos', tone: 'success' },
        ],
      }
  }
}

function PedidosSignalRow({
  label,
  value,
  tone,
}: Readonly<{
  label: string
  value: string
  tone: LabStatusTone
}>) {
  return <LabSignalRow label={label} tone={tone} value={value} />
}

function resolvePedidosView(activeTab: DashboardTabId | 'historico' | null): PedidosView {
  if (activeTab === 'timeline' || activeTab === 'kanban' || activeTab === 'detalhe' || activeTab === 'historico') {
    return activeTab
  }

  return 'tabela'
}

function PedidosMetaSummary({
  currency,
  insights,
  view,
}: Readonly<{
  currency: OrderRecord['displayCurrency']
  insights: PedidosInsights
  view: PedidosView
}>) {
  const items =
    view === 'timeline'
      ? [
          { label: 'dias ativos', value: String(insights.activeDays), tone: 'neutral' as const },
          { label: 'hoje', value: String(insights.ordersToday), tone: 'info' as const },
          { label: 'dia forte', value: insights.busiestDay?.label ?? 'sem leitura', tone: 'success' as const },
        ]
      : view === 'kanban'
        ? [
            { label: 'concluidos', value: String(insights.completedCount), tone: 'success' as const },
            { label: 'cancelados', value: String(insights.cancelledCount), tone: insights.cancelledCount > 0 ? ('warning' as const) : ('neutral' as const) },
            { label: 'taxa', value: insights.cancelRate, tone: 'info' as const },
          ]
        : view === 'detalhe'
          ? [
              { label: 'cliente', value: insights.latest?.customerName ?? 'nao informado', tone: 'neutral' as const },
              { label: 'canal', value: insights.latest?.channel ?? 'balcao', tone: 'info' as const },
              { label: 'valor', value: insights.latest ? formatCurrency(insights.latest.totalRevenue, currency) : 'R$ 0,00', tone: 'success' as const },
            ]
          : view === 'historico'
            ? [
                { label: 'operadores', value: String(insights.uniqueOperators), tone: 'info' as const },
                { label: 'canais', value: String(insights.uniqueChannels), tone: 'neutral' as const },
                { label: 'ultimo cancelamento', value: insights.lastCancelled ? formatOrderDate(insights.lastCancelled.createdAt) : 'sem cancelamento', tone: insights.lastCancelled ? ('warning' as const) : ('neutral' as const) },
              ]
            : [
                { label: 'receita', value: formatCurrency(insights.completedRevenue, currency), tone: 'success' as const },
                { label: 'canal lider', value: insights.topChannel?.channel ?? 'sem leitura', tone: 'info' as const },
                { label: 'ultimo registro', value: insights.latest ? formatOrderDate(insights.latest.createdAt) : 'sem pedidos', tone: 'neutral' as const },
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

function PedidosMetricTile({
  hint,
  icon,
  label,
  value,
  tone = 'info',
}: Readonly<{
  hint: string
  icon: typeof ClipboardList
  label: string
  value: string
  tone?: LabStatusTone
}>) {
  return <LabMetric className="h-full" delta={toneLabel(tone)} deltaTone={tone} hint={hint} icon={icon} label={label} value={value} />
}

function toneLabel(tone: LabStatusTone) {
  switch (tone) {
    case 'success':
      return 'ok'
    case 'danger':
      return 'risco'
    case 'warning':
      return 'fila'
    case 'neutral':
      return 'base'
    case 'info':
    default:
      return 'leitura'
  }
}

function OrdersTablePanel({
  currency,
  orders,
}: Readonly<{
  currency: OrderRecord['displayCurrency']
  orders: OrderRecord[]
}>) {
  const topChannel = topChannelEntry(orders)
  const topOperator = topOperatorEntry(orders)
  const biggest = [...orders].sort((left, right) => right.totalRevenue - left.totalRevenue)[0] ?? null
  const totalItems = orders.reduce((sum, order) => sum + order.totalItems, 0)

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
      <LabPanel
        action={<LabStatusPill tone="neutral">{orders.length} pedidos</LabStatusPill>}
        padding="none"
        title="Tabela de pedidos"
      >
        <LabTable
          className="rounded-none border-0"
          columns={[
            {
              id: 'id',
              header: 'Id',
              cell: (order) => (
                <span className="font-mono text-[var(--lab-fg-soft)]" title={order.id}>
                  {formatOrderReference(order.id)}
                </span>
              ),
              width: '120px',
            },
            {
              id: 'data',
              header: 'Data',
              cell: (order) => <span className="text-[var(--lab-fg-soft)]">{formatOrderDate(order.createdAt)}</span>,
              width: '140px',
            },
            {
              id: 'cliente',
              header: 'Cliente',
              cell: (order) => <span className="font-medium text-[var(--lab-fg)]">{order.customerName ?? 'Sem nome'}</span>,
            },
            {
              id: 'itens',
              header: 'Itens',
              cell: (order) => <span className="text-[var(--lab-fg-soft)]">{order.totalItems}</span>,
              align: 'right',
              width: '90px',
            },
            {
              id: 'valor',
              header: 'Valor',
              cell: (order) => <span className="font-medium text-[var(--lab-fg)]">{formatCurrency(order.totalRevenue, currency)}</span>,
              align: 'right',
              width: '120px',
            },
            {
              id: 'canal',
              header: 'Canal',
              cell: (order) => <span className="text-[var(--lab-fg-soft)]">{order.channel ?? 'balcao'}</span>,
              width: '120px',
            },
            {
              id: 'status',
              header: 'Status',
              cell: (order) => <StatusPill status={order.status} />,
              width: '130px',
            },
          ]}
          emptyDescription="Nenhum pedido registrado ainda."
          emptyTitle="Sem pedidos no periodo"
          rowKey="id"
          rows={orders}
        />
      </LabPanel>

      <LabPanel
        action={<LabStatusPill tone="info">{totalItems} itens</LabStatusPill>}
        padding="md"
        title="Leitura da tabela"
      >
        <div className="space-y-4">
          <PedidosSignalRow label="canal líder" tone="info" value={topChannel?.channel ?? 'sem leitura'} />
          <PedidosSignalRow label="operador líder" tone="neutral" value={topOperator?.name ?? 'sem leitura'} />
          <PedidosSignalRow label="maior pedido" tone="success" value={biggest ? formatCurrency(biggest.totalRevenue, currency) : 'R$ 0,00'} />
          <PedidosSignalRow label="último registro" tone="neutral" value={orders[0] ? formatOrderDate(orders[0].createdAt) : 'sem pedido'} />
        </div>
      </LabPanel>
    </div>
  )
}

function OrdersTimelinePanel({
  currency,
  orders,
}: Readonly<{
  currency: OrderRecord['displayCurrency']
  orders: OrderRecord[]
}>) {
  const groups = groupOrdersByDay(orders)
  const busiestDay = [...groups].sort((left, right) => right.orders.length - left.orders.length)[0] ?? null
  const latest = [...orders].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0] ?? null
  const averagePerDay = groups.length > 0 ? Math.round((orders.length / groups.length) * 10) / 10 : 0

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
      <LabPanel padding="md" title="Linha do tempo">
        <div className="space-y-6">
          {groups.length > 0 ? (
            groups.map((group) => (
              <section className="space-y-3 border-b border-dashed border-[var(--lab-border)] pb-5 last:border-b-0 last:pb-0" key={group.key}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--lab-fg)]">{group.label}</h3>
                    <p className="mt-1 text-xs text-[var(--lab-fg-soft)]">{group.orders.length} registros nesse dia.</p>
                  </div>
                  <LabStatusPill tone="info">{formatCurrency(group.orders.reduce((sum, order) => sum + order.totalRevenue, 0), currency)}</LabStatusPill>
                </div>

                <div className="space-y-3">
                  {group.orders.map((order) => (
                    <div className="grid gap-3 rounded-[12px] border border-[var(--lab-border)] bg-[var(--lab-surface-raised)] px-4 py-3 md:grid-cols-[72px_minmax(0,1fr)_auto]" key={order.id}>
                      <div className="text-xs font-medium text-[var(--lab-fg-soft)]">{formatOrderTime(order.createdAt)}</div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--lab-fg)]">{order.customerName ?? 'Pedido sem cliente'}</p>
                        <p className="mt-1 text-sm text-[var(--lab-fg-soft)]">
                          {order.totalItems} itens · {order.channel ?? 'balcao'} · {order.sellerName ?? 'sem operador'}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-3 md:justify-end">
                        <strong className="text-sm text-[var(--lab-fg)]">{formatCurrency(order.totalRevenue, currency)}</strong>
                        <StatusPill status={order.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))
          ) : (
            <LabEmptyState compact description="Sem eventos de pedidos no periodo." title="Linha do tempo vazia" />
          )}
        </div>
      </LabPanel>

      <LabPanel
        action={<LabStatusPill tone="info">{groups.length} dias</LabStatusPill>}
        padding="md"
        title="Ritmo do período"
      >
        <div className="space-y-4">
          <PedidosSignalRow label="dias ativos" tone="neutral" value={String(groups.length)} />
          <PedidosSignalRow label="média por dia" tone="info" value={groups.length > 0 ? String(averagePerDay) : '0'} />
          <PedidosSignalRow label="dia mais forte" tone="success" value={busiestDay?.label ?? 'sem leitura'} />
          <PedidosSignalRow label="último registro" tone="neutral" value={latest ? formatOrderDate(latest.createdAt) : 'sem pedido'} />
        </div>
      </LabPanel>
    </div>
  )
}

function OrdersKanbanPanel({
  currency,
  orders,
}: Readonly<{
  currency: OrderRecord['displayCurrency']
  orders: OrderRecord[]
}>) {
  const sortedOrders = [...orders].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
  const columns = [
    {
      id: 'COMPLETED',
      label: 'Concluidos',
      tone: 'success' as const,
      items: sortedOrders.filter((order) => order.status === 'COMPLETED'),
    },
    {
      id: 'CANCELLED',
      label: 'Cancelados',
      tone: 'danger' as const,
      items: sortedOrders.filter((order) => order.status === 'CANCELLED'),
    },
  ] as const
  return (
    <LabPanel
      action={<LabStatusPill tone="info">{orders.length} pedidos</LabStatusPill>}
      data-testid="orders-kanban-grid"
      padding="md"
      title="Quadro por status"
    >
      <div className="space-y-6">
        {columns.map((column) => {
          const visibleItems = column.items.slice(0, KANBAN_COLUMN_PREVIEW_LIMIT)
          const hiddenCount = Math.max(0, column.items.length - visibleItems.length)
          const columnRevenue = column.items.reduce((sum, order) => sum + order.totalRevenue, 0)

          return (
            <section className="space-y-3 border-b border-dashed border-[var(--lab-border)] pb-5 last:border-b-0 last:pb-0" key={column.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-[var(--lab-fg)]">{column.label}</h3>
                  <p className="mt-1 text-xs text-[var(--lab-fg-soft)]">
                    {formatCurrency(columnRevenue, currency)} · {topChannelLabel(column.items)}
                  </p>
                </div>
                <LabStatusPill tone={column.tone}>{column.items.length}</LabStatusPill>
              </div>

              {visibleItems.length > 0 ? (
                <>
                  <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                    {visibleItems.map((order) => (
                      <div className="rounded-[12px] border border-[var(--lab-border)] bg-[var(--lab-surface-raised)] px-4 py-3" key={order.id}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[var(--lab-fg)]">{order.customerName ?? 'Pedido sem cliente'}</p>
                            <p className="mt-1 text-xs text-[var(--lab-fg-soft)]">
                              {order.channel ?? 'balcao'} · {order.sellerName ?? 'sem operador'}
                            </p>
                          </div>
                          <strong className="shrink-0 text-sm text-[var(--lab-fg)]">{formatCurrency(order.totalRevenue, currency)}</strong>
                        </div>

                        <div className="mt-3 grid gap-2 text-xs text-[var(--lab-fg-soft)] sm:grid-cols-2">
                          <span>{order.totalItems} itens</span>
                          <span className="sm:text-right">{formatOrderDate(order.createdAt)}</span>
                          <span>{[order.buyerDistrict, order.buyerCity].filter(Boolean).join(' · ') || 'sem localizacao'}</span>
                          <span className="sm:text-right">{formatCurrency(order.totalProfit, currency)} lucro</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {hiddenCount > 0 ? (
                    <Link
                      aria-label={`${hiddenCount} pedidos adicionais - abrir tabela`}
                      className="flex items-center justify-between gap-3 rounded-[12px] border border-dashed border-[var(--lab-border)] bg-[var(--lab-surface-hover)] px-4 py-3 text-xs font-medium text-[var(--lab-fg-soft)] transition hover:border-[var(--lab-blue-border)] hover:text-[var(--lab-blue)]"
                      href="/design-lab/pedidos?tab=tabela"
                    >
                      <span>{hiddenCount} pedidos adicionais</span>
                      <span>abrir tabela</span>
                    </Link>
                  ) : null}
                </>
              ) : (
                <LabEmptyState compact description="Sem pedidos nessa coluna." title={`${column.label} vazio`} />
              )}
            </section>
          )
        })}
      </div>
    </LabPanel>
  )
}

function OrdersHistoryPanel({
  currency,
  orders,
}: Readonly<{
  currency: OrderRecord['displayCurrency']
  orders: OrderRecord[]
}>) {
  const sortedOrders = [...orders].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
  const groups = groupOrdersByDay(sortedOrders)

  const uniqueOperators = new Set(sortedOrders.map((order) => order.sellerName).filter(Boolean)).size
  const uniqueChannels = new Set(sortedOrders.map((order) => order.channel ?? 'balcao')).size
  const lastCancelled = sortedOrders.find((order) => order.status === 'CANCELLED')

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
      <LabPanel
        action={<LabStatusPill tone="neutral">{groups.length} dias</LabStatusPill>}
        padding="md"
        title="Historico consolidado"
      >
        {groups.length === 0 ? (
          <LabEmptyState compact description="Sem pedidos para auditar no periodo atual." title="Historico vazio" />
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <section className="space-y-3 border-b border-dashed border-[var(--lab-border)] pb-5 last:border-b-0 last:pb-0" key={group.key}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--lab-fg)]">{group.label}</h3>
                    <p className="mt-1 text-xs text-[var(--lab-fg-soft)]">{group.orders.length} pedidos registrados nesse dia.</p>
                  </div>
                  <LabStatusPill tone="info">{formatCurrency(group.orders.reduce((sum, order) => sum + order.totalRevenue, 0), currency)}</LabStatusPill>
                </div>

                <div className="space-y-1">
                  {group.orders.map((order) => (
                    <div className="grid gap-3 border-b border-dashed border-[var(--lab-border)] px-1 py-3 last:border-b-0 md:grid-cols-[72px_minmax(0,1.2fr)_minmax(0,1fr)_auto_auto]" key={order.id}>
                      <div className="text-xs font-medium text-[var(--lab-fg-soft)]">{formatOrderTime(order.createdAt)}</div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--lab-fg)]">{order.customerName ?? 'Pedido sem cliente'}</p>
                        <p className="mt-1 text-xs text-[var(--lab-fg-soft)]">
                          {order.totalItems} itens · {order.sellerName ?? 'sem operador'}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-[var(--lab-fg)]">{order.channel ?? 'balcao'}</p>
                        <p className="mt-1 truncate text-xs text-[var(--lab-fg-soft)]">
                          {[order.buyerDistrict, order.buyerCity].filter(Boolean).join(' · ') || 'sem localizacao'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-[var(--lab-fg)]">{formatCurrency(order.totalRevenue, currency)}</p>
                        <p className="mt-1 text-xs text-[var(--lab-fg-soft)]">{formatCurrency(order.totalProfit, currency)} lucro</p>
                      </div>
                      <div className="md:justify-self-end">
                        <StatusPill status={order.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </LabPanel>

      <LabPanel
        action={<LabStatusPill tone="info">{sortedOrders.length} pedidos</LabStatusPill>}
        padding="md"
        title="Sinais do historico"
      >
        <div className="space-y-4">
          <PedidosSignalRow label="dias ativos" tone="neutral" value={String(groups.length)} />
          <PedidosSignalRow label="operadores" tone="info" value={String(uniqueOperators)} />
          <PedidosSignalRow label="canais" tone="neutral" value={String(uniqueChannels)} />
          <PedidosSignalRow
            label="ultimo cancelamento"
            tone={lastCancelled ? 'warning' : 'neutral'}
            value={lastCancelled ? formatOrderDate(lastCancelled.createdAt) : 'sem cancelamento'}
          />
        </div>
      </LabPanel>
    </div>
  )
}

function OrderDetailPanel({
  currency,
  order,
}: Readonly<{
  currency: OrderRecord['displayCurrency']
  order: OrderRecord | null
}>) {
  return (
    <LabPanel padding="md" title="Detalhe do ultimo pedido">
      {order ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="rounded-[12px] border border-[var(--lab-border)] bg-[var(--lab-surface-raised)] px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--lab-fg-muted)]">Cliente</p>
              <p className="mt-2 text-base font-semibold text-[var(--lab-fg)]">{order.customerName ?? 'Nao informado'}</p>
              <p className="mt-1 text-sm text-[var(--lab-fg-soft)]">
                {order.channel ?? 'balcao'} · {formatOrderDate(order.createdAt)}
              </p>
              {order.notes ? <p className="mt-3 text-sm text-[var(--lab-fg-soft)]">{order.notes}</p> : null}
            </div>

            <div className="rounded-[12px] border border-[var(--lab-border)] bg-[var(--lab-surface-raised)] px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--lab-fg-muted)]">Itens</p>
              <div className="mt-3 space-y-2">
                {order.items.length > 0 ? (
                  order.items.map((item) => (
                    <div className="flex items-center justify-between gap-4 border-b border-dashed border-[var(--lab-border)] pb-2 last:border-b-0 last:pb-0" key={item.id}>
                      <span className="text-sm text-[var(--lab-fg)]">
                        {item.quantity}x {item.productName}
                      </span>
                      <span className="text-sm text-[var(--lab-fg-soft)]">
                        {formatCurrency(item.unitPrice * item.quantity, currency)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--lab-fg-soft)]">Sem itens detalhados.</p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-[12px] border border-[var(--lab-border)] bg-[var(--lab-surface-raised)] px-4 py-4">
            <div className="space-y-0">
              <LabSignalRow label="valor" note="receita do pedido em foco" tone="success" value={formatCurrency(order.totalRevenue, currency)} />
              <LabSignalRow label="lucro" note="resultado acumulado deste pedido" tone="neutral" value={formatCurrency(order.totalProfit, currency)} />
              <LabSignalRow
                label="status"
                note="situacao operacional atual"
                tone={order.status === 'COMPLETED' ? 'success' : 'danger'}
                value={order.status === 'COMPLETED' ? 'Concluido' : 'Cancelado'}
              />
              <LabSignalRow label="operador" note="responsavel pelo registro" tone="info" value={order.sellerName ?? 'Nao informado'} />
            </div>
          </div>
        </div>
      ) : (
        <LabEmptyState compact description="Ainda nao existe pedido para detalhar." title="Sem pedido para detalhar" />
      )}
    </LabPanel>
  )
}

function StatusPill({ status }: Readonly<{ status: 'COMPLETED' | 'CANCELLED' }>) {
  return <LabStatusPill tone={status === 'COMPLETED' ? 'success' : 'danger'}>{status === 'COMPLETED' ? 'Concluido' : 'Cancelado'}</LabStatusPill>
}

function formatOrderDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatOrderTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatOrderDayKey(value: string) {
  const date = new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatOrderDayLabel(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(value))
}

function groupOrdersByDay(orders: OrderRecord[]) {
  return Array.from(
    [...orders]
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .reduce((map, order) => {
        const dayKey = formatOrderDayKey(order.createdAt)
        const current = map.get(dayKey) ?? { key: dayKey, label: formatOrderDayLabel(order.createdAt), orders: [] as OrderRecord[] }
        current.orders.push(order)
        map.set(dayKey, current)
        return map
      }, new Map<string, { key: string; label: string; orders: OrderRecord[] }>()),
  ).map(([, value]) => value)
}

function topChannelEntry(orders: OrderRecord[]) {
  if (orders.length === 0) {
    return null
  }

  return Array.from(
    orders.reduce((map, order) => {
      const channel = order.channel ?? 'balcao'
      const current = map.get(channel) ?? { channel, count: 0 }
      current.count += 1
      map.set(channel, current)
      return map
    }, new Map<string, { channel: string; count: number }>()),
  )
    .map(([, value]) => value)
    .sort((left, right) => right.count - left.count)[0]
}

function topOperatorEntry(orders: OrderRecord[]) {
  const operators = orders.filter((order) => order.sellerName)
  if (operators.length === 0) {
    return null
  }

  return Array.from(
    operators.reduce((map, order) => {
      const name = order.sellerName ?? 'sem operador'
      const current = map.get(name) ?? { name, revenue: 0 }
      current.revenue += order.totalRevenue
      map.set(name, current)
      return map
    }, new Map<string, { name: string; revenue: number }>()),
  )
    .map(([, value]) => value)
    .sort((left, right) => right.revenue - left.revenue)[0]
}

function topChannelLabel(orders: OrderRecord[]) {
  if (orders.length === 0) {
    return 'sem canal líder'
  }

  const [channel] = Array.from(
    orders.reduce((map, order) => {
      const current = order.channel ?? 'balcao'
      map.set(current, (map.get(current) ?? 0) + 1)
      return map
    }, new Map<string, number>()),
  ).sort((left, right) => right[1] - left[1])[0]

  return `${channel} líder`
}

function isSameDateKey(value: string, date: Date) {
  return formatOrderDayKey(value) === formatOrderDayKey(date.toISOString())
}
