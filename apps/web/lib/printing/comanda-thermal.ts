import type { PrintableComanda } from './thermal-print.types'

const ESC = '\x1B'
const GS = '\x1D'
const LINE_WIDTH = 42

export function buildThermalComandaTicket(comanda: PrintableComanda) {
  const lines = [
    `${ESC}@`,
    `${ESC}a\x01`,
    `${ESC}!\x38`,
    'DESK IMPERIAL\n',
    `${ESC}!\x00`,
    'COMANDA DE ATENDIMENTO\n',
    `${formatDateTime(comanda.openedAtIso)}\n`,
    `${ESC}a\x00`,
    drawLine(),
    formatMeta('COMANDA', comanda.id.slice(-6).toUpperCase()),
    formatMeta('MESA', comanda.tableLabel ?? '-'),
    formatMeta('CLIENTE', comanda.customerName ?? '-'),
    formatMeta('DOC', comanda.customerDocument ?? '-'),
    formatMeta('OPERADOR', comanda.operatorLabel ?? 'PDV'),
    drawLine(),
    'ITENS\n',
    ...comanda.items.flatMap((item) => formatItem(item.name, item.quantity, item.unitPrice, item.note)),
    drawLine(),
    formatMoneyLine('Subtotal', comanda.subtotalAmount, comanda.currency),
    ...(comanda.discountPercent > 0
      ? [formatMoneyLine(`Desconto ${comanda.discountPercent}%`, calcDiscount(comanda), comanda.currency)]
      : []),
    ...(comanda.additionalPercent > 0
      ? [formatMoneyLine(`Acrescimo ${comanda.additionalPercent}%`, calcAdditional(comanda), comanda.currency)]
      : []),
    drawLine(),
    `${ESC}!\x20`,
    formatMoneyLine('TOTAL', comanda.totalAmount, comanda.currency),
    `${ESC}!\x00`,
    drawLine(),
    'Leve esta comanda para conferencia.\n',
    'Impressao operacional via QZ Tray.\n',
    '\n\n',
    `${GS}V\x00`,
  ]

  return lines.join('')
}

function formatItem(name: string, quantity: number, unitPrice: number, note?: string) {
  const total = quantity * unitPrice
  const rendered: string[] = []

  for (const line of wrapText(`${quantity}x ${name}`, LINE_WIDTH - 10)) {
    rendered.push(`${line}\n`)
  }

  rendered.push(`${padLeft(formatCurrency(total), LINE_WIDTH)}\n`)

  if (note?.trim()) {
    for (const line of wrapText(`obs: ${note.trim()}`, LINE_WIDTH)) {
      rendered.push(`${line}\n`)
    }
  }

  return rendered
}

function formatMeta(label: string, value: string) {
  return `${padRight(label, 10)} ${value}\n`
}

function formatMoneyLine(label: string, amount: number, currency: string) {
  const value = formatCurrency(amount, currency)
  const safeLabel =
    label.length > LINE_WIDTH - value.length - 1 ? `${label.slice(0, LINE_WIDTH - value.length - 4)}...` : label
  return `${padRight(safeLabel, LINE_WIDTH - value.length)}${value}\n`
}

function calcDiscount(comanda: PrintableComanda) {
  if (comanda.discountPercent <= 0) {
    return 0
  }

  return -Number(((comanda.subtotalAmount * comanda.discountPercent) / 100).toFixed(2))
}

function calcAdditional(comanda: PrintableComanda) {
  if (comanda.additionalPercent <= 0) {
    return 0
  }

  const discountBase = comanda.subtotalAmount - Math.abs(calcDiscount(comanda))
  return Number(((discountBase * comanda.additionalPercent) / 100).toFixed(2))
}

function formatCurrency(amount: number, currency = 'BRL') {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    currencyDisplay: 'symbol',
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(iso))
}

function drawLine() {
  return `${'-'.repeat(LINE_WIDTH)}\n`
}

function padRight(value: string, size: number) {
  if (value.length >= size) {
    return value
  }

  return `${value}${' '.repeat(size - value.length)}`
}

function padLeft(value: string, size: number) {
  if (value.length >= size) {
    return value
  }

  return `${' '.repeat(size - value.length)}${value}`
}

function wrapText(value: string, width: number) {
  const words = value.trim().split(/\s+/)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length <= width) {
      current = next
      continue
    }

    if (current) {
      lines.push(current)
    }

    current = word
  }

  if (current) {
    lines.push(current)
  }

  return lines
}
