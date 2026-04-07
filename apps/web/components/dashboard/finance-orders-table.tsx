'use client'

import { useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import type { FinanceSummaryResponse } from '@contracts/contracts'
import { formatCurrency } from '@/lib/currency'
import { cn } from '@/lib/utils'

type RecentOrder = FinanceSummaryResponse['recentOrders'][number]

type Props = {
  orders: RecentOrder[]
  displayCurrency: FinanceSummaryResponse['displayCurrency']
}

const ROWS_PER_PAGE = 10

function StatusBadge({ status }: { status: RecentOrder['status'] }) {
  const isCompleted = status === 'COMPLETED'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
        isCompleted
          ? 'border-[rgba(34,197,94,0.25)] bg-[rgba(34,197,94,0.08)] text-[#22c55e]'
          : 'border-[rgba(240,68,56,0.25)] bg-[rgba(240,68,56,0.08)] text-red-400',
      )}
    >
      <span className={cn('size-1.5 rounded-full', isCompleted ? 'bg-[#22c55e]' : 'bg-red-400')} />
      {isCompleted ? 'Concluído' : 'Cancelado'}
    </span>
  )
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

function exportOrdersCsv(orders: RecentOrder[], currency: string) {
  const header = ['Cliente', 'Canal', 'Receita', 'Lucro', 'Itens', 'Status', 'Data']
  const rows = orders.map((o) => [
    o.customerName ?? 'Anônimo',
    o.channel ?? '—',
    (o.totalRevenue / 100).toFixed(2),
    (o.totalProfit / 100).toFixed(2),
    String(o.totalItems),
    o.status,
    new Date(o.createdAt).toLocaleString('pt-BR'),
  ])
  const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pedidos_${currency}_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function FinanceOrdersTable({ orders, displayCurrency }: Props) {
  const [page, setPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(orders.length / ROWS_PER_PAGE))
  const start = (page - 1) * ROWS_PER_PAGE
  const current = orders.slice(start, start + ROWS_PER_PAGE)

  const handleExport = useCallback(() => {
    exportOrdersCsv(orders, displayCurrency)
  }, [orders, displayCurrency])

  if (orders.length === 0) {
    return (
      <p className="imperial-card-soft px-4 py-6 text-center text-sm text-[var(--text-soft)]">
        Nenhum pedido encontrado para este filtro.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          className="flex items-center gap-2 rounded-[12px] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-xs font-semibold text-[var(--text-soft)] transition-colors duration-200 hover:border-[rgba(0,140,255,0.3)] hover:text-[var(--accent)]"
          type="button"
          onClick={handleExport}
        >
          <Download className="size-3.5" />
          Exportar CSV ({orders.length})
        </button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-muted)]">
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                Pedido
              </th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                Receita
              </th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                Lucro
              </th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                Status
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)] max-md:hidden">
                Data
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)] max-md:hidden">
                Canal
              </th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)] max-md:hidden">
                Itens
              </th>
            </tr>
          </thead>
          <tbody>
            {current.map((order, i) => {
              const isCompleted = order.status === 'COMPLETED'
              return (
                <tr
                  key={order.id}
                  className={cn(
                    'border-b border-[var(--border)] transition-colors hover:bg-[rgba(255,255,255,0.02)]',
                    i % 2 === 0 ? 'bg-transparent' : 'bg-[rgba(255,255,255,0.01)]',
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
                      isCompleted ? 'text-[#22c55e]' : 'text-red-400',
                    )}
                  >
                    {isCompleted ? '' : '−'}
                    {formatCurrency(order.totalRevenue, displayCurrency)}
                  </td>
                  <td className="px-4 py-3 text-right text-[var(--text-soft)]">
                    {formatCurrency(order.totalProfit, displayCurrency)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3 text-[var(--text-soft)] max-md:hidden">{formatDate(order.createdAt)}</td>
                  <td className="px-4 py-3 capitalize text-[var(--text-soft)] max-md:hidden">{order.channel || '—'}</td>
                  <td className="px-4 py-3 text-right text-[var(--text-soft)] max-md:hidden">{order.totalItems}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-[var(--text-soft)]">
            {start + 1}–{Math.min(start + ROWS_PER_PAGE, orders.length)} de {orders.length} pedidos
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex size-7 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-soft)] transition-colors hover:border-[rgba(0,140,255,0.3)] hover:text-[var(--text-primary)] disabled:opacity-30"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-xs text-[var(--text-soft)]">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex size-7 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-soft)] transition-colors hover:border-[rgba(0,140,255,0.3)] hover:text-[var(--text-primary)] disabled:opacity-30"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
