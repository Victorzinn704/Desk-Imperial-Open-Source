import type { ProductRecord } from '@contracts/contracts'

const PRODUCT_CSV_HEADERS = [
  'name',
  'brand',
  'category',
  'packagingClass',
  'measurementUnit',
  'measurementValue',
  'unitsPerPackage',
  'description',
  'unitCost',
  'unitPrice',
  'stockPackages',
  'stockLooseUnits',
  'stock',
  'currency',
]

export function downloadProductTemplateCsv() {
  const csv = buildCsv([
    PRODUCT_CSV_HEADERS,
    [
      'Refrigerante Cola 2L',
      'Coca-Cola',
      'Bebidas',
      'Fardo Refrigerante 2L - 6 und',
      'L',
      '2',
      '6',
      'Fardo com 6 unidades de 2 litros.',
      '8.50',
      '12.90',
      '4',
      '3',
      '27',
      'BRL',
    ],
    [
      'Cerveja Lata 350ml',
      'Brahma',
      'Bebidas',
      'Lata - 12 und de 350ml',
      'ML',
      '350',
      '12',
      'Caixa com latas de 350 ml para venda rapida.',
      '5.20',
      '8.40',
      '3',
      '0',
      '36',
      'BRL',
    ],
  ])

  downloadCsvFile('modelo-produtos-desk-imperial.csv', csv)
}

export function downloadPortfolioCsv(products: ProductRecord[]) {
  const rows = products.map((product) => [
    product.name,
    product.brand ?? '',
    product.category,
    product.packagingClass,
    product.measurementUnit,
    String(product.measurementValue),
    String(product.unitsPerPackage),
    product.description ?? '',
    product.originalUnitCost.toFixed(2),
    product.originalUnitPrice.toFixed(2),
    String(product.stockPackages),
    String(product.stockLooseUnits),
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
