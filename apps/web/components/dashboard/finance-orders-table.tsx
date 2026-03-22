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
        'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-colors',
        isCompleted
          ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400'
          : 'bg-destructive/10 text-destructive dark:text-red-400',
      )}
    >
      <span className={cn('size-1.5 rounded-full', isCompleted ? 'bg-emerald-500' : 'bg-destructive')} />
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
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center bg-background/50">
        <p className="text-sm text-muted-foreground">Nenhum pedido encontrado para este filtro.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground hover:border-muted-foreground/30 shadow-sm"
          type="button"
          onClick={handleExport}
        >
          <Download className="size-3.5" />
          Exportar CSV ({orders.length})
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-muted-foreground">
                Pedido
              </th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-muted-foreground">
                Receita
              </th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-muted-foreground">
                Lucro
              </th>
              <th className="px-5 py-3.5 text-center text-xs font-semibold text-muted-foreground">
                Status
              </th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-muted-foreground max-md:hidden">
                Data
              </th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-muted-foreground max-md:hidden">
                Canal
              </th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-muted-foreground max-md:hidden">
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
                    'border-b border-border/50 transition-colors hover:bg-muted/50 last:border-0'
                  )}
                >
                  <td className="max-w-[180px] px-5 py-4">
                    <p className="truncate font-medium text-foreground">
                      {order.customerName || 'Cliente não informado'}
                    </p>
                  </td>
                  <td className={cn('px-5 py-4 text-right font-medium', isCompleted ? 'text-foreground' : 'text-muted-foreground')}>
                    {isCompleted ? '' : '−'}
                    {formatCurrency(order.totalRevenue, displayCurrency)}
                  </td>
                  <td className="px-5 py-4 text-right text-muted-foreground">
                    {formatCurrency(order.totalProfit, displayCurrency)}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-5 py-4 text-muted-foreground max-md:hidden">
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="px-5 py-4 capitalize text-muted-foreground max-md:hidden">
                    {order.channel || '—'}
                  </td>
                  <td className="px-5 py-4 text-right text-muted-foreground max-md:hidden">
                    {order.totalItems}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1 pt-2">
          <p className="text-xs text-muted-foreground">
            {start + 1}–{Math.min(start + ROWS_PER_PAGE, orders.length)} de <span className="font-medium text-foreground">{orders.length}</span> pedidos
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex size-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-all hover:bg-muted hover:text-foreground disabled:opacity-50 shadow-sm"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="min-w-[40px] text-center text-xs font-medium text-muted-foreground">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex size-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-all hover:bg-muted hover:text-foreground disabled:opacity-50 shadow-sm"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
