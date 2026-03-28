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
  items: OrderItem[]
}

function maskDocument(doc: string | null): string | null {
  if (!doc) return null
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

export function toOrderRecord(
  order: OrderWithItems,
  options: {
    displayCurrency: CurrencyCode
    currencyService: CurrencyService
    snapshot: ExchangeRatesSnapshot
  },
): OrderRecord {
  const originalTotalRevenue = toNumber(order.totalRevenue)
  const originalTotalCost = toNumber(order.totalCost)
  const originalTotalProfit = toNumber(order.totalProfit)

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
    totalRevenue: options.currencyService.convert(
      originalTotalRevenue,
      order.currency,
      options.displayCurrency,
      options.snapshot,
    ),
    totalCost: options.currencyService.convert(
      originalTotalCost,
      order.currency,
      options.displayCurrency,
      options.snapshot,
    ),
    totalProfit: options.currencyService.convert(
      originalTotalProfit,
      order.currency,
      options.displayCurrency,
      options.snapshot,
    ),
    originalTotalRevenue,
    originalTotalCost,
    originalTotalProfit,
    totalItems: order.totalItems,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    cancelledAt: order.cancelledAt?.toISOString() ?? null,
    items: order.items.map((item) => {
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
        unitPrice: options.currencyService.convert(
          originalUnitPrice,
          item.currency,
          options.displayCurrency,
          options.snapshot,
        ),
        unitCost: options.currencyService.convert(
          originalUnitCost,
          item.currency,
          options.displayCurrency,
          options.snapshot,
        ),
        lineRevenue: options.currencyService.convert(
          originalLineRevenue,
          item.currency,
          options.displayCurrency,
          options.snapshot,
        ),
        lineCost: options.currencyService.convert(
          originalLineCost,
          item.currency,
          options.displayCurrency,
          options.snapshot,
        ),
        lineProfit: options.currencyService.convert(
          originalLineProfit,
          item.currency,
          options.displayCurrency,
          options.snapshot,
        ),
        originalUnitPrice,
        originalUnitCost,
        originalLineRevenue,
        originalLineCost,
        originalLineProfit,
      }
    }),
  }
}

function toNumber(value: { toNumber(): number } | number) {
  return typeof value === 'number' ? value : value.toNumber()
}
