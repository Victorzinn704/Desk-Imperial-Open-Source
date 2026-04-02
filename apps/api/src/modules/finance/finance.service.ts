import { Injectable } from '@nestjs/common'
import { trace } from '@opentelemetry/api'
import { OrderStatus } from '@prisma/client'
import type { FinanceSummaryResponse } from '@contracts/contracts'
import { recordFinanceSummaryTelemetry } from '../../common/observability/business-telemetry.util'
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

const financeProductSelect = {
  id: true,
  name: true,
  brand: true,
  category: true,
  packagingClass: true,
  measurementUnit: true,
  measurementValue: true,
  unitsPerPackage: true,
  isCombo: true,
  comboDescription: true,
  description: true,
  unitCost: true,
  unitPrice: true,
  currency: true,
  stock: true,
  lowStockThreshold: true,
  requiresKitchen: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} as const

const financeRecentOrderSelect = {
  id: true,
  customerName: true,
  channel: true,
  currency: true,
  status: true,
  totalRevenue: true,
  totalProfit: true,
  totalItems: true,
  createdAt: true,
} as const

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currencyService: CurrencyService,
    private readonly cache: CacheService,
  ) {}

  async getSummaryForUser(auth: AuthContext): Promise<FinanceSummaryResponse> {
    assertOwnerRole(auth, 'Apenas o dono pode acessar o resumo financeiro executivo.')
    const startedAt = performance.now()
    const workspaceUserId = resolveWorkspaceOwnerUserId(auth)
    const cacheKey = CacheService.financeKey(workspaceUserId)
    const cached = await this.cache.get<FinanceSummaryResponse>(cacheKey)
    if (cached) {
      const attributes = {
        'desk.finance.cache_hit': true,
        'desk.user.role': auth.role,
      }
      recordFinanceSummaryTelemetry(
        performance.now() - startedAt,
        {
          activeProducts: cached.totals.activeProducts,
          timelinePoints: cached.revenueTimeline.length,
          salesMapRegions: cached.salesMap.length,
        },
        attributes,
      )
      trace.getActiveSpan()?.setAttributes({
        ...attributes,
        'desk.finance.active_products': cached.totals.activeProducts,
        'desk.finance.timeline_points': cached.revenueTimeline.length,
        'desk.finance.sales_map_regions': cached.salesMap.length,
      })
      return cached
    }
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
        select: financeProductSelect,
      }),
      this.prisma.order.findMany({
        where: { userId: workspaceUserId },
        select: financeRecentOrderSelect,
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
        take: 5000,
      }),
      // Canal: agrupa direto no DB em vez de processamento in-memory
      this.prisma.order.groupBy({
        by: ['channel', 'currency'],
        where: { userId: workspaceUserId, status: OrderStatus.COMPLETED },
        _count: { _all: true },
        _sum: { totalRevenue: true, totalProfit: true },
      }),
      // Clientes: Agrupamento DB reduz payload transferido de O(N) para O(U)
      this.prisma.order.groupBy({
        by: ['customerName', 'buyerType', 'buyerDocument', 'currency'],
        where: { userId: workspaceUserId, status: OrderStatus.COMPLETED },
        _count: { _all: true },
        _sum: { totalRevenue: true, totalProfit: true },
      }),
      // Funcionários: Agrupamento em BD
      this.prisma.order.groupBy({
        by: ['employeeId', 'sellerCode', 'sellerName', 'currency'],
        where: { userId: workspaceUserId, status: OrderStatus.COMPLETED },
        _count: { _all: true },
        _sum: { totalRevenue: true, totalProfit: true },
      }),
      // Geografia: Aproveitamos o novo índice de query geolocalizada e agrupamos via BD
      this.prisma.order.groupBy({
        by: ['buyerDistrict', 'buyerCity', 'buyerState', 'buyerCountry', 'buyerLatitude', 'buyerLongitude', 'currency'],
        where: { userId: workspaceUserId, status: OrderStatus.COMPLETED, buyerLatitude: { not: null } },
        _count: { _all: true },
        _sum: { totalRevenue: true, totalProfit: true },
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

    const lowStockItems = products.reduce(
      (total, product) =>
        total + (product.lowStockThreshold != null && product.stock <= product.lowStockThreshold ? 1 : 0),
      0,
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
      completedOrders: completedOrdersCount,
      currentMonthRevenue,
      currentMonthProfit,
      previousMonthRevenue,
      previousMonthProfit,
      revenueGrowthPercent: calculateGrowthPercent(currentMonthRevenue, previousMonthRevenue),
      profitGrowthPercent: calculateGrowthPercent(currentMonthProfit, previousMonthProfit),
      averageMarginPercent: 0,
      averageMarkupPercent: 0,
      lowStockItems,
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

    const attributes = {
      'desk.finance.cache_hit': false,
      'desk.user.role': auth.role,
    }
    recordFinanceSummaryTelemetry(
      performance.now() - startedAt,
      {
        activeProducts: result.totals.activeProducts,
        timelinePoints: result.revenueTimeline.length,
        salesMapRegions: result.salesMap.length,
      },
      attributes,
    )
    trace.getActiveSpan()?.setAttributes({
      ...attributes,
      'desk.finance.active_products': result.totals.activeProducts,
      'desk.finance.timeline_points': result.revenueTimeline.length,
      'desk.finance.sales_map_regions': result.salesMap.length,
    })

    return result
  }

  async invalidateSummaryCache(userId: string): Promise<void> {
    await this.cache.del(CacheService.financeKey(userId))
  }
}
