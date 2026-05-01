import type { OrderStatus } from '@prisma/client'
import type { CurrencyService } from '../currency/currency.service'

export type CurrencyCode = 'BRL' | 'USD' | 'EUR'

export type CurrencySnapshot = Awaited<ReturnType<CurrencyService['getSnapshot']>>

export type FinanceAggregationOptions = {
  currencyService: CurrencyService
  displayCurrency: CurrencyCode
  snapshot: CurrencySnapshot
}

export type FinanceProductAnalyticsRecord = {
  id: string
  name: string
  brand: string | null
  category: string
  barcode: string | null
  packagingClass: string
  quantityLabel: string | null
  imageUrl: string | null
  catalogSource: string
  isCombo: boolean
  stock: number
  currency: CurrencyCode
  displayCurrency: CurrencyCode
  originalInventorySalesValue: number
  originalPotentialProfit: number
  inventoryCostValue: number
  inventorySalesValue: number
  potentialProfit: number
  marginPercent: number
}

export type FinanceSalesCategoryAggregationRecord = {
  category: string
  currency: CurrencyCode
  _count: {
    _all: number
  }
  _sum: {
    quantity: number | null
    lineRevenue: { toNumber(): number } | number | null
    lineCost: { toNumber(): number } | number | null
    lineProfit: { toNumber(): number } | number | null
  }
}

export type FinanceRecentOrder = {
  id: string
  customerName: string | null
  channel: string | null
  currency: CurrencyCode
  status: Extract<OrderStatus, 'COMPLETED' | 'CANCELLED'>
  totalRevenue: { toNumber(): number } | number
  totalProfit: { toNumber(): number } | number
  totalItems: number
  createdAt: Date
}
