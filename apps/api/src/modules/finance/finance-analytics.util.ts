import type { BuyerType, OrderStatus } from '@prisma/client'
import { roundCurrency } from '../../common/utils/number-rounding.util'
import type { CurrencyService } from '../currency/currency.service'

type CurrencyCode = 'BRL' | 'USD' | 'EUR'
type CurrencySnapshot = Awaited<ReturnType<CurrencyService['getSnapshot']>>

type FinanceAggregationOptions = {
  currencyService: CurrencyService
  displayCurrency: CurrencyCode
  snapshot: CurrencySnapshot
}

export type FinanceProductAnalyticsRecord = {
  id: string
  name: string
  category: string
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

type FinanceTopProduct = {
  id: string
  name: string
  category: string
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

export function buildRevenueTimeline(
  orders: Array<{
    createdAt: Date
    currency: CurrencyCode
    totalRevenue: { toNumber(): number } | number
    totalProfit: { toNumber(): number } | number
  }>,
  now: Date,
  options: FinanceAggregationOptions,
) {
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    month: 'short',
    year: '2-digit',
  })
  const buckets = Array.from({ length: 6 }, (_, index) => {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
    return {
      key: buildMonthKey(monthDate),
      label: formatter.format(monthDate).replace('.', ''),
      revenue: 0,
      profit: 0,
      orders: 0,
    }
  })
  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]))

  for (const order of orders) {
    const bucket = bucketMap.get(buildMonthKey(order.createdAt))
    if (!bucket) {
      continue
    }

    bucket.revenue = roundCurrency(
      bucket.revenue +
        options.currencyService.convert(
          toNumber(order.totalRevenue),
          order.currency,
          options.displayCurrency,
          options.snapshot,
        ),
    )
    bucket.profit = roundCurrency(
      bucket.profit +
        options.currencyService.convert(
          toNumber(order.totalProfit),
          order.currency,
          options.displayCurrency,
          options.snapshot,
        ),
    )
    bucket.orders += 1
  }

  return buckets.map((bucket) => ({
    label: bucket.label,
    revenue: bucket.revenue,
    profit: bucket.profit,
    orders: bucket.orders,
  }))
}

export function buildSalesByChannel(
  orders: Array<{
    channel: string | null
    currency: CurrencyCode
    _count: { _all: number }
    _sum: { totalRevenue: { toNumber(): number } | number | null; totalProfit: { toNumber(): number } | number | null }
  }>,
  options: FinanceAggregationOptions,
) {
  const channels = new Map<
    string,
    {
      channel: string
      orders: number
      revenue: number
      profit: number
    }
  >()

  for (const group of orders) {
    const channelKey = group.channel?.trim() || 'Direto'
    const current = channels.get(channelKey) ?? {
      channel: channelKey,
      orders: 0,
      revenue: 0,
      profit: 0,
    }

    current.orders += group._count._all
    current.revenue = roundCurrency(
      current.revenue +
        options.currencyService.convert(
          toNumber(group._sum.totalRevenue),
          group.currency,
          options.displayCurrency,
          options.snapshot,
        ),
    )
    current.profit = roundCurrency(
      current.profit +
        options.currencyService.convert(
          toNumber(group._sum.totalProfit),
          group.currency,
          options.displayCurrency,
          options.snapshot,
        ),
    )
    channels.set(channelKey, current)
  }

  return [...channels.values()].sort((left, right) => right.revenue - left.revenue)
}

export function buildTopCustomers(
  orders: Array<{
    customerName: string | null
    buyerType: BuyerType | null
    buyerDocument: string | null
    currency: CurrencyCode
    _count: { _all: number }
    _sum: { totalRevenue: { toNumber(): number } | number | null; totalProfit: { toNumber(): number } | number | null }
  }>,
  options: FinanceAggregationOptions,
) {
  const customers = new Map<
    string,
    {
      customerName: string
      buyerType: BuyerType | null
      buyerDocument: string | null
      orders: number
      revenue: number
      profit: number
    }
  >()

  for (const group of orders) {
    const customerName = group.customerName?.trim() || 'Cliente nao informado'
    const key = `${customerName}:${group.buyerType ?? 'unknown'}:${group.buyerDocument ?? ''}`
    const current = customers.get(key) ?? {
      customerName,
      buyerType: group.buyerType,
      buyerDocument: group.buyerDocument,
      orders: 0,
      revenue: 0,
      profit: 0,
    }

    current.orders += group._count._all
    current.revenue = roundCurrency(
      current.revenue +
        options.currencyService.convert(
          toNumber(group._sum.totalRevenue),
          group.currency,
          options.displayCurrency,
          options.snapshot,
        ),
    )
    current.profit = roundCurrency(
      current.profit +
        options.currencyService.convert(
          toNumber(group._sum.totalProfit),
          group.currency,
          options.displayCurrency,
          options.snapshot,
        ),
    )
    customers.set(key, current)
  }

  return [...customers.values()].sort((left, right) => right.revenue - left.revenue).slice(0, 5)
}

export function buildSalesMap(
  orders: Array<{
    buyerDistrict: string | null
    buyerCity: string | null
    buyerState: string | null
    buyerCountry: string | null
    buyerLatitude: number | null
    buyerLongitude: number | null
    currency: CurrencyCode
    _count: { _all: number }
    _sum: { totalRevenue: { toNumber(): number } | number | null; totalProfit: { toNumber(): number } | number | null }
  }>,
  options: FinanceAggregationOptions,
) {
  const points = new Map<
    string,
    {
      label: string
      district: string | null
      city: string | null
      state: string | null
      country: string | null
      latitude: number
      longitude: number
      orders: number
      revenue: number
      profit: number
    }
  >()

  for (const group of orders) {
    if (group.buyerLatitude == null || group.buyerLongitude == null) {
      continue
    }

    const label = buildRegionLabel(group.buyerDistrict, group.buyerCity, group.buyerState, group.buyerCountry)
    const key = `${label}:${group.buyerLatitude.toFixed(4)}:${group.buyerLongitude.toFixed(4)}`
    const current = points.get(key) ?? {
      label,
      district: group.buyerDistrict,
      city: group.buyerCity,
      state: group.buyerState,
      country: group.buyerCountry,
      latitude: group.buyerLatitude,
      longitude: group.buyerLongitude,
      orders: 0,
      revenue: 0,
      profit: 0,
    }

    current.orders += group._count._all
    current.revenue = roundCurrency(
      current.revenue +
        options.currencyService.convert(
          toNumber(group._sum.totalRevenue),
          group.currency,
          options.displayCurrency,
          options.snapshot,
        ),
    )
    current.profit = roundCurrency(
      current.profit +
        options.currencyService.convert(
          toNumber(group._sum.totalProfit),
          group.currency,
          options.displayCurrency,
          options.snapshot,
        ),
    )

    points.set(key, current)
  }

  return [...points.values()].sort((left, right) => right.revenue - left.revenue)
}

export function buildTopRegions(
  orders: Array<{
    buyerDistrict: string | null
    buyerCity: string | null
    buyerState: string | null
    buyerCountry: string | null
    currency: CurrencyCode
    _count: { _all: number }
    _sum: { totalRevenue: { toNumber(): number } | number | null; totalProfit: { toNumber(): number } | number | null }
  }>,
  options: FinanceAggregationOptions,
) {
  const regions = new Map<
    string,
    {
      label: string
      city: string | null
      state: string | null
      country: string | null
      orders: number
      revenue: number
      profit: number
    }
  >()

  for (const group of orders) {
    if (!group.buyerCity && !group.buyerState && !group.buyerCountry) {
      continue
    }

    const label = buildRegionLabel(group.buyerDistrict, group.buyerCity, group.buyerState, group.buyerCountry)
    const current = regions.get(label) ?? {
      label,
      city: group.buyerCity,
      state: group.buyerState,
      country: group.buyerCountry,
      orders: 0,
      revenue: 0,
      profit: 0,
    }

    current.orders += group._count._all
    current.revenue = roundCurrency(
      current.revenue +
        options.currencyService.convert(
          toNumber(group._sum.totalRevenue),
          group.currency,
          options.displayCurrency,
          options.snapshot,
        ),
    )
    current.profit = roundCurrency(
      current.profit +
        options.currencyService.convert(
          toNumber(group._sum.totalProfit),
          group.currency,
          options.displayCurrency,
          options.snapshot,
        ),
    )

    regions.set(label, current)
  }

  return [...regions.values()].sort((left, right) => right.revenue - left.revenue).slice(0, 6)
}

export function buildTopEmployees(
  orders: Array<{
    employeeId: string | null
    sellerCode: string | null
    sellerName: string | null
    currency: CurrencyCode
    _count: { _all: number }
    _sum: { totalRevenue: { toNumber(): number } | number | null; totalProfit: { toNumber(): number } | number | null }
  }>,
  options: FinanceAggregationOptions,
) {
  const employees = new Map<
    string,
    {
      employeeId: string | null
      employeeCode: string | null
      employeeName: string
      orders: number
      revenue: number
      profit: number
    }
  >()

  for (const group of orders) {
    if (!group.employeeId && !group.sellerCode && !group.sellerName) {
      continue
    }

    const employeeName = group.sellerName?.trim() || 'Funcionario nao identificado'
    const employeeKey = group.employeeId ?? group.sellerCode ?? employeeName
    const current = employees.get(employeeKey) ?? {
      employeeId: group.employeeId,
      employeeCode: group.sellerCode,
      employeeName,
      orders: 0,
      revenue: 0,
      profit: 0,
    }

    current.orders += group._count._all
    current.revenue = roundCurrency(
      current.revenue +
        options.currencyService.convert(
          toNumber(group._sum.totalRevenue),
          group.currency,
          options.displayCurrency,
          options.snapshot,
        ),
    )
    current.profit = roundCurrency(
      current.profit +
        options.currencyService.convert(
          toNumber(group._sum.totalProfit),
          group.currency,
          options.displayCurrency,
          options.snapshot,
        ),
    )
    employees.set(employeeKey, current)
  }

  return [...employees.values()]
    .map((employee) => ({
      ...employee,
      averageTicket: employee.orders ? roundCurrency(employee.revenue / employee.orders) : 0,
    }))
    .sort((left, right) => right.revenue - left.revenue)
    .slice(0, 6)
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

export function buildTopProducts(records: FinanceProductAnalyticsRecord[], limit = 5): FinanceTopProduct[] {
  return records
    .slice()
    .sort((left, right) => right.potentialProfit - left.potentialProfit)
    .slice(0, limit)
    .map((record) => ({
      id: record.id,
      name: record.name,
      category: record.category,
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

function buildMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function toNumber(value: { toNumber(): number } | number | null | undefined) {
  if (value == null) return 0
  return typeof value === 'number' ? value : value.toNumber()
}

function buildRegionLabel(district: string | null, city: string | null, state: string | null, country: string | null) {
  return [district, city, state, country].filter(Boolean).join(', ') || 'Regiao nao identificada'
}
