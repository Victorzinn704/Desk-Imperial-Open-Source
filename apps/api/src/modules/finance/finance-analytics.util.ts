import type { OrderStatus } from '@prisma/client'
import { roundCurrency } from '../../common/utils/number-rounding.util'
import type { CurrencyService } from '../currency/currency.service'

// Re-export from split modules
export { buildRevenueTimeline } from './finance-revenue-timeline.util'
export { buildSalesByChannel } from './finance-channels.util'
export { buildTopCustomers, buildTopEmployees, buildTopRegions, buildSalesMap } from './finance-top-analytics.util'

type CurrencyCode = 'BRL' | 'USD' | 'EUR'
type CurrencySnapshot = Awaited<ReturnType<CurrencyService['getSnapshot']>>

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

type FinanceTopProduct = {
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

export function calculateGrowthPercent(currentValue: number, previousValue: number) {
  if (previousValue === 0) {
    return currentValue > 0 ? 100 : 0
  }

  return ((currentValue - previousValue) / previousValue) * 100
}

export function buildCategoryCollections(records: FinanceProductAnalyticsRecord[]) {
  const categoryMap = new Map<
    string,
    {
      category: string
      products: number
      units: number
      inventoryCostValue: number
      inventorySalesValue: number
      potentialProfit: number
    }
  >()
  const categoryProductsMap = new Map<string, FinanceProductAnalyticsRecord[]>()

  for (const record of records) {
    const current = categoryMap.get(record.category) ?? {
      category: record.category,
      products: 0,
      units: 0,
      inventoryCostValue: 0,
      inventorySalesValue: 0,
      potentialProfit: 0,
    }

    current.products += 1
    current.units += record.stock
    current.inventoryCostValue = roundCurrency(current.inventoryCostValue + record.inventoryCostValue)
    current.inventorySalesValue = roundCurrency(current.inventorySalesValue + record.inventorySalesValue)
    current.potentialProfit = roundCurrency(current.potentialProfit + record.potentialProfit)

    categoryMap.set(record.category, current)

    const products = categoryProductsMap.get(record.category) ?? []
    products.push(record)
    categoryProductsMap.set(record.category, products)
  }

  const categoryTopProducts: Record<string, FinanceTopProduct[]> = {}
  for (const [category, products] of categoryProductsMap.entries()) {
    categoryTopProducts[category] = buildTopProducts(products, 5)
  }

  return {
    categoryBreakdown: [...categoryMap.values()].sort((left, right) => right.potentialProfit - left.potentialProfit),
    categoryTopProducts,
  }
}

export function buildSalesCategoryBreakdown(
  rows: FinanceSalesCategoryAggregationRecord[],
  options: FinanceAggregationOptions,
) {
  const categoryMap = new Map<
    string,
    {
      category: string
      products: number
      units: number
      inventoryCostValue: number
      inventorySalesValue: number
      potentialProfit: number
    }
  >()

  for (const row of rows) {
    const current = categoryMap.get(row.category) ?? {
      category: row.category,
      products: 0,
      units: 0,
      inventoryCostValue: 0,
      inventorySalesValue: 0,
      potentialProfit: 0,
    }

    current.products += row._count._all
    current.units += row._sum.quantity ?? 0
    current.inventoryCostValue = roundCurrency(
      current.inventoryCostValue +
        options.currencyService.convert(toNumber(row._sum.lineCost), row.currency, options.displayCurrency, options.snapshot),
    )
    current.inventorySalesValue = roundCurrency(
      current.inventorySalesValue +
        options.currencyService.convert(
          toNumber(row._sum.lineRevenue),
          row.currency,
          options.displayCurrency,
          options.snapshot,
        ),
    )
    current.potentialProfit = roundCurrency(
      current.potentialProfit +
        options.currencyService.convert(
          toNumber(row._sum.lineProfit),
          row.currency,
          options.displayCurrency,
          options.snapshot,
        ),
    )

    categoryMap.set(row.category, current)
  }

  return [...categoryMap.values()].sort((left, right) => right.inventorySalesValue - left.inventorySalesValue)
}

export function buildTopProducts(records: FinanceProductAnalyticsRecord[], limit = 5): FinanceTopProduct[] {
  return records
    .slice()
    .sort((left, right) => right.potentialProfit - left.potentialProfit)
    .slice(0, limit)
    .map((record) => ({
      id: record.id,
      name: record.name,
      brand: record.brand,
      category: record.category,
      barcode: record.barcode,
      packagingClass: record.packagingClass,
      quantityLabel: record.quantityLabel,
      imageUrl: record.imageUrl,
      catalogSource: record.catalogSource,
      isCombo: record.isCombo,
      stock: record.stock,
      currency: record.currency,
      displayCurrency: record.displayCurrency,
      originalInventorySalesValue: record.originalInventorySalesValue,
      originalPotentialProfit: record.originalPotentialProfit,
      inventoryCostValue: record.inventoryCostValue,
      inventorySalesValue: record.inventorySalesValue,
      potentialProfit: record.potentialProfit,
      marginPercent: record.marginPercent,
    }))
}

export function buildRecentOrders(
  orders: Array<{
    id: string
    customerName: string | null
    channel: string | null
    currency: CurrencyCode
    status: Extract<OrderStatus, 'COMPLETED' | 'CANCELLED'>
    totalRevenue: { toNumber(): number } | number
    totalProfit: { toNumber(): number } | number
    totalItems: number
    createdAt: Date
  }>,
  options: FinanceAggregationOptions,
) {
  return orders.map((order) => ({
    id: order.id,
    customerName: order.customerName,
    channel: order.channel,
    currency: order.currency,
    status: order.status,
    totalRevenue: options.currencyService.convert(
      toNumber(order.totalRevenue),
      order.currency,
      options.displayCurrency,
      options.snapshot,
    ),
    totalProfit: options.currencyService.convert(
      toNumber(order.totalProfit),
      order.currency,
      options.displayCurrency,
      options.snapshot,
    ),
    originalTotalRevenue: toNumber(order.totalRevenue),
    originalTotalProfit: toNumber(order.totalProfit),
    totalItems: order.totalItems,
    createdAt: order.createdAt.toISOString(),
  }))
}

function toNumber(value: { toNumber(): number } | number | null | undefined) {
  if (value == null) {
    return 0
  }
  return typeof value === 'number' ? value : value.toNumber()
}
