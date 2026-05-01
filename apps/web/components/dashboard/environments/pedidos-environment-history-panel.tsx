'use client'

import type { OrderRecord } from '@contracts/contracts'
import { LabEmptyState, LabPanel, LabStatusPill } from '@/components/design-lab/lab-primitives'
import { formatCurrency } from '@/lib/currency'
import { formatOrderDate, formatOrderTime, groupOrdersByDay } from './pedidos-environment.helpers'
import { PedidosPanelStats, StatusPill } from './pedidos-environment-shell-panels'

export function OrdersHistoryPanel(
  props: Readonly<{ currency: OrderRecord['displayCurrency']; orders: OrderRecord[] }>,
) {
  const sortedOrders = [...props.orders].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  )
  const groups = groupOrdersByDay(sortedOrders)
  const uniqueOperators = new Set(sortedOrders.map((order) => order.sellerName).filter(Boolean)).size
  const uniqueChannels = new Set(sortedOrders.map((order) => order.channel ?? 'balcao')).size
  const lastCancelled = sortedOrders.find((order) => order.status === 'CANCELLED')
  const footerItems = [
    { label: 'dias ativos', tone: 'neutral' as const, value: String(groups.length) },
    { label: 'operadores', tone: 'info' as const, value: String(uniqueOperators) },
    { label: 'canais', tone: 'neutral' as const, value: String(uniqueChannels) },
    {
      label: 'último cancelamento',
      tone: lastCancelled ? ('warning' as const) : ('neutral' as const),
      value: lastCancelled ? formatOrderDate(lastCancelled.createdAt) : '—',
    },
  ]

  return (
    <LabPanel
      action={<LabStatusPill tone="neutral">{groups.length} dias</LabStatusPill>}
      footer={<PedidosPanelStats items={footerItems} />}
      padding="md"
      title="Historico consolidado"
    >
      {groups.length === 0 ? (
        <LabEmptyState compact description="Sem pedidos para auditar no periodo atual." title="Historico vazio" />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <HistoryDaySection currency={props.currency} group={group} key={group.key} />
          ))}
        </div>
      )}
    </LabPanel>
  )
}

function HistoryDaySection(
  props: Readonly<{
    currency: OrderRecord['displayCurrency']
    group: { key: string; label: string; orders: OrderRecord[] }
  }>,
) {
  return (
    <section className="space-y-3 border-b border-dashed border-[var(--lab-border)] pb-5 last:border-b-0 last:pb-0">
      <HistoryDayHeader currency={props.currency} group={props.group} />

      <div className="space-y-1">
        {props.group.orders.map((order) => (
          <HistoryOrderRow currency={props.currency} key={order.id} order={order} />
        ))}
      </div>
    </section>
  )
}

function HistoryDayHeader({
  currency,
  group,
}: Readonly<{
  currency: OrderRecord['displayCurrency']
  group: { key: string; label: string; orders: OrderRecord[] }
}>) {
  const dayRevenue = group.orders.reduce((sum, order) => sum + order.totalRevenue, 0)

  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold text-[var(--lab-fg)]">{group.label}</h3>
        <p className="mt-1 text-xs text-[var(--lab-fg-soft)]">{group.orders.length} pedidos registrados nesse dia.</p>
      </div>
      <LabStatusPill tone="info">{formatCurrency(dayRevenue, currency)}</LabStatusPill>
    </div>
  )
}

function HistoryOrderRow({
  currency,
  order,
}: Readonly<{ currency: OrderRecord['displayCurrency']; order: OrderRecord }>) {
  return (
    <div className="grid gap-3 border-b border-dashed border-[var(--lab-border)] px-1 py-3 last:border-b-0 md:grid-cols-[72px_minmax(0,1.2fr)_minmax(0,1fr)_auto_auto]">
      <div className="text-xs font-medium text-[var(--lab-fg-soft)]">{formatOrderTime(order.createdAt)}</div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-[var(--lab-fg)]">
          {order.customerName ?? 'Pedido sem cliente'}
        </p>
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
  )
}
