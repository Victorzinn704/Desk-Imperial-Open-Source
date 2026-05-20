'use client'

import Link from 'next/link'
import type { OrderRecord } from '@contracts/contracts'
import { LabEmptyState, LabPanel, LabStatusPill } from '@/components/design-lab/lab-primitives'
import { formatCurrency } from '@/lib/currency'
import { formatOrderDate, KANBAN_COLUMN_PREVIEW_LIMIT, topChannelLabel } from './pedidos-environment.helpers'

export function OrdersKanbanPanel(
  props: Readonly<{ currency: OrderRecord['displayCurrency']; orders: OrderRecord[] }>,
) {
  const sortedOrders = [...props.orders].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  )
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
      action={<LabStatusPill tone="info">{props.orders.length} pedidos</LabStatusPill>}
      data-testid="orders-kanban-grid"
      padding="md"
      title="Quadro por status"
    >
      <div className="space-y-6">
        {columns.map((column) => (
          <KanbanColumnSection column={column} currency={props.currency} key={column.id} />
        ))}
      </div>
    </LabPanel>
  )
}

function KanbanColumnSection(
  props: Readonly<{
    currency: OrderRecord['displayCurrency']
    column: { id: 'COMPLETED' | 'CANCELLED'; items: OrderRecord[]; label: string; tone: 'success' | 'danger' }
  }>,
) {
  const visibleItems = props.column.items.slice(0, KANBAN_COLUMN_PREVIEW_LIMIT)
  const hiddenCount = Math.max(0, props.column.items.length - visibleItems.length)
  const columnRevenue = props.column.items.reduce((sum, order) => sum + order.totalRevenue, 0)

  return (
    <section className="space-y-3 border-b border-dashed border-[var(--lab-border)] pb-5 last:border-b-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[var(--lab-fg)]">{props.column.label}</h3>
          <p className="mt-1 text-xs text-[var(--lab-fg-soft)]">
            {formatCurrency(columnRevenue, props.currency)} · {topChannelLabel(props.column.items)}
          </p>
        </div>
        <LabStatusPill tone={props.column.tone}>{props.column.items.length}</LabStatusPill>
      </div>

      {visibleItems.length > 0 ? (
        <>
          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {visibleItems.map((order) => (
              <KanbanOrderCard currency={props.currency} key={order.id} order={order} />
            ))}
          </div>
          {hiddenCount > 0 ? <HiddenOrdersLink hiddenCount={hiddenCount} /> : null}
        </>
      ) : (
        <LabEmptyState compact description="Sem pedidos nessa coluna." title={`${props.column.label} vazio`} />
      )}
    </section>
  )
}

function KanbanOrderCard(props: Readonly<{ currency: OrderRecord['displayCurrency']; order: OrderRecord }>) {
  return (
    <div className="rounded-[12px] border border-[var(--lab-border)] bg-[var(--lab-surface-raised)] px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--lab-fg)]">
            {props.order.customerName ?? 'Pedido sem cliente'}
          </p>
          <p className="mt-1 text-xs text-[var(--lab-fg-soft)]">
            {props.order.channel ?? 'balcao'} · {props.order.sellerName ?? 'sem operador'}
          </p>
        </div>
        <strong className="shrink-0 text-sm text-[var(--lab-fg)]">
          {formatCurrency(props.order.totalRevenue, props.currency)}
        </strong>
      </div>

      <div className="mt-3 grid gap-2 text-xs text-[var(--lab-fg-soft)] sm:grid-cols-2">
        <span>{props.order.totalItems} itens</span>
        <span className="sm:text-right">{formatOrderDate(props.order.createdAt)}</span>
        <span>
          {[props.order.buyerDistrict, props.order.buyerCity].filter(Boolean).join(' · ') || 'sem localizacao'}
        </span>
        <span className="sm:text-right">{formatCurrency(props.order.totalProfit, props.currency)} lucro</span>
      </div>
    </div>
  )
}

function HiddenOrdersLink({ hiddenCount }: Readonly<{ hiddenCount: number }>) {
  return (
    <Link
      aria-label={`${hiddenCount} pedidos adicionais - abrir tabela`}
      className="flex items-center justify-between gap-3 rounded-[12px] border border-dashed border-[var(--lab-border)] bg-[var(--lab-surface-hover)] px-4 py-3 text-xs font-medium text-[var(--lab-fg-soft)] transition hover:border-[var(--lab-blue-border)] hover:text-[var(--lab-blue)]"
      href="/design-lab/pedidos?tab=tabela"
    >
      <span>{hiddenCount} pedidos adicionais</span>
      <span>abrir tabela</span>
    </Link>
  )
}
