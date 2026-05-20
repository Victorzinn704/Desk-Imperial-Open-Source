'use client'

import type { OrderRecord } from '@contracts/contracts'
import { LabEmptyState, LabPanel, LabStatusPill, LabTable } from '@/components/design-lab/lab-primitives'
import { formatCurrency } from '@/lib/currency'
import { formatOrderReference } from '@/lib/order-reference'
import {
  formatOrderDate,
  formatOrderTime,
  groupOrdersByDay,
  topChannelEntry,
  topOperatorEntry,
} from './pedidos-environment.helpers'
import { PedidosPanelStats, StatusPill } from './pedidos-environment-shell-panels'

export function OrdersTablePanel(props: Readonly<{ currency: OrderRecord['displayCurrency']; orders: OrderRecord[] }>) {
  const topChannel = topChannelEntry(props.orders)
  const topOperator = topOperatorEntry(props.orders)
  const biggest = [...props.orders].sort((left, right) => right.totalRevenue - left.totalRevenue)[0] ?? null
  const totalItems = props.orders.reduce((sum, order) => sum + order.totalItems, 0)
  const stats = [
    { label: 'canal líder', tone: 'info' as const, value: topChannel?.channel ?? '—' },
    { label: 'operador líder', tone: 'neutral' as const, value: topOperator?.name ?? '—' },
    {
      label: 'maior pedido',
      tone: 'success' as const,
      value: biggest ? formatCurrency(biggest.totalRevenue, props.currency) : '—',
    },
    { label: 'itens', tone: 'neutral' as const, value: String(totalItems) },
  ]

  return (
    <LabPanel
      action={<LabStatusPill tone="neutral">{props.orders.length} pedidos</LabStatusPill>}
      padding="none"
      subtitle="Consulta operacional por id, cliente, canal, valor e status."
      title="Tabela de pedidos"
    >
      <div className="border-b border-[var(--lab-border)] px-5 py-4">
        <PedidosPanelStats items={stats} />
      </div>
      <LabTable
        className="rounded-none border-0"
        columns={buildOrdersTableColumns(props.currency)}
        emptyDescription="Nenhum pedido registrado ainda."
        emptyTitle="Sem pedidos no periodo"
        rowKey="id"
        rows={props.orders}
      />
    </LabPanel>
  )
}

export function OrdersTimelinePanel(
  props: Readonly<{ currency: OrderRecord['displayCurrency']; orders: OrderRecord[] }>,
) {
  const groups = groupOrdersByDay(props.orders)
  const busiestDay = [...groups].sort((left, right) => right.orders.length - left.orders.length)[0] ?? null
  const latest =
    [...props.orders].sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    )[0] ?? null
  const averagePerDay = groups.length > 0 ? Math.round((props.orders.length / groups.length) * 10) / 10 : 0
  const footerItems = [
    { label: 'dias ativos', tone: 'neutral' as const, value: String(groups.length) },
    { label: 'média por dia', tone: 'info' as const, value: groups.length > 0 ? String(averagePerDay) : '—' },
    { label: 'dia mais forte', tone: 'success' as const, value: busiestDay?.label ?? '—' },
    { label: 'último registro', tone: 'neutral' as const, value: latest ? formatOrderDate(latest.createdAt) : '—' },
  ]

  return (
    <LabPanel
      action={<LabStatusPill tone="info">{groups.length} dias</LabStatusPill>}
      footer={<PedidosPanelStats items={footerItems} />}
      padding="md"
      title="Linha do tempo"
    >
      <div className="space-y-6">
        {groups.length > 0 ? (
          groups.map((group) => <TimelineDaySection currency={props.currency} group={group} key={group.key} />)
        ) : (
          <LabEmptyState compact description="Sem eventos de pedidos no periodo." title="Linha do tempo vazia" />
        )}
      </div>
    </LabPanel>
  )
}

// eslint-disable-next-line max-lines-per-function
function buildOrdersTableColumns(currency: OrderRecord['displayCurrency']) {
  return [
    {
      id: 'id',
      header: 'Id',
      cell: (order: OrderRecord) => (
        <span className="font-mono text-[var(--lab-fg-soft)]" title={order.id}>
          {formatOrderReference(order.id)}
        </span>
      ),
      width: '120px',
    },
    {
      id: 'data',
      header: 'Data',
      cell: (order: OrderRecord) => (
        <span className="text-[var(--lab-fg-soft)]">{formatOrderDate(order.createdAt)}</span>
      ),
      width: '140px',
    },
    {
      id: 'cliente',
      header: 'Cliente',
      cell: (order: OrderRecord) => (
        <span className="font-medium text-[var(--lab-fg)]">{order.customerName ?? 'Sem nome'}</span>
      ),
    },
    {
      id: 'itens',
      header: 'Itens',
      cell: (order: OrderRecord) => <span className="text-[var(--lab-fg-soft)]">{order.totalItems}</span>,
      align: 'right' as const,
      width: '90px',
    },
    {
      id: 'valor',
      header: 'Valor',
      cell: (order: OrderRecord) => (
        <span className="font-medium text-[var(--lab-fg)]">{formatCurrency(order.totalRevenue, currency)}</span>
      ),
      align: 'right' as const,
      width: '120px',
    },
    {
      id: 'canal',
      header: 'Canal',
      cell: (order: OrderRecord) => <span className="text-[var(--lab-fg-soft)]">{order.channel ?? 'balcao'}</span>,
      width: '120px',
    },
    {
      id: 'status',
      header: 'Status',
      cell: (order: OrderRecord) => <StatusPill status={order.status} />,
      width: '130px',
    },
  ]
}

function TimelineDaySection(
  props: Readonly<{
    currency: OrderRecord['displayCurrency']
    group: { key: string; label: string; orders: OrderRecord[] }
  }>,
) {
  return (
    <section className="space-y-3 border-b border-dashed border-[var(--lab-border)] pb-5 last:border-b-0 last:pb-0">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--lab-fg)]">{props.group.label}</h3>
          <p className="mt-1 text-xs text-[var(--lab-fg-soft)]">{props.group.orders.length} registros nesse dia.</p>
        </div>
        <LabStatusPill tone="info">
          {formatCurrency(
            props.group.orders.reduce((sum, order) => sum + order.totalRevenue, 0),
            props.currency,
          )}
        </LabStatusPill>
      </div>

      <div className="space-y-3">
        {props.group.orders.map((order) => (
          <div
            className="grid gap-3 rounded-[12px] border border-[var(--lab-border)] bg-[var(--lab-surface-raised)] px-4 py-3 md:grid-cols-[72px_minmax(0,1fr)_auto]"
            key={order.id}
          >
            <div className="text-xs font-medium text-[var(--lab-fg-soft)]">{formatOrderTime(order.createdAt)}</div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--lab-fg)]">
                {order.customerName ?? 'Pedido sem cliente'}
              </p>
              <p className="mt-1 text-sm text-[var(--lab-fg-soft)]">
                {order.totalItems} itens · {order.channel ?? 'balcao'} · {order.sellerName ?? 'sem operador'}
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 md:justify-end">
              <strong className="text-sm text-[var(--lab-fg)]">
                {formatCurrency(order.totalRevenue, props.currency)}
              </strong>
              <StatusPill status={order.status} />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
