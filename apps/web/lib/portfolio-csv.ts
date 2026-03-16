import type { ProductRecord } from '@contracts/contracts'

const PRODUCT_CSV_HEADERS = ['name', 'category', 'description', 'unitCost', 'unitPrice', 'stock', 'currency']

export function downloadProductTemplateCsv() {
  const csv = buildCsv([
    PRODUCT_CSV_HEADERS,
    ['Refrigerante Cola 2L', 'Bebidas', 'Fardo com 6 unidades', '8.50', '12.90', '24', 'BRL'],
    ['Suco Natural 1L', 'Bebidas', 'Caixa com 12 unidades', '5.20', '8.40', '36', 'BRL'],
  ])

  downloadCsvFile('modelo-produtos-desk-imperial.csv', csv)
}

export function downloadPortfolioCsv(products: ProductRecord[]) {
  const rows = products.map((product) => [
    product.name,
    product.category,
    product.description ?? '',
    product.originalUnitCost.toFixed(2),
    product.originalUnitPrice.toFixed(2),
    String(product.stock),
    product.currency,
  ])

  const csv = buildCsv([PRODUCT_CSV_HEADERS, ...rows])
  downloadCsvFile('portfolio-desk-imperial.csv', csv)
}

function buildCsv(rows: string[][]) {
  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n')
}

function escapeCsvCell(value: string) {
  const normalized = neutralizeCsvFormula(value).replaceAll('"', '""')
  return `"${normalized}"`
}

function neutralizeCsvFormula(value: string) {
  const trimmed = value.trimStart()
  if (!trimmed) {
    return value
  }

  return ['=', '+', '-', '@'].includes(trimmed[0]) ? `'${value}` : value
}

function downloadCsvFile(filename: string, content: string) {
  if (typeof window === 'undefined') {
    return
  }

  const blob = new Blob([`\uFEFF${content}`], {
    type: 'text/csv;charset=utf-8',
  })
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
