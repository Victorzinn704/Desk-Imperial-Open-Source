import { Injectable } from '@nestjs/common'
import { BuyerType, OrderStatus } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import type { AuthContext } from '../auth/auth.types'
import { CurrencyService } from '../currency/currency.service'
import { roundCurrency, roundPercent, toProductRecord } from '../products/products.types'

export type FinanceSummaryResponse = {
  displayCurrency: 'BRL' | 'USD' | 'EUR'
  ratesUpdatedAt: string | null
  ratesSource: 'live' | 'stale-cache' | 'fallback'
  ratesNotice: string | null
  totals: {
    activeProducts: number
    inventoryUnits: number
    inventoryCostValue: number
    inventorySalesValue: number
    potentialProfit: number
    realizedRevenue: number
    realizedCost: number
    realizedProfit: number
    completedOrders: number
    currentMonthRevenue: number
    currentMonthProfit: number
    previousMonthRevenue: number
    previousMonthProfit: number
    revenueGrowthPercent: number
    profitGrowthPercent: number
    averageMarginPercent: number
    averageMarkupPercent: number
    lowStockItems: number
  }
  categoryBreakdown: Array<{
    category: string
    products: number
    units: number
    inventoryCostValue: number
    inventorySalesValue: number
    potentialProfit: number
  }>
  topProducts: Array<{
    id: string
    name: string
    category: string
    stock: number
    currency: 'BRL' | 'USD' | 'EUR'
    displayCurrency: 'BRL' | 'USD' | 'EUR'
    originalInventorySalesValue: number
    originalPotentialProfit: number
    inventoryCostValue: number
    inventorySalesValue: number
    potentialProfit: number
    marginPercent: number
  }>
  recentOrders: Array<{
    id: string
    customerName: string | null
    channel: string | null
    currency: 'BRL' | 'USD' | 'EUR'
    status: 'COMPLETED' | 'CANCELLED'
    totalRevenue: number
    totalProfit: number
    originalTotalRevenue: number
    originalTotalProfit: number
    totalItems: number
    createdAt: string
  }>
  revenueTimeline: Array<{
    label: string
    revenue: number
    profit: number
    orders: number
  }>
  salesByChannel: Array<{
    channel: string
    orders: number
    revenue: number
    profit: number
  }>
  topCustomers: Array<{
    customerName: string
    buyerType: BuyerType | null
    buyerDocument: string | null
    orders: number
    revenue: number
    profit: number
  }>
  topEmployees: Array<{
    employeeId: string | null
    employeeCode: string | null
    employeeName: string
    orders: number
    revenue: number
    profit: number
    averageTicket: number
  }>
  salesMap: Array<{
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
  }>
  topRegions: Array<{
    label: string
    city: string | null
    state: string | null
    country: string | null
    orders: number
    revenue: number
    profit: number
  }>
}

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currencyService: CurrencyService,
  ) {}

  async getSummaryForUser(auth: AuthContext): Promise<FinanceSummaryResponse> {
    const snapshot = await this.currencyService.getSnapshot()
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const previousMonthEnd = currentMonthStart

    // Otimização: Remover query duplicada para recentOrders
    // Anteriormente: 2 queries idênticas para orders (uma sem limit, uma com take: 5)
    // Agora: 1 query com índice [userId, createdAt] + paginação via slice em memória
    const [products, orders] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          userId: auth.userId,
          active: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.order.findMany({
        where: {
          userId: auth.userId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ])

    // Pega os últimos 5 pedidos do array já ordenado
    const recentOrders = orders.slice(0, 5)

    const displayCurrency = auth.preferredCurrency
    const records = products.map((product) =>
      toProductRecord(product, {
        displayCurrency,
        currencyService: this.currencyService,
        snapshot,
      }),
    )

    const completedOrders = orders.filter((order) => order.status === OrderStatus.COMPLETED)
    const currentMonthOrders = completedOrders.filter((order) => order.createdAt >= currentMonthStart)
    const previousMonthOrders = completedOrders.filter(
      (order) => order.createdAt >= previousMonthStart && order.createdAt < previousMonthEnd,
    )
    const realizedRevenue = roundCurrency(
      completedOrders.reduce(
        (total, order) =>
          total +
          this.currencyService.convert(
            Number(order.totalRevenue),
            order.currency,
            displayCurrency,
            snapshot,
          ),
        0,
      ),
    )
    const realizedCost = roundCurrency(
      completedOrders.reduce(
        (total, order) =>
          total +
          this.currencyService.convert(Number(order.totalCost), order.currency, displayCurrency, snapshot),
        0,
      ),
    )
    const realizedProfit = roundCurrency(
      completedOrders.reduce(
        (total, order) =>
          total +
          this.currencyService.convert(Number(order.totalProfit), order.currency, displayCurrency, snapshot),
        0,
      ),
    )
    const currentMonthRevenue = roundCurrency(
      currentMonthOrders.reduce(
        (total, order) =>
          total +
          this.currencyService.convert(
            Number(order.totalRevenue),
            order.currency,
            displayCurrency,
            snapshot,
          ),
        0,
      ),
    )
    const currentMonthProfit = roundCurrency(
      currentMonthOrders.reduce(
        (total, order) =>
          total +
          this.currencyService.convert(Number(order.totalProfit), order.currency, displayCurrency, snapshot),
        0,
      ),
    )
    const previousMonthRevenue = roundCurrency(
      previousMonthOrders.reduce(
        (total, order) =>
          total +
          this.currencyService.convert(
            Number(order.totalRevenue),
            order.currency,
            displayCurrency,
            snapshot,
          ),
        0,
      ),
    )
    const previousMonthProfit = roundCurrency(
      previousMonthOrders.reduce(
        (total, order) =>
          total +
          this.currencyService.convert(Number(order.totalProfit), order.currency, displayCurrency, snapshot),
        0,
      ),
    )

    const totals = {
      activeProducts: records.length,
      inventoryUnits: records.reduce((total, item) => total + item.stock, 0),
      inventoryCostValue: roundCurrency(records.reduce((total, item) => total + item.inventoryCostValue, 0)),
      inventorySalesValue: roundCurrency(records.reduce((total, item) => total + item.inventorySalesValue, 0)),
      potentialProfit: roundCurrency(records.reduce((total, item) => total + item.potentialProfit, 0)),
      realizedRevenue,
      realizedCost,
      realizedProfit,
      completedOrders: completedOrders.length,
      currentMonthRevenue,
      currentMonthProfit,
      previousMonthRevenue,
      previousMonthProfit,
      revenueGrowthPercent: calculateGrowthPercent(currentMonthRevenue, previousMonthRevenue),
      profitGrowthPercent: calculateGrowthPercent(currentMonthProfit, previousMonthProfit),
      averageMarginPercent: 0,
      averageMarkupPercent: 0,
      lowStockItems: records.filter((item) => item.stock <= 10).length,
    }

    totals.averageMarginPercent =
      totals.inventorySalesValue > 0 ? roundPercent((totals.potentialProfit / totals.inventorySalesValue) * 100) : 0
    totals.averageMarkupPercent =
      totals.inventoryCostValue > 0 ? roundPercent((totals.potentialProfit / totals.inventoryCostValue) * 100) : 0

    const categoryMap = new Map<string, FinanceSummaryResponse['categoryBreakdown'][number]>()

    for (const record of records) {
      const current =
        categoryMap.get(record.category) ?? {
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
    }

    return {
      displayCurrency,
      ratesUpdatedAt: snapshot.updatedAt,
      ratesSource: snapshot.source,
      ratesNotice: snapshot.notice,
      totals,
      categoryBreakdown: [...categoryMap.values()].sort((left, right) => right.potentialProfit - left.potentialProfit),
      topProducts: records
        .slice()
        .sort((left, right) => right.potentialProfit - left.potentialProfit)
        .slice(0, 5)
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
        })),
      recentOrders: recentOrders.map((order) => ({
        id: order.id,
        customerName: order.customerName,
        channel: order.channel,
        currency: order.currency,
        status: order.status,
        totalRevenue: this.currencyService.convert(
          Number(order.totalRevenue),
          order.currency,
          displayCurrency,
          snapshot,
        ),
        totalProfit: this.currencyService.convert(
          Number(order.totalProfit),
          order.currency,
          displayCurrency,
          snapshot,
        ),
        originalTotalRevenue: Number(order.totalRevenue),
        originalTotalProfit: Number(order.totalProfit),
        totalItems: order.totalItems,
        createdAt: order.createdAt.toISOString(),
      })),
      revenueTimeline: buildRevenueTimeline(completedOrders, now, {
        currencyService: this.currencyService,
        displayCurrency,
        snapshot,
      }),
      salesByChannel: buildSalesByChannel(completedOrders, {
        currencyService: this.currencyService,
        displayCurrency,
        snapshot,
      }),
      topCustomers: buildTopCustomers(completedOrders, {
        currencyService: this.currencyService,
        displayCurrency,
        snapshot,
      }),
      topEmployees: buildTopEmployees(completedOrders, {
        currencyService: this.currencyService,
        displayCurrency,
        snapshot,
      }),
      salesMap: buildSalesMap(completedOrders, {
        currencyService: this.currencyService,
        displayCurrency,
        snapshot,
      }),
      topRegions: buildTopRegions(completedOrders, {
        currencyService: this.currencyService,
        displayCurrency,
        snapshot,
      }),
    }
  }
}

function calculateGrowthPercent(currentValue: number, previousValue: number) {
  if (previousValue === 0) {
    return currentValue > 0 ? 100 : 0
  }

  return roundPercent(((currentValue - previousValue) / previousValue) * 100)
}

function buildRevenueTimeline(
  orders: Array<{
    createdAt: Date
    currency: 'BRL' | 'USD' | 'EUR'
    totalRevenue: { toNumber(): number } | number
    totalProfit: { toNumber(): number } | number
  }>,
  now: Date,
  options: {
    currencyService: CurrencyService
    displayCurrency: 'BRL' | 'USD' | 'EUR'
    snapshot: ReturnType<CurrencyService['getSnapshot']> extends Promise<infer T> ? T : never
  },
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

function buildSalesByChannel(
  orders: Array<{
    channel: string | null
    currency: 'BRL' | 'USD' | 'EUR'
    totalRevenue: { toNumber(): number } | number
    totalProfit: { toNumber(): number } | number
  }>,
  options: {
    currencyService: CurrencyService
    displayCurrency: 'BRL' | 'USD' | 'EUR'
    snapshot: ReturnType<CurrencyService['getSnapshot']> extends Promise<infer T> ? T : never
  },
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

  for (const order of orders) {
    const channelKey = order.channel?.trim() || 'Direto'
    const current =
      channels.get(channelKey) ?? {
        channel: channelKey,
        orders: 0,
        revenue: 0,
        profit: 0,
      }

    current.orders += 1
    current.revenue = roundCurrency(
      current.revenue +
        options.currencyService.convert(
          toNumber(order.totalRevenue),
          order.currency,
          options.displayCurrency,
          options.snapshot,
        ),
    )
    current.profit = roundCurrency(
      current.profit +
        options.currencyService.convert(
          toNumber(order.totalProfit),
          order.currency,
          options.displayCurrency,
          options.snapshot,
        ),
    )
    channels.set(channelKey, current)
  }

  return [...channels.values()].sort((left, right) => right.revenue - left.revenue)
}

function buildTopCustomers(
  orders: Array<{
    customerName: string | null
    buyerType: BuyerType | null
    buyerDocument: string | null
    currency: 'BRL' | 'USD' | 'EUR'
    totalRevenue: { toNumber(): number } | number
    totalProfit: { toNumber(): number } | number
  }>,
  options: {
    currencyService: CurrencyService
    displayCurrency: 'BRL' | 'USD' | 'EUR'
    snapshot: ReturnType<CurrencyService['getSnapshot']> extends Promise<infer T> ? T : never
  },
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

  for (const order of orders) {
    const customerName = order.customerName?.trim() || 'Cliente nao informado'
    const key = `${customerName}:${order.buyerType ?? 'unknown'}:${order.buyerDocument ?? ''}`
    const current =
      customers.get(key) ?? {
        customerName,
        buyerType: order.buyerType,
        buyerDocument: order.buyerDocument,
        orders: 0,
        revenue: 0,
        profit: 0,
      }

    current.orders += 1
    current.revenue = roundCurrency(
      current.revenue +
        options.currencyService.convert(
          toNumber(order.totalRevenue),
          order.currency,
          options.displayCurrency,
          options.snapshot,
        ),
    )
    current.profit = roundCurrency(
      current.profit +
        options.currencyService.convert(
          toNumber(order.totalProfit),
          order.currency,
          options.displayCurrency,
          options.snapshot,
        ),
    )
    customers.set(key, current)
  }

  return [...customers.values()].sort((left, right) => right.revenue - left.revenue).slice(0, 5)
}

function buildSalesMap(
  orders: Array<{
    buyerDistrict: string | null
    buyerCity: string | null
    buyerState: string | null
    buyerCountry: string | null
    buyerLatitude: number | null
    buyerLongitude: number | null
    currency: 'BRL' | 'USD' | 'EUR'
    totalRevenue: { toNumber(): number } | number
    totalProfit: { toNumber(): number } | number
  }>,
  options: {
    currencyService: CurrencyService
    displayCurrency: 'BRL' | 'USD' | 'EUR'
    snapshot: ReturnType<CurrencyService['getSnapshot']> extends Promise<infer T> ? T : never
  },
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

  for (const order of orders) {
    if (order.buyerLatitude == null || order.buyerLongitude == null) {
      continue
    }

    const label = buildRegionLabel(order.buyerDistrict, order.buyerCity, order.buyerState, order.buyerCountry)
    const key = `${label}:${order.buyerLatitude.toFixed(4)}:${order.buyerLongitude.toFixed(4)}`
    const current =
      points.get(key) ?? {
        label,
        district: order.buyerDistrict,
        city: order.buyerCity,
        state: order.buyerState,
        country: order.buyerCountry,
        latitude: order.buyerLatitude,
        longitude: order.buyerLongitude,
        orders: 0,
        revenue: 0,
        profit: 0,
      }

    current.orders += 1
    current.revenue = roundCurrency(
      current.revenue +
        options.currencyService.convert(
          toNumber(order.totalRevenue),
          order.currency,
          options.displayCurrency,
          options.snapshot,
        ),
    )
    current.profit = roundCurrency(
      current.profit +
        options.currencyService.convert(
          toNumber(order.totalProfit),
          order.currency,
          options.displayCurrency,
          options.snapshot,
        ),
    )

    points.set(key, current)
  }

  return [...points.values()].sort((left, right) => right.revenue - left.revenue)
}

function buildTopRegions(
  orders: Array<{
    buyerDistrict: string | null
    buyerCity: string | null
    buyerState: string | null
    buyerCountry: string | null
    currency: 'BRL' | 'USD' | 'EUR'
    totalRevenue: { toNumber(): number } | number
    totalProfit: { toNumber(): number } | number
  }>,
  options: {
    currencyService: CurrencyService
    displayCurrency: 'BRL' | 'USD' | 'EUR'
    snapshot: ReturnType<CurrencyService['getSnapshot']> extends Promise<infer T> ? T : never
  },
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

  for (const order of orders) {
    if (!order.buyerCity && !order.buyerState && !order.buyerCountry) {
      continue
    }

    const label = buildRegionLabel(order.buyerDistrict, order.buyerCity, order.buyerState, order.buyerCountry)
    const current =
      regions.get(label) ?? {
        label,
        city: order.buyerCity,
        state: order.buyerState,
        country: order.buyerCountry,
        orders: 0,
        revenue: 0,
        profit: 0,
      }

    current.orders += 1
    current.revenue = roundCurrency(
      current.revenue +
        options.currencyService.convert(
          toNumber(order.totalRevenue),
          order.currency,
          options.displayCurrency,
          options.snapshot,
        ),
    )
    current.profit = roundCurrency(
      current.profit +
        options.currencyService.convert(
          toNumber(order.totalProfit),
          order.currency,
          options.displayCurrency,
          options.snapshot,
        ),
    )

    regions.set(label, current)
  }

  return [...regions.values()].sort((left, right) => right.revenue - left.revenue).slice(0, 6)
}

function buildTopEmployees(
  orders: Array<{
    employeeId: string | null
    sellerCode: string | null
    sellerName: string | null
    currency: 'BRL' | 'USD' | 'EUR'
    totalRevenue: { toNumber(): number } | number
    totalProfit: { toNumber(): number } | number
  }>,
  options: {
    currencyService: CurrencyService
    displayCurrency: 'BRL' | 'USD' | 'EUR'
    snapshot: ReturnType<CurrencyService['getSnapshot']> extends Promise<infer T> ? T : never
  },
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

  for (const order of orders) {
    if (!order.employeeId && !order.sellerCode && !order.sellerName) {
      continue
    }

    const employeeName = order.sellerName?.trim() || 'Funcionario nao identificado'
    const employeeKey = order.employeeId ?? order.sellerCode ?? employeeName
    const current =
      employees.get(employeeKey) ?? {
        employeeId: order.employeeId,
        employeeCode: order.sellerCode,
        employeeName,
        orders: 0,
        revenue: 0,
        profit: 0,
      }

    current.orders += 1
    current.revenue = roundCurrency(
      current.revenue +
        options.currencyService.convert(
          toNumber(order.totalRevenue),
          order.currency,
          options.displayCurrency,
          options.snapshot,
        ),
    )
    current.profit = roundCurrency(
      current.profit +
        options.currencyService.convert(
          toNumber(order.totalProfit),
          order.currency,
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

function buildMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function toNumber(value: { toNumber(): number } | number) {
  return typeof value === 'number' ? value : value.toNumber()
}

function buildRegionLabel(
  district: string | null,
  city: string | null,
  state: string | null,
  country: string | null,
) {
  return [district, city, state, country].filter(Boolean).join(', ') || 'Regiao nao identificada'
}
