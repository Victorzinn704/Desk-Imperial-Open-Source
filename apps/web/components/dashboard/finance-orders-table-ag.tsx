'use client'

/**
 * EXPERIMENTO LOCAL — ag-grid-community (gratuito)
 * Substitui a tabela HTML manual por Ag-Grid com:
 *   - Ordenação em qualquer coluna (click no header)
 *   - Filtro rápido por texto
 *   - Paginação nativa
 *   - Resize de colunas
 *   - Performance melhor em listas longas
 *
 * Para voltar à versão original: usar finance-orders-table.tsx
 */

import { useCallback, useMemo, useRef } from 'react'
import { AgGridReact } from 'ag-grid-react'
import type { CellStyle, ColDef, GridReadyEvent, ValueFormatterParams } from 'ag-grid-community'
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community'
import { Download } from 'lucide-react'
import type { FinanceSummaryResponse } from '@contracts/contracts'
import { formatCurrency } from '@/lib/currency'

ModuleRegistry.registerModules([AllCommunityModule])

type RecentOrder = FinanceSummaryResponse['recentOrders'][number]

type Props = {
  orders: RecentOrder[]
  displayCurrency: FinanceSummaryResponse['displayCurrency']
}

// Tema imperial dark customizado
const imperialTheme = themeQuartz.withParams({
  backgroundColor: 'rgba(10,11,15,0)',
  foregroundColor: '#e2ddd6',
  borderColor: 'rgba(255,255,255,0.06)',
  rowHoverColor: 'rgba(255,255,255,0.025)',
  oddRowBackgroundColor: 'rgba(255,255,255,0.01)',
  headerBackgroundColor: 'rgba(255,255,255,0.02)',
  headerTextColor: 'rgba(226,221,214,0.55)',
  accentColor: '#9b8460',
  fontFamily: 'inherit',
  fontSize: 13,
  rowHeight: 48,
  headerHeight: 40,
})

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

export function FinanceOrdersTableAg({ orders, displayCurrency }: Props) {
  const gridRef = useRef<AgGridReact<RecentOrder>>(null)

  const columnDefs = useMemo<ColDef<RecentOrder>[]>(() => [
    {
      field: 'customerName',
      headerName: 'Cliente',
      flex: 2,
      minWidth: 140,
      valueFormatter: (p) => p.value ?? 'Cliente não informado',
      cellStyle: { fontWeight: 600, color: '#fff' } as CellStyle,
    },
    {
      field: 'totalRevenue',
      headerName: 'Receita',
      flex: 1,
      minWidth: 110,
      type: 'numericColumn',
      valueFormatter: (p: ValueFormatterParams<RecentOrder>) =>
        formatCurrency(p.value as number, displayCurrency),
      cellStyle: (p) => ({
        color: p.data?.status === 'COMPLETED' ? '#36f57c' : '#f87171',
        fontWeight: 600,
        textAlign: 'right',
      }),
    },
    {
      field: 'totalProfit',
      headerName: 'Lucro',
      flex: 1,
      minWidth: 100,
      type: 'numericColumn',
      valueFormatter: (p: ValueFormatterParams<RecentOrder>) =>
        formatCurrency(p.value as number, displayCurrency),
      cellStyle: { color: 'rgba(226,221,214,0.55)', textAlign: 'right' } as CellStyle,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      cellRenderer: (p: { value: string }) => {
        const ok = p.value === 'COMPLETED'
        return `<span style="
          display:inline-flex;align-items:center;gap:5px;
          border-radius:9999px;padding:2px 10px;font-size:11px;font-weight:700;
          border:1px solid ${ok ? 'rgba(52,242,127,0.25)' : 'rgba(240,68,56,0.25)'};
          background:${ok ? 'rgba(52,242,127,0.08)' : 'rgba(240,68,56,0.08)'};
          color:${ok ? '#36f57c' : '#f87171'};
        ">
          <span style="width:6px;height:6px;border-radius:50%;background:${ok ? '#36f57c' : '#f87171'}"></span>
          ${ok ? 'Concluído' : 'Cancelado'}
        </span>`
      },
    },
    {
      field: 'createdAt',
      headerName: 'Data',
      flex: 1,
      minWidth: 130,
      valueFormatter: (p) => formatDate(p.value as string),
      cellStyle: { color: 'rgba(226,221,214,0.55)' } as CellStyle,
    },
    {
      field: 'channel',
      headerName: 'Canal',
      flex: 1,
      minWidth: 100,
      valueFormatter: (p) => p.value ?? '—',
      cellStyle: { color: 'rgba(226,221,214,0.55)', textTransform: 'capitalize' } as CellStyle,
    },
    {
      field: 'totalItems',
      headerName: 'Itens',
      width: 80,
      type: 'numericColumn',
      cellStyle: { color: 'rgba(226,221,214,0.55)', textAlign: 'right' } as CellStyle,
    },
  ], [displayCurrency])

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    resizable: true,
    filter: true,
  }), [])

  const onGridReady = useCallback((e: GridReadyEvent) => {
    e.api.sizeColumnsToFit()
  }, [])

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
          className="flex items-center gap-2 rounded-[12px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-xs font-semibold text-[var(--text-soft)] transition-colors duration-200 hover:border-[rgba(52,242,127,0.3)] hover:text-[#36f57c]"
          type="button"
          onClick={handleExport}
        >
          <Download className="size-3.5" />
          Exportar CSV ({orders.length})
        </button>
      </div>

      <div
        className="rounded-2xl border border-[rgba(255,255,255,0.06)] overflow-hidden"
        style={{ height: Math.min(orders.length * 48 + 88, 520) }}
      >
        <AgGridReact<RecentOrder>
          ref={gridRef}
          theme={imperialTheme}
          rowData={orders}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          pagination
          paginationPageSize={10}
          paginationPageSizeSelector={[10, 25, 50]}
          animateRows
          onGridReady={onGridReady}
        />
      </div>
    </div>
  )
}
