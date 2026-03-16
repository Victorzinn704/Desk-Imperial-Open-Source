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
  stock: number
}

const requiredHeaders = ['name', 'category', 'description', 'unitcost', 'unitprice', 'stock']
const MAX_IMPORT_ROWS = 500
const MAX_LINE_LENGTH = 4000
const MAX_COLUMNS = 12
const MAX_CELL_LENGTH = 280

export function parseProductImportCsv(content: string): ProductImportRow[] {
  if (content.includes('\0')) {
    throw new Error('O CSV contem bytes invalidos e nao pode ser processado.')
  }

  const normalized = content.replace(/^\uFEFF/, '').trim()
  if (!normalized) {
    return []
  }

  const lines = normalized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) {
    return []
  }

  if (lines.length - 1 > MAX_IMPORT_ROWS) {
    throw new Error(`O CSV excede o limite de ${MAX_IMPORT_ROWS} linhas por importacao.`)
  }

  const delimiter = detectDelimiter(lines[0])
  const headers = splitCsvLine(lines[0], delimiter).map((header) => normalizeHeader(header))

  if (headers.length > MAX_COLUMNS) {
    throw new Error(`O CSV suporta no maximo ${MAX_COLUMNS} colunas nesta importacao.`)
  }

  for (const requiredHeader of requiredHeaders) {
    if (!headers.includes(requiredHeader)) {
      throw new Error(`O CSV precisa conter a coluna "${requiredHeader}".`)
    }
  }

  return lines.slice(1).map((line, index) => {
    if (line.length > MAX_LINE_LENGTH) {
      throw new Error(`Linha ${index + 2}: excede o limite maximo permitido.`)
    }

    const values = splitCsvLine(line, delimiter)
    if (values.length !== headers.length) {
      throw new Error(`Linha ${index + 2}: quantidade de colunas invalida para o cabecalho informado.`)
    }

    for (const value of values) {
      if (value.length > MAX_CELL_LENGTH) {
        throw new Error(`Linha ${index + 2}: uma das colunas excede o tamanho maximo permitido.`)
      }
    }

    const row = Object.fromEntries(headers.map((header, headerIndex) => [header, values[headerIndex]?.trim() ?? '']))

    return {
      line: index + 2,
      name: row.name,
      brand: row.brand || null,
      category: row.category,
      packagingClass: row.packagingclass || 'Cadastro rapido',
      measurementUnit: (row.measurementunit || 'UN').toUpperCase(),
      measurementValue: Number.parseFloat(row.measurementvalue || '1'),
      unitsPerPackage: Number.parseInt(row.unitsperpackage || '1', 10),
      description: row.description || null,
      unitCost: Number.parseFloat(row.unitcost),
      unitPrice: Number.parseFloat(row.unitprice),
      currency: (row.currency || 'BRL').toUpperCase(),
      stock: Number.parseInt(row.stock, 10),
    }
  })
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
