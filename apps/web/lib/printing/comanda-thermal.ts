import type { PrintableComanda, PrintableComandaItem, PrintableComandaPayment } from './thermal-print.types'

const ESC = '\x1B'
const GS = '\x1D'
const LINE_WIDTH = 42
const DEFAULT_BUSINESS_NAME = 'DESK IMPERIAL'
const DOCUMENT_NOTICE = 'DOCUMENTO NAO FISCAL'

export function buildThermalComandaTicket(comanda: PrintableComanda) {
  const lines = [
    `${ESC}@`,
    ...formatReceiptHeader(comanda),
    drawLine(),
    ...formatReceiptMetadata(comanda),
    drawLine(),
    centerLine('ITENS DA COMANDA'),
    ...comanda.items.flatMap((item) => formatItem(item, comanda.currency)),
    drawLine(),
    ...formatTotalsSection(comanda),
    drawLine(),
    ...formatPaymentsSection({ currency: comanda.currency, payments: comanda.payments }),
    drawLine(),
    ...formatReceiptFooter(),
    '\n\n',
    `${GS}V\x00`,
  ]

  return lines.join('')
}

function formatReceiptHeader(comanda: PrintableComanda) {
  return [
    `${ESC}a\x01`,
    `${ESC}!\x38`,
    `${normalizeLine(comanda.businessName ?? DEFAULT_BUSINESS_NAME)}\n`,
    `${ESC}!\x00`,
    `${DOCUMENT_NOTICE}\n`,
    comanda.businessDocument ? `${normalizeLine(comanda.businessDocument)}\n` : '',
    'COMANDA DE ATENDIMENTO\n',
    `${formatDateTime(comanda.openedAtIso)}\n`,
    `${ESC}a\x00`,
  ]
}

function formatReceiptMetadata(comanda: PrintableComanda) {
  const closedAt = comanda.closedAtIso ?? resolveLatestPaymentDate(comanda.payments)
  return [
    formatMeta('RECIBO', buildReceiptCode(comanda.id)),
    formatMeta('COMANDA', comanda.id.slice(-6).toUpperCase()),
    formatMeta('MESA', comanda.tableLabel ?? '-'),
    formatMeta('CLIENTE', comanda.customerName ?? '-'),
    formatMeta('DOC', comanda.customerDocument ?? '-'),
    formatMeta('OPERADOR', comanda.operatorLabel ?? 'PDV'),
    ...(closedAt ? [formatMeta('FECHADA', formatDateTime(closedAt))] : []),
  ]
}

function formatItem(item: PrintableComandaItem, currency: string) {
  const safeName = item.name?.trim() ? item.name : '(sem nome)'
  const safeQuantity = Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 0
  const safeUnitPrice = Number.isFinite(item.unitPrice) && item.unitPrice >= 0 ? item.unitPrice : 0
  const total = safeQuantity * safeUnitPrice
  const rendered: string[] = []

  for (const line of wrapText(`${safeQuantity}x ${safeName}`, LINE_WIDTH - 10)) {
    rendered.push(`${line}\n`)
  }

  rendered.push(formatMoneyLine(`  unit ${formatCurrency(safeUnitPrice, currency)}`, total, currency))

  if (item.note?.trim()) {
    for (const line of wrapText(`obs: ${item.note.trim()}`, LINE_WIDTH)) {
      rendered.push(`${line}\n`)
    }
  }

  return rendered
}

function formatTotalsSection(comanda: PrintableComanda) {
  return [
    formatMoneyLine('Subtotal', safeAmount(comanda.subtotalAmount), comanda.currency),
    ...formatDiscountLine(comanda),
    ...formatAdditionalLine(comanda),
    drawLine(),
    `${ESC}!\x20`,
    formatMoneyLine('TOTAL', safeAmount(comanda.totalAmount), comanda.currency),
    `${ESC}!\x00`,
  ]
}

function formatPaymentsSection(input: {
  currency: PrintableComanda['currency']
  payments?: PrintableComandaPayment[]
}) {
  if (!input.payments?.length) {
    return [centerLine('PAGAMENTO'), 'STATUS: NAO INFORMADO\n']
  }

  const rendered = [centerLine('PAGAMENTOS')]
  for (const payment of input.payments) {
    rendered.push(formatMoneyLine(formatPaymentMethod(payment.method), safeAmount(payment.amount), input.currency))

    if (payment.paidAtIso) {
      rendered.push(`${formatMeta('PAGO EM', formatDateTime(payment.paidAtIso))}`)
    }

    if (payment.note?.trim()) {
      for (const line of wrapText(formatPaymentNote(payment.note), LINE_WIDTH)) {
        rendered.push(`${line}\n`)
      }
    }
  }

  return rendered
}

function formatReceiptFooter() {
  return [
    centerLine('VIA CLIENTE'),
    'Confira os itens antes de sair do caixa.\n',
    `${DOCUMENT_NOTICE}. Nao substitui NFC-e/SAT.\n`,
    'Impressao operacional via QZ Tray.\n',
  ]
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

function formatDiscountLine(comanda: PrintableComanda) {
  const percent = safePercent(comanda.discountPercent)
  return percent > 0 ? [formatMoneyLine(`Desconto ${percent}%`, calcDiscount(comanda), comanda.currency)] : []
}

function formatAdditionalLine(comanda: PrintableComanda) {
  const percent = safePercent(comanda.additionalPercent)
  return percent > 0 ? [formatMoneyLine(`Acrescimo ${percent}%`, calcAdditional(comanda), comanda.currency)] : []
}

function calcDiscount(comanda: PrintableComanda) {
  const pct = safePercent(comanda.discountPercent)
  if (pct <= 0) {
    return 0
  }
  return -Number(((safeAmount(comanda.subtotalAmount) * pct) / 100).toFixed(2))
}

function calcAdditional(comanda: PrintableComanda) {
  const pct = safePercent(comanda.additionalPercent)
  if (pct <= 0) {
    return 0
  }
  const discountBase = safeAmount(comanda.subtotalAmount) - Math.abs(calcDiscount(comanda))
  return Number(((discountBase * pct) / 100).toFixed(2))
}

function safeAmount(value: number | null | undefined) {
  return Number.isFinite(value) ? Number(value) : 0
}

function safePercent(value: number | null | undefined) {
  if (!Number.isFinite(value)) {
    return 0
  }
  const n = Number(value)
  if (n < 0) {
    return 0
  }
  if (n > 100) {
    return 100
  }
  return n
}

function formatCurrency(amount: number, currency = 'BRL') {
  const raw = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    currencyDisplay: 'symbol',
    minimumFractionDigits: 2,
  }).format(amount)
  return raw.replace(/\u00A0/g, ' ')
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(iso))
}

function formatPaymentMethod(method: string) {
  switch (method) {
    case 'PIX':
      return 'PIX'
    case 'DEBIT':
      return 'DEBITO'
    case 'CREDIT':
      return 'CREDITO'
    case 'CASH':
      return 'DINHEIRO'
    case 'VOUCHER':
      return 'VOUCHER'
    default:
      return method
  }
}

function formatPaymentNote(note: string) {
  return note.replace(/\s+/g, ' ').replace('Mercado Pago Point - ', 'MP Point ')
}

function resolveLatestPaymentDate(payments: PrintableComandaPayment[] | undefined) {
  return payments
    ?.map((payment) => payment.paidAtIso)
    .filter((paidAt): paidAt is string => Boolean(paidAt))
    .at(-1)
}

function buildReceiptCode(id: string) {
  const suffix = id.slice(-8).toUpperCase()
  return suffix ? `#${suffix}` : '#------'
}

function drawLine() {
  return `${'-'.repeat(LINE_WIDTH)}\n`
}

function centerLine(value: string) {
  const safeValue = normalizeLine(value)
  const left = Math.max(0, Math.floor((LINE_WIDTH - safeValue.length) / 2))
  return `${' '.repeat(left)}${safeValue}\n`
}

function normalizeLine(value: string) {
  return value.replace(/\s+/g, ' ').trim().slice(0, LINE_WIDTH)
}

function padRight(value: string, size: number) {
  if (value.length >= size) {
    return value
  }

  return `${value}${' '.repeat(size - value.length)}`
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
