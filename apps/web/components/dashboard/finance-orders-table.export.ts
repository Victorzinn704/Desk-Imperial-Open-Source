import type { FinanceSummaryResponse } from '@contracts/contracts'

type RecentOrder = FinanceSummaryResponse['recentOrders'][number]
export type FinanceOrdersCurrency = {
  code: FinanceSummaryResponse['displayCurrency']
}
type CsvCell = { value: string }
type CsvDocument = { content: string; filename: string }
type OrdersCsvExport = {
  currency: FinanceOrdersCurrency
  orders: RecentOrder[]
}

const CSV_FORMULA_PREFIXES = new Set(['=', '+', '-', '@'])
const CSV_HEADERS = ['Cliente', 'Canal', 'Receita', 'Lucro', 'Itens', 'Status', 'Data'] as const

export function exportOrdersCsv({ orders, currency }: OrdersCsvExport) {
  const content = [CSV_HEADERS, ...orders.map(buildOrderCsvRow)]
    .map((row) => row.map((value) => escapeCsvCell({ value })).join(','))
    .join('\r\n')

  downloadCsvFile({
    filename: `pedidos_${currency.code}_${new Date().toISOString().slice(0, 10)}.csv`,
    content,
  })
}

function buildOrderCsvRow(order: RecentOrder) {
  return [
    order.customerName ?? 'Anônimo',
    order.channel ?? '-',
    (order.totalRevenue / 100).toFixed(2),
    (order.totalProfit / 100).toFixed(2),
    String(order.totalItems),
    order.status,
    new Date(order.createdAt).toLocaleString('pt-BR'),
  ]
}

function escapeCsvCell({ value }: CsvCell) {
  const normalized = neutralizeCsvFormula({ value }).replaceAll('"', '""')
  return `"${normalized}"`
}

function neutralizeCsvFormula({ value }: CsvCell) {
  const trimmed = value.trimStart()
  if (!trimmed) {
    return value
  }

  return CSV_FORMULA_PREFIXES.has(trimmed[0]) ? `'${value}` : value
}

function downloadCsvFile({ filename, content }: CsvDocument) {
  if (typeof window === 'undefined') {
    return
  }

  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' })
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.URL.revokeObjectURL(url)
}
