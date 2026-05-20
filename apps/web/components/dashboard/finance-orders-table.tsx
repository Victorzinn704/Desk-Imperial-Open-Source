'use client'

import { useCallback, useState } from 'react'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import type { FinanceSummaryResponse } from '@contracts/contracts'
import { formatCurrency } from '@/lib/currency'
import { cn } from '@/lib/utils'
import { exportOrdersCsv, type FinanceOrdersCurrency } from './finance-orders-table.export'

type RecentOrder = FinanceSummaryResponse['recentOrders'][number]

type Props = {
  currency: FinanceOrdersCurrency
  orders: RecentOrder[]
}

const ROWS_PER_PAGE = 10
const ORDER_TABLE_HEADERS = ['Pedido', 'Receita', 'Lucro', 'Status', 'Data', 'Canal', 'Itens'] as const
const RIGHT_ALIGNED_HEADERS = new Set<OrderTableHeader>(['Receita', 'Lucro', 'Itens'])
const MOBILE_HIDDEN_HEADERS = new Set<OrderTableHeader>(['Data', 'Canal', 'Itens'])

type OrderTableHeader = (typeof ORDER_TABLE_HEADERS)[number]
type StatusTone = 'danger' | 'success'

function StatusBadge({ status }: { status: RecentOrder['status'] }) {
  const isCompleted = status === 'COMPLETED'
  const tone = isCompleted ? 'success' : 'danger'
  const badgeStyle = buildStatusBadgeStyle({ tone })
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
        tone === 'success' ? 'text-[var(--success)]' : 'text-[var(--danger)]',
      )}
      style={badgeStyle}
    >
      <span
        className={cn('size-1.5 rounded-full', tone === 'success' ? 'bg-[var(--success)]' : 'bg-[var(--danger)]')}
      />
      {isCompleted ? 'Concluído' : 'Cancelado'}
    </span>
  )
}

function buildStatusBadgeStyle({ tone }: Readonly<{ tone: StatusTone }>) {
  const color = tone === 'success' ? 'var(--success)' : 'var(--danger)'
  return {
    backgroundColor: `color-mix(in srgb, ${color} 10%, var(--surface))`,
    borderColor: `color-mix(in srgb, ${color} 28%, var(--border))`,
  }
}

function formatOrderDate({ createdAt }: Pick<RecentOrder, 'createdAt'>) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(createdAt))
}

export function FinanceOrdersTable({ currency, orders }: Readonly<Props>) {
  const [page, setPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(orders.length / ROWS_PER_PAGE))
  const start = (page - 1) * ROWS_PER_PAGE
  const current = orders.slice(start, start + ROWS_PER_PAGE)

  const handleExport = useCallback(() => {
    exportOrdersCsv({ orders, currency })
  }, [orders, currency])
  const handlePreviousPage = useCallback(() => {
    setPage((currentPage) => Math.max(1, currentPage - 1))
  }, [])
  const handleNextPage = useCallback(() => {
    setPage((currentPage) => Math.min(totalPages, currentPage + 1))
  }, [totalPages])

  if (orders.length === 0) {
    return <EmptyOrdersMessage />
  }

  return (
    <div className="space-y-3">
      <OrdersExportButton ordersCount={orders.length} onExport={handleExport} />
      <OrdersDataTable currency={currency} currentOrders={current} />
      <OrdersPagination
        ordersCount={orders.length}
        page={page}
        start={start}
        totalPages={totalPages}
        onNext={handleNextPage}
        onPrevious={handlePreviousPage}
      />
    </div>
  )
}

function EmptyOrdersMessage() {
  return (
    <p className="rounded-[10px] border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-6 text-center text-sm text-[var(--text-soft)] shadow-[var(--shadow-panel)]">
      Nenhum pedido encontrado para este filtro.
    </p>
  )
}

function OrdersExportButton({ ordersCount, onExport }: Readonly<{ ordersCount: number; onExport: () => void }>) {
  return (
    <div className="flex justify-end">
      <button
        className="flex items-center gap-2 rounded-[8px] border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] px-3 py-2 text-xs font-semibold text-[var(--text-soft)] transition-colors duration-200 hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
        type="button"
        onClick={onExport}
      >
        <Download className="size-3.5" />
        Exportar CSV ({ordersCount})
      </button>
    </div>
  )
}

function OrdersDataTable({
  currentOrders,
  currency,
}: Readonly<{ currentOrders: RecentOrder[]; currency: FinanceOrdersCurrency }>) {
  return (
    <div className="overflow-x-auto rounded-[10px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-panel)]">
      <table className="w-full text-sm">
        <OrdersTableHead />
        <tbody>
          {currentOrders.map((order, index) => (
            <OrderTableRow currency={currency} index={index} key={order.id} order={order} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function OrdersTableHead() {
  return (
    <thead>
      <tr className="border-b border-dashed border-[var(--border-strong)] bg-[color-mix(in_srgb,var(--surface)_92%,transparent)]">
        {ORDER_TABLE_HEADERS.map((label) => (
          <OrderHeaderCell key={label} label={label} />
        ))}
      </tr>
    </thead>
  )
}

function OrderHeaderCell({ label }: Readonly<{ label: OrderTableHeader }>) {
  const alignClass = RIGHT_ALIGNED_HEADERS.has(label) ? 'text-right' : 'text-left'
  const visibilityClass = MOBILE_HIDDEN_HEADERS.has(label) ? 'max-md:hidden' : ''
  const statusClass = label === 'Status' ? 'text-center' : alignClass
  return (
    <th
      className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)] ${visibilityClass} ${statusClass}`}
    >
      {label}
    </th>
  )
}

function OrderTableRow({
  currency,
  index,
  order,
}: Readonly<{ currency: FinanceOrdersCurrency; index: number; order: RecentOrder }>) {
  const isCompleted = order.status === 'COMPLETED'
  return (
    <tr
      className={cn(
        'border-b border-dashed border-[var(--border)] transition-colors hover:bg-[color-mix(in_srgb,var(--surface-muted)_36%,transparent)]',
        index % 2 === 0 ? 'bg-transparent' : 'bg-[color-mix(in_srgb,var(--surface-muted)_22%,transparent)]',
      )}
    >
      <td className="max-w-[180px] px-4 py-3">
        <p className="truncate font-semibold text-[var(--text-primary)]">
          {order.customerName || 'Cliente não informado'}
        </p>
      </td>
      <td
        className={cn(
          'px-4 py-3 text-right font-semibold',
          isCompleted ? 'text-[var(--success)]' : 'text-[var(--danger)]',
        )}
      >
        {isCompleted ? '' : '−'}
        {formatCurrency(order.totalRevenue, currency.code)}
      </td>
      <td className="px-4 py-3 text-right text-[var(--text-soft)]">
        {formatCurrency(order.totalProfit, currency.code)}
      </td>
      <td className="px-4 py-3 text-center">
        <StatusBadge status={order.status} />
      </td>
      <td className="px-4 py-3 text-[var(--text-soft)] max-md:hidden">{formatOrderDate(order)}</td>
      <td className="px-4 py-3 capitalize text-[var(--text-soft)] max-md:hidden">{order.channel || '—'}</td>
      <td className="px-4 py-3 text-right text-[var(--text-soft)] max-md:hidden">{order.totalItems}</td>
    </tr>
  )
}

function OrdersPagination({
  ordersCount,
  page,
  start,
  totalPages,
  onNext,
  onPrevious,
}: Readonly<{
  ordersCount: number
  page: number
  start: number
  totalPages: number
  onNext: () => void
  onPrevious: () => void
}>) {
  if (totalPages <= 1) {
    return null
  }

  return (
    <div className="flex items-center justify-between px-1">
      <p className="text-xs text-[var(--text-soft)]">
        {start + 1}–{Math.min(start + ROWS_PER_PAGE, ordersCount)} de {ordersCount} pedidos
      </p>
      <div className="flex items-center gap-2">
        <PaginationButton disabled={page === 1} icon="previous" onClick={onPrevious} />
        <span className="text-xs text-[var(--text-soft)]">
          {page} / {totalPages}
        </span>
        <PaginationButton disabled={page === totalPages} icon="next" onClick={onNext} />
      </div>
    </div>
  )
}

function PaginationButton({
  disabled,
  icon,
  onClick,
}: Readonly<{ disabled: boolean; icon: 'next' | 'previous'; onClick: () => void }>) {
  const Icon = icon === 'previous' ? ChevronLeft : ChevronRight
  return (
    <button
      className="flex size-7 items-center justify-center rounded-lg border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] text-[var(--text-soft)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text-primary)] disabled:opacity-30"
      disabled={disabled}
      type="button"
      onClick={onClick}
    >
      <Icon className="size-4" />
    </button>
  )
}
