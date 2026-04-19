'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ClipboardList, ReceiptText, Rows3, SquareKanban } from 'lucide-react'
import type { OrderRecord } from '@contracts/contracts'
import type { DashboardTabId } from '@/components/dashboard/dashboard-navigation'
import {
  LabEmptyState,
  LabMetric,
  LabPageHeader,
  LabPanel,
  LabStatusPill,
  LabTable,
  type LabStatusTone,
} from '@/components/design-lab/lab-primitives'
import { useDashboardQueries } from '@/components/dashboard/hooks/useDashboardQueries'
import { ApiError, fetchOrders } from '@/lib/api'
import { formatCurrency } from '@/lib/currency'

type PedidosView = 'tabela' | 'timeline' | 'kanban' | 'detalhe'

const viewCopy: Record<PedidosView, { eyebrow: string; title: string; description: string }> = {
  tabela: {
    eyebrow: 'Tabela com filtros',
    title: 'Pedidos do periodo',
    description: 'Leitura densa para auditoria, com ordem cronologica e colunas curtas.',
  },
  timeline: {
    eyebrow: 'Linha do tempo',
    title: 'Sequencia de eventos',
    description: 'Os pedidos aparecem em ordem de ocorrencia para localizar ritmo e interrupcoes.',
  },
  kanban: {
    eyebrow: 'Kanban por status',
    title: 'Status dos pedidos',
    description: 'Uma leitura visual curta do que concluiu e do que foi cancelado, sem cara de prototipo.',
  },
  detalhe: {
    eyebrow: 'Detalhe do pedido',
    title: 'Pedido selecionado',
    description: 'Leitura longa do ultimo pedido registrado, com itens, observacao e valores.',
  },
}

export function PedidosEnvironment({ activeTab }: Readonly<{ activeTab: DashboardTabId | null }>) {
  const { sessionQuery } = useDashboardQueries({ section: 'pedidos' })
  const user = sessionQuery.data?.user
  const ordersQuery = useQuery({
    queryKey: ['orders', 'detail', 'pedidos'],
    queryFn: () => fetchOrders({ includeCancelled: true, includeItems: true }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  if (!user) return null

  const view = resolvePedidosView(activeTab)
  const copy = viewCopy[view]
  const orders = ordersQuery.data?.items ?? []
  const totals = ordersQuery.data?.totals
  const displayCurrency = user.preferredCurrency as OrderRecord['displayCurrency']
  const averageTicket =
    (totals?.completedOrders ?? 0) > 0
      ? (totals?.realizedRevenue ?? 0) / Math.max(1, totals?.completedOrders ?? 0)
      : 0
  const error = ordersQuery.error instanceof ApiError ? ordersQuery.error.message : null

  return (
    <section className="space-y-5">
      <LabPageHeader
        description={copy.description}
        eyebrow={copy.eyebrow}
        meta={<PedidosMetaSummary orders={orders} />}
        title={copy.title}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PedidosMetricTile hint="pedidos liquidados no periodo" icon={ClipboardList} label="concluidos" value={String(totals?.completedOrders ?? 0)} />
        <PedidosMetricTile hint="pedidos cancelados" icon={Rows3} label="cancelados" value={String(totals?.cancelledOrders ?? 0)} tone="danger" />
        <PedidosMetricTile hint="receita realizada pelo historico atual" icon={ReceiptText} label="receita" value={formatCurrency(totals?.realizedRevenue ?? 0, displayCurrency)} tone="success" />
        <PedidosMetricTile hint="media por pedido concluido" icon={SquareKanban} label="ticket medio" value={formatCurrency(averageTicket, displayCurrency)} />
      </div>

      {error ? (
        <LabPanel padding="md">
          <p className="text-sm text-[var(--danger)]">{error}</p>
        </LabPanel>
      ) : null}

      {!error && view === 'tabela' ? <OrdersTablePanel currency={displayCurrency} orders={orders} /> : null}
      {!error && view === 'timeline' ? <OrdersTimelinePanel currency={displayCurrency} orders={orders} /> : null}
      {!error && view === 'kanban' ? <OrdersKanbanPanel currency={displayCurrency} orders={orders} /> : null}
      {!error && view === 'detalhe' ? <OrderDetailPanel currency={displayCurrency} order={orders[0] ?? null} /> : null}
    </section>
  )
}

function resolvePedidosView(activeTab: DashboardTabId | null): PedidosView {
  if (activeTab === 'timeline' || activeTab === 'kanban' || activeTab === 'detalhe') {
    return activeTab
  }

  return 'tabela'
}

function PedidosMetaSummary({ orders }: Readonly<{ orders: OrderRecord[] }>) {
  const completed = orders.filter((order) => order.status === 'COMPLETED').length
  const cancelled = orders.filter((order) => order.status === 'CANCELLED').length
  const lastOrder = orders[0]

  const items = [
    { label: 'concluidos', value: String(completed), tone: 'success' as const },
    { label: 'cancelados', value: String(cancelled), tone: 'danger' as const },
    { label: 'ultimo registro', value: lastOrder ? formatOrderDate(lastOrder.createdAt) : 'sem pedidos', tone: 'neutral' as const },
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
  return (
    <LabPanel
      action={<LabStatusPill tone="neutral">{orders.length} pedidos</LabStatusPill>}
      padding="none"
      subtitle="Historico com cliente, canal, valor e status."
      title="Tabela de pedidos"
    >
      <LabTable
        className="rounded-none border-0"
        columns={[
          {
            id: 'id',
            header: 'Id',
            cell: (order) => <span className="font-mono text-[var(--text-soft)]">{order.id.slice(0, 8)}</span>,
            width: '120px',
          },
          {
            id: 'data',
            header: 'Data',
            cell: (order) => <span className="text-[var(--text-soft)]">{formatOrderDate(order.createdAt)}</span>,
            width: '140px',
          },
          {
            id: 'cliente',
            header: 'Cliente',
            cell: (order) => <span className="font-medium text-[var(--text-primary)]">{order.customerName ?? 'Sem nome'}</span>,
          },
          {
            id: 'itens',
            header: 'Itens',
            cell: (order) => <span className="text-[var(--text-soft)]">{order.totalItems}</span>,
            align: 'right',
            width: '90px',
          },
          {
            id: 'valor',
            header: 'Valor',
            cell: (order) => <span className="font-medium text-[var(--text-primary)]">{formatCurrency(order.totalRevenue, currency)}</span>,
            align: 'right',
            width: '120px',
          },
          {
            id: 'canal',
            header: 'Canal',
            cell: (order) => <span className="text-[var(--text-soft)]">{order.channel ?? 'balcao'}</span>,
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
  )
}

function OrdersTimelinePanel({
  currency,
  orders,
}: Readonly<{
  currency: OrderRecord['displayCurrency']
  orders: OrderRecord[]
}>) {
  return (
    <LabPanel padding="md" subtitle="Cada linha resume um pedido com valor e contexto." title="Linha do tempo">
      <div className="space-y-3">
        {orders.length > 0 ? (
          orders.map((order) => (
            <div className="grid gap-3 rounded-[12px] border border-[var(--border)] px-4 py-3 md:grid-cols-[140px_minmax(0,1fr)_auto]" key={order.id}>
              <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{formatOrderDate(order.createdAt)}</div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{order.customerName ?? 'Pedido sem cliente'}</p>
                <p className="mt-1 text-sm text-[var(--text-soft)]">
                  {order.totalItems} itens · {order.channel ?? 'balcao'} · {order.sellerName ?? 'sem operador'}
                </p>
              </div>
              <div className="flex items-center justify-between gap-3 md:justify-end">
                <strong className="text-sm text-[var(--text-primary)]">{formatCurrency(order.totalRevenue, currency)}</strong>
                <StatusPill status={order.status} />
              </div>
            </div>
          ))
        ) : (
          <LabEmptyState compact description="Sem eventos de pedidos no periodo." title="Linha do tempo vazia" />
        )}
      </div>
    </LabPanel>
  )
}

function OrdersKanbanPanel({
  currency,
  orders,
}: Readonly<{
  currency: OrderRecord['displayCurrency']
  orders: OrderRecord[]
}>) {
  const columns = [
    {
      id: 'COMPLETED',
      label: 'Concluidos',
      tone: 'success' as const,
      items: orders.filter((order) => order.status === 'COMPLETED'),
    },
    {
      id: 'CANCELLED',
      label: 'Cancelados',
      tone: 'danger' as const,
      items: orders.filter((order) => order.status === 'CANCELLED'),
    },
  ] as const

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {columns.map((column) => (
        <LabPanel
          action={<LabStatusPill tone={column.tone}>{column.items.length}</LabStatusPill>}
          key={column.id}
          padding="md"
          subtitle="Leitura curta por coluna operacional."
          title={column.label}
        >
          <div className="space-y-3">
            {column.items.length > 0 ? (
              column.items.map((order) => (
                <div className="rounded-[12px] border border-[var(--border)] px-4 py-3" key={order.id}>
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{order.customerName ?? 'Pedido sem cliente'}</p>
                  <p className="mt-1 text-sm text-[var(--text-soft)]">
                    {order.totalItems} itens · {order.channel ?? 'balcao'}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{formatOrderDate(order.createdAt)}</span>
                    <strong className="text-sm text-[var(--text-primary)]">{formatCurrency(order.totalRevenue, currency)}</strong>
                  </div>
                </div>
              ))
            ) : (
              <LabEmptyState compact description="Sem pedidos nessa coluna." title={`${column.label} vazio`} />
            )}
          </div>
        </LabPanel>
      ))}
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
    <LabPanel padding="md" subtitle="Resumo completo do registro mais recente." title="Detalhe do ultimo pedido">
      {order ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="rounded-[12px] border border-[var(--border)] px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">Cliente</p>
              <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">{order.customerName ?? 'Nao informado'}</p>
              <p className="mt-1 text-sm text-[var(--text-soft)]">
                {order.channel ?? 'balcao'} · {formatOrderDate(order.createdAt)}
              </p>
              {order.notes ? <p className="mt-3 text-sm text-[var(--text-soft)]">{order.notes}</p> : null}
            </div>

            <div className="rounded-[12px] border border-[var(--border)] px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">Itens</p>
              <div className="mt-3 space-y-2">
                {order.items.length > 0 ? (
                  order.items.map((item) => (
                    <div className="flex items-center justify-between gap-4 border-b border-dashed border-[var(--border)] pb-2 last:border-b-0 last:pb-0" key={item.id}>
                      <span className="text-sm text-[var(--text-primary)]">
                        {item.quantity}x {item.productName}
                      </span>
                      <span className="text-sm text-[var(--text-soft)]">
                        {formatCurrency(item.unitPrice * item.quantity, currency)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--text-soft)]">Sem itens detalhados.</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <DetailStat label="valor" tone="success" value={formatCurrency(order.totalRevenue, currency)} />
            <DetailStat label="lucro" tone="neutral" value={formatCurrency(order.totalProfit, currency)} />
            <DetailStat label="status" tone={order.status === 'COMPLETED' ? 'success' : 'danger'} value={order.status === 'COMPLETED' ? 'Concluido' : 'Cancelado'} />
            <DetailStat label="operador" tone="info" value={order.sellerName ?? 'Nao informado'} />
          </div>
        </div>
      ) : (
        <LabEmptyState compact description="Ainda nao existe pedido para detalhar." title="Sem pedido para detalhar" />
      )}
    </LabPanel>
  )
}

function DetailStat({
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
