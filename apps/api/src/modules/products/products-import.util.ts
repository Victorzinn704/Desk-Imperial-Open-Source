export type ProductImportRow = {
  line: number
  name: string
  brand: string | null
  category: string
  packagingClass: string
  measurementUnit: string
  measurementValue: number
  unitsPerPackage: number
  description: string | null
  unitCost: number
  unitPrice: number
  currency: string
  stockPackages: number
  stockLooseUnits: number
  stock: number
}

type ProductImportCsvDocument = {
  headers: string[]
  dataLines: string[]
  delimiter: string
}

type ProductImportLineInput = {
  line: string
  rowIndex: number
  document: ProductImportCsvDocument
}

type ProductImportRowInput = {
  lineNumber: number
  row: Record<string, string>
}

const requiredHeaders = ['name', 'category', 'description', 'unitcost', 'unitprice']
const MAX_IMPORT_ROWS = 500
const MAX_LINE_LENGTH = 4000
const MAX_COLUMNS = 14
const MAX_CELL_LENGTH = 280

export function parseProductImportCsv(content: string): ProductImportRow[] {
  const lines = normalizeCsvLines(content)
  const document = buildCsvDocument(lines)

  if (!document) {
    return []
  }

  return document.dataLines.map((line, rowIndex) => parseProductImportLine({ line, rowIndex, document }))
}

function normalizeCsvLines(content: string) {
  assertCsvContentIsSafe(content)

  const normalized = content.replace(/^\uFEFF/, '').trim()
  if (!normalized) {
    return []
  }

  return normalized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function assertCsvContentIsSafe(content: string) {
  if (content.includes('\0')) {
    throw new Error('O CSV contem bytes invalidos e nao pode ser processado.')
  }
}

function buildCsvDocument(lines: string[]): ProductImportCsvDocument | null {
  const headerLine = lines[0]
  if (!headerLine || lines.length < 2) {
    return null
  }

  assertImportRowLimit(lines)

  const delimiter = detectDelimiter(headerLine)
  const headers = splitCsvLine(headerLine, delimiter).map((header) => normalizeHeader(header))

  validateCsvHeaders(headers)

  return {
    headers,
    dataLines: lines.slice(1),
    delimiter,
  }
}

function assertImportRowLimit(lines: string[]) {
  if (lines.length - 1 > MAX_IMPORT_ROWS) {
    throw new Error(`O CSV excede o limite de ${MAX_IMPORT_ROWS} linhas por importacao.`)
  }
}

function validateCsvHeaders(headers: string[]) {
  assertColumnLimit(headers)
  assertRequiredHeaders(headers)
  assertStockHeaders(headers)
}

function assertColumnLimit(headers: string[]) {
  if (headers.length > MAX_COLUMNS) {
    throw new Error(`O CSV suporta no maximo ${MAX_COLUMNS} colunas nesta importacao.`)
  }
}

function assertRequiredHeaders(headers: string[]) {
  for (const requiredHeader of requiredHeaders) {
    if (!headers.includes(requiredHeader)) {
      throw new Error(`O CSV precisa conter a coluna "${requiredHeader}".`)
    }
  }
}

function assertStockHeaders(headers: string[]) {
  if (!hasStockHeader(headers)) {
    throw new Error('O CSV precisa conter "stock" ou o par "stockPackages" e "stockLooseUnits".')
  }
}

function hasStockHeader(headers: string[]) {
  return headers.includes('stock') || headers.includes('stockpackages') || headers.includes('stocklooseunits')
}

function parseProductImportLine({ document, line, rowIndex }: ProductImportLineInput): ProductImportRow {
  const lineNumber = rowIndex + 2

  assertLineLength({ line, lineNumber })
  const values = splitCsvLine(line, document.delimiter)
  assertLineShape({ headers: document.headers, values, lineNumber })

  return toProductImportRow({
    lineNumber,
    row: buildRowValues({ headers: document.headers, values }),
  })
}

function assertLineLength(params: { line: string; lineNumber: number }) {
  if (params.line.length > MAX_LINE_LENGTH) {
    throw new Error(`Linha ${params.lineNumber}: excede o limite maximo permitido.`)
  }
}

function assertLineShape(params: { headers: string[]; values: string[]; lineNumber: number }) {
  if (params.values.length !== params.headers.length) {
    throw new Error(`Linha ${params.lineNumber}: quantidade de colunas invalida para o cabecalho informado.`)
  }

  for (const value of params.values) {
    if (value.length > MAX_CELL_LENGTH) {
      throw new Error(`Linha ${params.lineNumber}: uma das colunas excede o tamanho maximo permitido.`)
    }
  }
}

function buildRowValues(params: { headers: string[]; values: string[] }) {
  return Object.fromEntries(
    params.headers.map((header, headerIndex) => [header, params.values[headerIndex]?.trim() ?? '']),
  ) as Record<string, string>
}

function toProductImportRow({ lineNumber, row }: ProductImportRowInput): ProductImportRow {
  const unitsPerPackage = parseIntegerCell(row.unitsperpackage, '1')
  const stockPackages = parseIntegerCell(row.stockpackages, '0')
  const stockLooseUnits = parseIntegerCell(row.stocklooseunits, '0')
  const totalStock = parseIntegerCell(row.stock, '-1')

  return {
    line: lineNumber,
    name: row.name ?? '',
    brand: row.brand || null,
    category: row.category ?? '',
    packagingClass: row.packagingclass || 'UN',
    measurementUnit: (row.measurementunit || 'UN').toUpperCase(),
    measurementValue: Number.parseFloat(row.measurementvalue || '1'),
    unitsPerPackage,
    description: row.description || null,
    unitCost: parseNonNegativeMoney({ value: row.unitcost ?? '', column: 'unitcost', lineNumber }),
    unitPrice: parseNonNegativeMoney({ value: row.unitprice ?? '', column: 'unitprice', lineNumber }),
    currency: (row.currency || 'BRL').toUpperCase(),
    stockPackages: normalizeOptionalStockCount(stockPackages),
    stockLooseUnits: normalizeOptionalStockCount(stockLooseUnits),
    stock: resolveTotalStock({ totalStock, stockPackages, stockLooseUnits, unitsPerPackage }),
  }
}

function parseNonNegativeMoney(params: { value: string; column: 'unitcost' | 'unitprice'; lineNumber: number }) {
  const amount = Number.parseFloat(params.value)

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`Linha ${params.lineNumber}: "${params.column}" deve ser um numero valido e positivo.`)
  }

  return amount
}

function parseIntegerCell(value: string | undefined, fallback: string) {
  return Number.parseInt(value || fallback, 10)
}

function normalizeOptionalStockCount(value: number) {
  return Number.isNaN(value) ? 0 : value
}

function resolveTotalStock(params: {
  totalStock: number
  stockPackages: number
  stockLooseUnits: number
  unitsPerPackage: number
}) {
  if (hasExplicitStock(params.totalStock)) {
    return params.totalStock
  }

  return (
    Math.max(0, normalizeOptionalStockCount(params.stockPackages)) * Math.max(1, params.unitsPerPackage) +
    Math.max(0, normalizeOptionalStockCount(params.stockLooseUnits))
  )
}

function hasExplicitStock(totalStock: number) {
  return !Number.isNaN(totalStock) && totalStock >= 0
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replaceAll(/\s+/g, '')
}

function detectDelimiter(headerLine: string) {
  return headerLine.includes(';') ? ';' : ','
}

function splitCsvLine(line: string, delimiter: string) {
  const values: string[] = []
  let current = ''
  let insideQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]

    if (character === '"') {
      if (insideQuotes && line[index + 1] === '"') {
        current += '"'
        index += 1
        continue
      }

      insideQuotes = !insideQuotes
      continue
    }

    if (character === delimiter && !insideQuotes) {
      values.push(current)
      current = ''
      continue
    }

    current += character
  }

  values.push(current)
  return values
}
