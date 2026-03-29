import { Injectable } from '@nestjs/common'
import { OrderStatus } from '@prisma/client'
import type { BuyerType } from '@prisma/client'
import { assertOwnerRole, resolveWorkspaceOwnerUserId } from '../../common/utils/workspace-access.util'
import { PrismaService } from '../../database/prisma.service'
import type { AuthContext } from '../auth/auth.types'
import { CurrencyService } from '../currency/currency.service'
import { CacheService } from '../../common/services/cache.service'
import { roundCurrency, roundPercent } from '../../common/utils/number-rounding.util'
import { toProductRecord } from '../products/products.types'
import {
  buildCategoryCollections,
  buildRecentOrders,
  buildRevenueTimeline,
  buildSalesByChannel,
  buildSalesMap,
  buildTopProducts,
  buildTopCustomers,
  buildTopEmployees,
  buildTopRegions,
  calculateGrowthPercent,
} from './finance-analytics.util'

const FINANCE_SUMMARY_TTL = 120 // segundos

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
  categoryTopProducts: Record<string, FinanceSummaryResponse['topProducts']>
}

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currencyService: CurrencyService,
    private readonly cache: CacheService,
  ) {}

  async getSummaryForUser(auth: AuthContext): Promise<FinanceSummaryResponse> {
    assertOwnerRole(auth, 'Apenas o dono pode acessar o resumo financeiro executivo.')
    const workspaceUserId = resolveWorkspaceOwnerUserId(auth)
    const cacheKey = CacheService.financeKey(workspaceUserId)
    const cached = await this.cache.get<FinanceSummaryResponse>(cacheKey)
    if (cached) return cached
    const snapshot = await this.currencyService.getSnapshot()
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const previousMonthEnd = currentMonthStart

    // Só os últimos 6 meses são necessários para timeline e breakdowns
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

    const [
      products,
      recentOrders,
      // groupBy por moeda — retorna O(3 moedas) em vez de O(todos os pedidos)
      allTimeAggregates,
      currentMonthAggregates,
      previousMonthAggregates,
      // Queries scopadas com cap de segurança
      timelineOrders,
      channelOrders,
      customerOrders,
      employeeOrders,
      geographyOrders,
    ] = await Promise.all([
      this.prisma.product.findMany({
        where: { userId: workspaceUserId, active: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.findMany({
        where: { userId: workspaceUserId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      // Totais históricos: agrega no banco, não em memória
      this.prisma.order.groupBy({
        by: ['currency'],
        where: { userId: workspaceUserId, status: OrderStatus.COMPLETED },
        _count: { _all: true },
        _sum: { totalRevenue: true, totalCost: true, totalProfit: true },
      }),
      // Mês atual por moeda
      this.prisma.order.groupBy({
        by: ['currency'],
        where: { userId: workspaceUserId, status: OrderStatus.COMPLETED, createdAt: { gte: currentMonthStart } },
        _sum: { totalRevenue: true, totalProfit: true },
      }),
      // Mês anterior por moeda
      this.prisma.order.groupBy({
        by: ['currency'],
        where: {
          userId: workspaceUserId,
          status: OrderStatus.COMPLETED,
          createdAt: { gte: previousMonthStart, lt: previousMonthEnd },
        },
        _sum: { totalRevenue: true, totalProfit: true },
      }),
      // Timeline: apenas últimos 6 meses (não histórico completo)
      this.prisma.order.findMany({
        where: { userId: workspaceUserId, status: OrderStatus.COMPLETED, createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true, currency: true, totalRevenue: true, totalProfit: true },
      }),
      // Canal: cap de 5000 pedidos mais recentes
      this.prisma.order.findMany({
        where: { userId: workspaceUserId, status: OrderStatus.COMPLETED },
        select: { channel: true, currency: true, totalRevenue: true, totalProfit: true },
        orderBy: { createdAt: 'desc' },
        take: 5_000,
      }),
      // Clientes: cap de 5000
      this.prisma.order.findMany({
        where: { userId: workspaceUserId, status: OrderStatus.COMPLETED },
        select: {
          customerName: true,
          buyerType: true,
          buyerDocument: true,
          currency: true,
          totalRevenue: true,
          totalProfit: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5_000,
      }),
      // Funcionários: cap de 2000
      this.prisma.order.findMany({
        where: { userId: workspaceUserId, status: OrderStatus.COMPLETED },
        select: {
          employeeId: true,
          sellerCode: true,
          sellerName: true,
          currency: true,
          totalRevenue: true,
          totalProfit: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 2_000,
      }),
      // Geografia: apenas pedidos geolocalizados, cap de 2000
      this.prisma.order.findMany({
        where: { userId: workspaceUserId, status: OrderStatus.COMPLETED, buyerLatitude: { not: null } },
        select: {
          buyerDistrict: true,
          buyerCity: true,
          buyerState: true,
          buyerCountry: true,
          buyerLatitude: true,
          buyerLongitude: true,
          currency: true,
          totalRevenue: true,
          totalProfit: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 2_000,
      }),
    ])

    const displayCurrency = auth.preferredCurrency
    const records = products.map((product) =>
      toProductRecord(product, {
        displayCurrency,
        currencyService: this.currencyService,
        snapshot,
      }),
    )

    // Totais computados a partir dos agregados por moeda (O(3) em vez de O(N pedidos))
    let realizedRevenue = 0,
      realizedCost = 0,
      realizedProfit = 0,
      completedOrdersCount = 0
    for (const agg of allTimeAggregates) {
      realizedRevenue += this.currencyService.convert(
        agg._sum.totalRevenue?.toNumber() ?? 0,
        agg.currency,
        displayCurrency,
        snapshot,
      )
      realizedCost += this.currencyService.convert(
        agg._sum.totalCost?.toNumber() ?? 0,
        agg.currency,
        displayCurrency,
        snapshot,
      )
      realizedProfit += this.currencyService.convert(
        agg._sum.totalProfit?.toNumber() ?? 0,
        agg.currency,
        displayCurrency,
        snapshot,
      )
      completedOrdersCount += agg._count._all
    }
    realizedRevenue = roundCurrency(realizedRevenue)
    realizedCost = roundCurrency(realizedCost)
    realizedProfit = roundCurrency(realizedProfit)

    let currentMonthRevenue = 0,
      currentMonthProfit = 0
    for (const agg of currentMonthAggregates) {
      currentMonthRevenue += this.currencyService.convert(
        agg._sum.totalRevenue?.toNumber() ?? 0,
        agg.currency,
        displayCurrency,
        snapshot,
      )
      currentMonthProfit += this.currencyService.convert(
        agg._sum.totalProfit?.toNumber() ?? 0,
        agg.currency,
        displayCurrency,
        snapshot,
      )
    }
    currentMonthRevenue = roundCurrency(currentMonthRevenue)
    currentMonthProfit = roundCurrency(currentMonthProfit)

    let previousMonthRevenue = 0,
      previousMonthProfit = 0
    for (const agg of previousMonthAggregates) {
      previousMonthRevenue += this.currencyService.convert(
        agg._sum.totalRevenue?.toNumber() ?? 0,
        agg.currency,
        displayCurrency,
        snapshot,
      )
      previousMonthProfit += this.currencyService.convert(
        agg._sum.totalProfit?.toNumber() ?? 0,
        agg.currency,
        displayCurrency,
        snapshot,
      )
    }
    previousMonthRevenue = roundCurrency(previousMonthRevenue)
    previousMonthProfit = roundCurrency(previousMonthProfit)

    const totals = {
      activeProducts: records.length,
      inventoryUnits: records.reduce((total, item) => total + item.stock, 0),
      inventoryCostValue: roundCurrency(records.reduce((total, item) => total + item.inventoryCostValue, 0)),
      inventorySalesValue: roundCurrency(records.reduce((total, item) => total + item.inventorySalesValue, 0)),
      potentialProfit: roundCurrency(records.reduce((total, item) => total + item.potentialProfit, 0)),
      realizedRevenue,
      realizedCost,
      realizedProfit,
      completedOrders: completedOrdersCount,
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

    const { categoryBreakdown, categoryTopProducts } = buildCategoryCollections(records)

    const result: FinanceSummaryResponse = {
      displayCurrency,
      ratesUpdatedAt: snapshot.updatedAt,
      ratesSource: snapshot.source,
      ratesNotice: snapshot.notice,
      totals,
      categoryBreakdown,
      categoryTopProducts,
      topProducts: buildTopProducts(records),
      recentOrders: buildRecentOrders(recentOrders, {
        currencyService: this.currencyService,
        displayCurrency,
        snapshot,
      }),
      revenueTimeline: buildRevenueTimeline(timelineOrders, now, {
        currencyService: this.currencyService,
        displayCurrency,
        snapshot,
      }),
      salesByChannel: buildSalesByChannel(channelOrders, {
        currencyService: this.currencyService,
        displayCurrency,
        snapshot,
      }),
      topCustomers: buildTopCustomers(customerOrders, {
        currencyService: this.currencyService,
        displayCurrency,
        snapshot,
      }),
      topEmployees: buildTopEmployees(employeeOrders, {
        currencyService: this.currencyService,
        displayCurrency,
        snapshot,
      }),
      salesMap: buildSalesMap(geographyOrders, {
        currencyService: this.currencyService,
        displayCurrency,
        snapshot,
      }),
      topRegions: buildTopRegions(geographyOrders, {
        currencyService: this.currencyService,
        displayCurrency,
        snapshot,
      }),
    }

    await this.cache.set(cacheKey, result, FINANCE_SUMMARY_TTL)
    return result
  }

  async invalidateSummaryCache(userId: string): Promise<void> {
    await this.cache.del(CacheService.financeKey(userId))
  }
}
