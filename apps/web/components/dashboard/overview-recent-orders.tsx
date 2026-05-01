'use client'

import type { FinanceSummaryResponse } from '@contracts/contracts'
import { LabPanel, LabStatusPill, LabTable, type LabStatusTone } from '@/components/design-lab/lab-primitives'
import { formatCurrency } from '@/lib/currency'
import { formatOrderReference } from '@/lib/order-reference'
import { cn } from '@/lib/utils'

type RecentOrder = FinanceSummaryResponse['recentOrders'][number]
type OverviewRecentOrdersSurface = 'default' | 'lab'

type OverviewRecentOrdersProps = {
  orders: RecentOrder[]
  displayCurrency: FinanceSummaryResponse['displayCurrency']
  isLoading?: boolean
  summaryText?: string | null
  surface?: OverviewRecentOrdersSurface
}

function resolveOrderStatus(status: RecentOrder['status']) {
  switch (status) {
    case 'COMPLETED':
      return { label: 'Concluído', tone: 'success' as const }
    case 'CANCELLED':
      return { label: 'Cancelado', tone: 'danger' as const }
    default:
      return { label: status, tone: 'neutral' as const }
  }
}

function StatusBadge({
  status,
  surface = 'default',
}: Readonly<{
  status: RecentOrder['status']
  surface?: OverviewRecentOrdersSurface
}>) {
  const { label, tone } = resolveOrderStatus(status)

  if (surface === 'lab') {
    return <LabStatusPill tone={tone}>{label}</LabStatusPill>
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
        defaultPillToneClass(tone),
      )}
    >
      {label}
    </span>
  )
}

export function OverviewRecentOrders({
  orders,
  displayCurrency,
  isLoading = false,
  summaryText = null,
  surface = 'default',
}: Readonly<OverviewRecentOrdersProps>) {
  const recentFive = orders.slice(0, 5)

  if (surface === 'lab') {
    if (isLoading) {
      return (
        <LabPanel
          title="Pedidos recentes"
          subtitle="Últimos 5 pedidos consolidados na operação"
          action={summaryText ? <LabStatusPill tone="info">{summaryText}</LabStatusPill> : null}
          padding="md"
        >
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div className="skeleton-shimmer h-14 rounded-2xl" key={i} />
            ))}
          </div>
        </LabPanel>
      )
    }

    return (
      <LabPanel
        title="Pedidos recentes"
        subtitle="Leitura rápida das comandas mais recentes consolidadas"
        action={summaryText ? <LabStatusPill tone="info">{summaryText}</LabStatusPill> : null}
        padding="none"
      >
        <LabTable
          columns={[
            {
              id: 'id',
              header: 'Pedido',
              cell: (order) => (
                <div className="space-y-1">
                  <span className="font-medium text-[var(--lab-fg)]">#{formatOrderReference(String(order.id))}</span>
                  <p className="text-xs text-[var(--lab-fg-muted)]">{order.customerName || 'Mesa sem identificação'}</p>
                </div>
              ),
              width: '24%',
            },
            {
              id: 'items',
              header: 'Itens',
              cell: (order) => (
                <span className="text-sm text-[var(--lab-fg-soft)]">
                  {order.totalItems} {order.totalItems === 1 ? 'item' : 'itens'}
                </span>
              ),
              className: 'max-md:hidden',
              headerClassName: 'max-md:hidden',
              width: '14%',
            },
            {
              id: 'value',
              header: 'Valor',
              cell: (order) => (
                <span className="font-semibold text-[var(--lab-fg)]">
                  {formatCurrency(order.totalRevenue, displayCurrency)}
                </span>
              ),
              align: 'right',
              width: '18%',
            },
            {
              id: 'channel',
              header: 'Origem',
              cell: (order) => <span className="text-sm text-[var(--lab-fg-soft)]">{order.channel || '—'}</span>,
              className: 'max-lg:hidden',
              headerClassName: 'max-lg:hidden',
              width: '18%',
            },
            {
              id: 'status',
              header: 'Status',
              cell: (order) => <StatusBadge status={order.status} surface="lab" />,
              align: 'right',
              width: '18%',
            },
          ]}
          rows={recentFive}
          rowKey="id"
          dense
          emptyTitle="Nenhum pedido consolidado ainda"
          emptyDescription="Assim que a operação registrar pedidos fechados, eles aparecem aqui para auditoria rápida."
        />
      </LabPanel>
    )
  }

  if (isLoading) {
    return (
      <div className="rounded-[8px] border border-[var(--border-strong)] bg-[var(--surface)] p-5">
        <div className="skeleton-shimmer h-4 w-32 rounded-full" />
        <div className="skeleton-shimmer mt-2 h-3 w-48 rounded-full" />
        <div className="mt-5 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div className="skeleton-shimmer h-12 rounded-[8px]" key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-[8px] border border-[var(--border-strong)] bg-[var(--surface)] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            Pedidos recentes
          </h3>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">últimos 5 pedidos concluídos</p>
        </div>
        {summaryText ? (
          <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-1 font-mono text-[11px] text-[var(--accent)]">
            {summaryText}
          </span>
        ) : null}
      </div>

      {recentFive.length === 0 ? (
        <p className="mt-8 pb-4 text-center text-xs text-[var(--text-muted)]">
          Nenhum pedido concluído ainda
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="pb-3 pr-4 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  ID
                </th>
                <th className="pb-3 pr-4 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  Cliente
                </th>
                <th className="pb-3 pr-4 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)] max-md:hidden">
                  Itens
                </th>
                <th className="pb-3 pr-4 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  Valor
                </th>
                <th className="pb-3 pr-4 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)] max-lg:hidden">
                  Origem
                </th>
                <th className="pb-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {recentFive.map((order) => (
                <tr
                  className="border-b border-[var(--border)]/50 transition-colors hover:bg-[var(--surface-muted)]/50"
                  key={order.id}
                >
                  <td className="py-3 pr-4">
                    <span className="font-medium text-[var(--text-soft)]">
                      #{formatOrderReference(String(order.id))}
                    </span>
                  </td>
                  <td className="max-w-[140px] truncate py-3 pr-4 font-medium text-[var(--text-primary)]">
                    {order.customerName || 'Mesa —'}
                  </td>
                  <td className="py-3 pr-4 text-[var(--text-soft)] max-md:hidden">
                    {order.totalItems} {order.totalItems === 1 ? 'item' : 'itens'}
                  </td>
                  <td className="py-3 pr-4 font-semibold text-[var(--text-primary)]">
                    {formatCurrency(order.totalRevenue, displayCurrency)}
                  </td>
                  <td className="py-3 pr-4 text-[var(--text-soft)] max-lg:hidden">
                    {order.channel || '—'}
                  </td>
                  <td className="py-3">
                    <StatusBadge status={order.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function defaultPillToneClass(tone: LabStatusTone) {
  return {
    neutral: 'border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-soft)]',
    info: 'border-[color-mix(in_srgb,var(--accent)_28%,transparent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--accent-strong)]',
    success: 'border-[color-mix(in_srgb,var(--success)_28%,transparent)] bg-[color-mix(in_srgb,var(--success)_10%,transparent)] text-[var(--success)]',
    warning: 'border-[color-mix(in_srgb,var(--warning)_28%,transparent)] bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] text-[var(--warning)]',
    danger: 'border-[color-mix(in_srgb,var(--danger)_28%,transparent)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-[var(--danger)]',
  }[tone]
}
