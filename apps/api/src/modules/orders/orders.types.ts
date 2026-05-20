import type { BuyerType, CurrencyCode, Order, OrderItem } from '@prisma/client'
import type { CurrencyService, ExchangeRatesSnapshot } from '../currency/currency.service'

export type OrderRecord = {
  id: string
  comandaId: string | null
  customerName: string | null
  buyerType: BuyerType | null
  buyerDocument: string | null
  buyerDistrict: string | null
  buyerCity: string | null
  buyerState: string | null
  buyerCountry: string | null
  buyerLatitude: number | null
  buyerLongitude: number | null
  employeeId: string | null
  sellerCode: string | null
  sellerName: string | null
  channel: string | null
  notes: string | null
  currency: CurrencyCode
  displayCurrency: CurrencyCode
  status: 'COMPLETED' | 'CANCELLED'
  totalRevenue: number
  totalCost: number
  totalProfit: number
  originalTotalRevenue: number
  originalTotalCost: number
  originalTotalProfit: number
  totalItems: number
  createdAt: string
  updatedAt: string
  cancelledAt: string | null
  items: Array<{
    id: string
    productId: string | null
    productName: string
    category: string
    quantity: number
    currency: CurrencyCode
    unitPrice: number
    unitCost: number
    lineRevenue: number
    lineCost: number
    lineProfit: number
    originalUnitPrice: number
    originalUnitCost: number
    originalLineRevenue: number
    originalLineCost: number
    originalLineProfit: number
  }>
}

type OrderWithItems = Order & {
  items?: OrderItem[]
}
type OrderRecordOptions = {
  displayCurrency: CurrencyCode
  currencyService: CurrencyService
  snapshot: ExchangeRatesSnapshot
}
type OriginalOrderTotals = {
  totalRevenue: number
  totalCost: number
  totalProfit: number
}

function maskDocument(doc: string | null): string | null {
  if (!doc) {
    return null
  }
  const digits = doc.replace(/\D/g, '')
  if (digits.length === 11) {
    // CPF: 161.***.**-98
    return `${digits.slice(0, 3)}.***.***-${digits.slice(-2)}`
  }
  if (digits.length === 14) {
    // CNPJ: 12.***.***/****-34
    return `${digits.slice(0, 2)}.***.***/${digits.slice(8, 12)}-${digits.slice(-2)}`
  }
  return '***'
}

export function toOrderRecord(order: OrderWithItems, options: OrderRecordOptions): OrderRecord {
  const originalTotalRevenue = toNumber(order.totalRevenue)
  const originalTotalCost = toNumber(order.totalCost)
  const originalTotalProfit = toNumber(order.totalProfit)
  const items = order.items ?? []
  const originalTotals = {
    totalRevenue: originalTotalRevenue,
    totalCost: originalTotalCost,
    totalProfit: originalTotalProfit,
  }

  return {
    id: order.id,
    comandaId: order.comandaId,
    customerName: order.customerName,
    buyerType: order.buyerType,
    buyerDocument: maskDocument(order.buyerDocument),
    buyerDistrict: order.buyerDistrict,
    buyerCity: order.buyerCity,
    buyerState: order.buyerState,
    buyerCountry: order.buyerCountry,
    buyerLatitude: null,
    buyerLongitude: null,
    employeeId: order.employeeId,
    sellerCode: order.sellerCode,
    sellerName: order.sellerName,
    channel: order.channel,
    notes: order.notes,
    currency: order.currency,
    displayCurrency: options.displayCurrency,
    status: order.status,
    ...buildOrderMoneyRecord({ currency: order.currency, originalTotals, options }),
    originalTotalRevenue,
    originalTotalCost,
    originalTotalProfit,
    totalItems: order.totalItems,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    cancelledAt: order.cancelledAt?.toISOString() ?? null,
    items: buildOrderItemRecords({ items, options }),
  }
}

function buildOrderMoneyRecord({
  currency,
  originalTotals,
  options,
}: {
  currency: CurrencyCode
  originalTotals: OriginalOrderTotals
  options: OrderRecordOptions
}): Pick<OrderRecord, 'totalRevenue' | 'totalCost' | 'totalProfit'> {
  return {
    totalRevenue: convertOrderAmount({ amount: originalTotals.totalRevenue, currency, options }),
    totalCost: convertOrderAmount({ amount: originalTotals.totalCost, currency, options }),
    totalProfit: convertOrderAmount({ amount: originalTotals.totalProfit, currency, options }),
  }
}

function buildOrderItemRecords({ items, options }: { items: OrderItem[]; options: OrderRecordOptions }) {
  return items.map((item) => {
    const originalUnitPrice = toNumber(item.unitPrice)
    const originalUnitCost = toNumber(item.unitCost)
    const originalLineRevenue = toNumber(item.lineRevenue)
    const originalLineCost = toNumber(item.lineCost)
    const originalLineProfit = toNumber(item.lineProfit)

    return {
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      category: item.category,
      quantity: item.quantity,
      currency: item.currency,
      unitPrice: convertOrderAmount({ amount: originalUnitPrice, currency: item.currency, options }),
      unitCost: convertOrderAmount({ amount: originalUnitCost, currency: item.currency, options }),
      lineRevenue: convertOrderAmount({ amount: originalLineRevenue, currency: item.currency, options }),
      lineCost: convertOrderAmount({ amount: originalLineCost, currency: item.currency, options }),
      lineProfit: convertOrderAmount({ amount: originalLineProfit, currency: item.currency, options }),
      originalUnitPrice,
      originalUnitCost,
      originalLineRevenue,
      originalLineCost,
      originalLineProfit,
    }
  })
}

function convertOrderAmount({
  amount,
  currency,
  options,
}: {
  amount: number
  currency: CurrencyCode
  options: OrderRecordOptions
}) {
  return options.currencyService.convert({
    source: { amount, currency },
    targetCurrency: options.displayCurrency,
    snapshot: options.snapshot,
  })
}

function toNumber(value: { toNumber(): number } | number) {
  return typeof value === 'number' ? value : value.toNumber()
}
