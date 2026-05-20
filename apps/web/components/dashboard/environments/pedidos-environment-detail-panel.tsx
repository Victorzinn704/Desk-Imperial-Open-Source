'use client'

import type { OrderRecord } from '@contracts/contracts'
import { LabEmptyState, LabPanel, LabSignalRow } from '@/components/design-lab/lab-primitives'
import { formatCurrency } from '@/lib/currency'
import { formatOrderDate } from './pedidos-environment.helpers'

export function OrderDetailPanel(
  props: Readonly<{ currency: OrderRecord['displayCurrency']; order: OrderRecord | null }>,
) {
  return (
    <LabPanel padding="md" title="Detalhe do ultimo pedido">
      {props.order ? (
        <OrderDetailContent currency={props.currency} order={props.order} />
      ) : (
        <LabEmptyState compact description="Ainda nao existe pedido para detalhar." title="Sem pedido para detalhar" />
      )}
    </LabPanel>
  )
}

function OrderDetailContent({
  currency,
  order,
}: Readonly<{ currency: OrderRecord['displayCurrency']; order: OrderRecord }>) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <OrderDetailCustomerCard order={order} />
        <OrderDetailItemsCard currency={currency} order={order} />
      </div>
      <OrderDetailSignalCard currency={currency} order={order} />
    </div>
  )
}

function OrderDetailCustomerCard({ order }: Readonly<{ order: OrderRecord }>) {
  return (
    <div className="rounded-[12px] border border-[var(--lab-border)] bg-[var(--lab-surface-raised)] px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--lab-fg-muted)]">Cliente</p>
      <p className="mt-2 text-base font-semibold text-[var(--lab-fg)]">{order.customerName ?? 'Nao informado'}</p>
      <p className="mt-1 text-sm text-[var(--lab-fg-soft)]">
        {order.channel ?? 'balcao'} · {formatOrderDate(order.createdAt)}
      </p>
      {order.notes ? <p className="mt-3 text-sm text-[var(--lab-fg-soft)]">{order.notes}</p> : null}
    </div>
  )
}

function OrderDetailItemsCard({
  currency,
  order,
}: Readonly<{ currency: OrderRecord['displayCurrency']; order: OrderRecord }>) {
  return (
    <div className="rounded-[12px] border border-[var(--lab-border)] bg-[var(--lab-surface-raised)] px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--lab-fg-muted)]">Itens</p>
      <div className="mt-3 space-y-2">
        {order.items.length > 0 ? (
          order.items.map((item) => (
            <div
              className="flex items-center justify-between gap-4 border-b border-dashed border-[var(--lab-border)] pb-2 last:border-b-0 last:pb-0"
              key={item.id}
            >
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
  )
}

function OrderDetailSignalCard({
  currency,
  order,
}: Readonly<{ currency: OrderRecord['displayCurrency']; order: OrderRecord }>) {
  return (
    <div className="rounded-[12px] border border-[var(--lab-border)] bg-[var(--lab-surface-raised)] px-4 py-4">
      <div className="space-y-0">
        <LabSignalRow
          label="valor"
          note="receita do pedido em foco"
          tone="success"
          value={formatCurrency(order.totalRevenue, currency)}
        />
        <LabSignalRow
          label="lucro"
          note="resultado acumulado deste pedido"
          tone="neutral"
          value={formatCurrency(order.totalProfit, currency)}
        />
        <LabSignalRow
          label="status"
          note="situacao operacional atual"
          tone={order.status === 'COMPLETED' ? 'success' : 'danger'}
          value={order.status === 'COMPLETED' ? 'Concluido' : 'Cancelado'}
        />
        <LabSignalRow
          label="operador"
          note="responsavel pelo registro"
          tone="info"
          value={order.sellerName ?? 'Nao informado'}
        />
      </div>
    </div>
  )
}
