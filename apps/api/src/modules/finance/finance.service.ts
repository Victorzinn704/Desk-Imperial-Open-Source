import { Injectable, Logger } from '@nestjs/common'
import { trace } from '@opentelemetry/api'
import { OrderStatus } from '@prisma/client'
import type { FinanceSummaryResponse } from '@contracts/contracts'
import { recordFinanceSummaryTelemetry } from '../../common/observability/business-telemetry.util'
import { assertOwnerRole, resolveWorkspaceOwnerUserId } from '../../common/utils/workspace-access.util'
import { PrismaService } from '../../database/prisma.service'
import type { AuthContext } from '../auth/auth.types'
import { CurrencyService } from '../currency/currency.service'
import { CacheService } from '../../common/services/cache.service'
import { PillarsService } from './pillars.service'
import { roundCurrency, roundPercent } from '../../common/utils/number-rounding.util'
import { resolveProductCatalogMetadata } from '../products/products-catalog.util'
import {
  buildCategoryCollections,
  buildRecentOrders,
  buildRevenueTimeline,
  buildSalesCategoryBreakdown,
  buildSalesByChannel,
  buildSalesMap,
  buildTopCustomers,
  buildTopEmployees,
  buildTopProducts,
  buildTopRegions,
  calculateGrowthPercent,
} from './finance-analytics.util'
import type { FinanceProductAnalyticsRecord } from './finance-analytics.types'

const FINANCE_SUMMARY_FRESH_TTL_SECONDS = 120
const FINANCE_SUMMARY_STALE_TTL_SECONDS = 300
const FINANCE_SUMMARY_REFRESH_AHEAD_MS = 90_000

const financeProductSelect = {
  id: true,
  name: true,
  brand: true,
  category: true,
  barcode: true,
  packagingClass: true,
  measurementUnit: true,
  measurementValue: true,
  quantityLabel: true,
  imageUrl: true,
  catalogSource: true,
  isCombo: true,
  unitCost: true,
  unitPrice: true,
  currency: true,
  stock: true,
  lowStockThreshold: true,
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
  private readonly logger = new Logger(FinanceService.name)
  private readonly warmInFlight = new Map<string, Promise<void>>()

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
    const cachedEntry = await this.cache.get<FinanceSummaryCacheEntry | FinanceSummaryResponse>(cacheKey)
    const cached = unwrapFinanceSummaryCache(cachedEntry)
    if (cached) {
      const cacheAgeMs = getFinanceSummaryCacheAgeMs(cachedEntry)
      const attributes = {
        'desk.finance.cache_hit': true,
        'desk.finance.cache_state':
          cacheAgeMs != null && cacheAgeMs > FINANCE_SUMMARY_FRESH_TTL_SECONDS * 1000 ? 'stale' : 'fresh',
        'desk.user.role': auth.role,
        ...(cacheAgeMs != null ? { 'desk.finance.cache_age_ms': cacheAgeMs } : {}),
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
      if (shouldRefreshFinanceSummaryCache(cachedEntry)) {
        this.scheduleWarmSummary(workspaceUserId, auth.preferredCurrency)
      }
      return cached
    }
    return this.buildAndCacheSummary({
      workspaceUserId,
      displayCurrency: auth.preferredCurrency,
      role: auth.role,
      startedAt,
      cacheKey,
    })
  }

  async invalidateSummaryCache(userId: string): Promise<void> {
    await Promise.all([
      this.cache.del(CacheService.financeKey(userId)),
      this.cache.del(PillarsService.pillarsKey(userId)),
    ])
  }

  async invalidateAndWarmSummary(workspaceUserId: string): Promise<void> {
    await this.invalidateSummaryCache(workspaceUserId)
    await this.warmSummaryForWorkspace(workspaceUserId)
  }

  async warmSummaryForWorkspace(workspaceUserId: string): Promise<void> {
    const owner = await this.prisma.user.findUnique({
      where: { id: workspaceUserId },
      select: { preferredCurrency: true },
    })

    if (!owner) {
      this.logger.warn(`Nao foi possivel aquecer finance/summary: workspace ${workspaceUserId} nao encontrado.`)
      return
    }

    this.scheduleWarmSummary(workspaceUserId, owner.preferredCurrency)
  }

  scheduleWarmSummary(workspaceUserId: string, displayCurrency: FinanceSummaryResponse['displayCurrency']) {
    const cacheKey = `${workspaceUserId}:${displayCurrency}`
    if (this.warmInFlight.has(cacheKey)) {
      return
    }

    const refreshPromise = this.buildAndCacheSummary({
      workspaceUserId,
      displayCurrency,
      role: 'OWNER',
      cacheKey: CacheService.financeKey(workspaceUserId),
    })
      .then(() => undefined)
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'erro desconhecido'
        this.logger.warn(`Falha ao aquecer finance/summary para ${workspaceUserId}: ${message}`)
      })
      .finally(() => {
        this.warmInFlight.delete(cacheKey)
      })

    this.warmInFlight.set(cacheKey, refreshPromise)
  }

  private async buildAndCacheSummary(params: {
    workspaceUserId: string
    displayCurrency: FinanceSummaryResponse['displayCurrency']
    role: AuthContext['role']
    cacheKey: string
    startedAt?: number
  }): Promise<FinanceSummaryResponse> {
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
      categorySalesOrders,
    ] = await Promise.all([
      this.prisma.product.findMany({
        where: { userId: params.workspaceUserId, active: true },
        select: financeProductSelect,
      }),
      this.prisma.order.findMany({
        where: { userId: params.workspaceUserId },
        select: financeRecentOrderSelect,
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      // Totais históricos: agrega no banco, não em memória
      this.prisma.order.groupBy({
        by: ['currency'],
        where: { userId: params.workspaceUserId, status: OrderStatus.COMPLETED },
        _count: { _all: true },
        _sum: { totalRevenue: true, totalCost: true, totalProfit: true },
      }),
      // Mês atual por moeda
      this.prisma.order.groupBy({
        by: ['currency'],
        where: { userId: params.workspaceUserId, status: OrderStatus.COMPLETED, createdAt: { gte: currentMonthStart } },
        _sum: { totalRevenue: true, totalProfit: true },
      }),
      // Mês anterior por moeda
      this.prisma.order.groupBy({
        by: ['currency'],
        where: {
          userId: params.workspaceUserId,
          status: OrderStatus.COMPLETED,
          createdAt: { gte: previousMonthStart, lt: previousMonthEnd },
        },
        _sum: { totalRevenue: true, totalProfit: true },
      }),
      // Timeline: apenas últimos 6 meses (não histórico completo)
      this.prisma.order.findMany({
        where: { userId: params.workspaceUserId, status: OrderStatus.COMPLETED, createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true, currency: true, totalRevenue: true, totalProfit: true },
        take: 5000,
      }),
      // Canal: agrupa direto no DB em vez de processamento in-memory
      this.prisma.order.groupBy({
        by: ['channel', 'currency'],
        where: { userId: params.workspaceUserId, status: OrderStatus.COMPLETED },
        _count: { _all: true },
        _sum: { totalRevenue: true, totalProfit: true },
      }),
      // Clientes: Agrupamento DB reduz payload transferido de O(N) para O(U)
      this.prisma.order.groupBy({
        by: ['customerName', 'buyerType', 'buyerDocument', 'currency'],
        where: { userId: params.workspaceUserId, status: OrderStatus.COMPLETED },
        _count: { _all: true },
        _sum: { totalRevenue: true, totalProfit: true },
      }),
      // Funcionários: Agrupamento em BD
      this.prisma.order.groupBy({
        by: ['employeeId', 'sellerCode', 'sellerName', 'currency'],
        where: { userId: params.workspaceUserId, status: OrderStatus.COMPLETED },
        _count: { _all: true },
        _sum: { totalRevenue: true, totalProfit: true },
      }),
      // Geografia: Aproveitamos o novo índice de query geolocalizada e agrupamos via BD
      this.prisma.order.groupBy({
        by: ['buyerDistrict', 'buyerCity', 'buyerState', 'buyerCountry', 'buyerLatitude', 'buyerLongitude', 'currency'],
        where: { userId: params.workspaceUserId, status: OrderStatus.COMPLETED, buyerLatitude: { not: null } },
        _count: { _all: true },
        _sum: { totalRevenue: true, totalProfit: true },
      }),
      this.prisma.orderItem.groupBy({
        by: ['category', 'currency'],
        where: {
          order: {
            userId: params.workspaceUserId,
            status: OrderStatus.COMPLETED,
          },
        },
        _count: { _all: true },
        _sum: {
          quantity: true,
          lineRevenue: true,
          lineCost: true,
          lineProfit: true,
        },
      }),
    ])

    const displayCurrency = params.displayCurrency
    const records = products.map((product) =>
      toFinanceProductAnalyticsRecord(product, {
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
    const salesCategoryBreakdown = buildSalesCategoryBreakdown(categorySalesOrders, {
      currencyService: this.currencyService,
      displayCurrency,
      snapshot,
    })

    const result: FinanceSummaryResponse = {
      displayCurrency,
      ratesUpdatedAt: snapshot.updatedAt,
      ratesSource: snapshot.source,
      ratesNotice: snapshot.notice,
      totals,
      categoryBreakdown,
      salesCategoryBreakdown,
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

    const cacheEntry: FinanceSummaryCacheEntry = {
      payload: result,
      cachedAt: new Date().toISOString(),
    }

    await this.cache.set(params.cacheKey, cacheEntry, FINANCE_SUMMARY_STALE_TTL_SECONDS)

    const attributes = {
      'desk.finance.cache_hit': false,
      'desk.user.role': params.role,
    }
    recordFinanceSummaryTelemetry(
      params.startedAt != null ? performance.now() - params.startedAt : 0,
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
}

type FinanceSummaryCacheEntry = {
  payload: FinanceSummaryResponse
  cachedAt: string
}

function unwrapFinanceSummaryCache(
  entry: FinanceSummaryCacheEntry | FinanceSummaryResponse | null,
): FinanceSummaryResponse | null {
  if (!entry) {
    return null
  }

  if (isFinanceSummaryCacheEntry(entry)) {
    return entry.payload
  }

  return entry
}

function shouldRefreshFinanceSummaryCache(entry: FinanceSummaryCacheEntry | FinanceSummaryResponse | null) {
  const ageMs = getFinanceSummaryCacheAgeMs(entry)
  if (ageMs == null) {
    return false
  }

  return ageMs >= FINANCE_SUMMARY_REFRESH_AHEAD_MS
}

function isFinanceSummaryCacheEntry(
  entry: FinanceSummaryCacheEntry | FinanceSummaryResponse,
): entry is FinanceSummaryCacheEntry {
  return typeof entry === 'object' && entry !== null && 'payload' in entry && 'cachedAt' in entry
}

function getFinanceSummaryCacheAgeMs(entry: FinanceSummaryCacheEntry | FinanceSummaryResponse | null) {
  if (!entry || !isFinanceSummaryCacheEntry(entry)) {
    return null
  }

  const ageMs = Date.now() - Date.parse(entry.cachedAt)
  return Number.isFinite(ageMs) ? ageMs : null
}

function toFinanceProductAnalyticsRecord(
  product: {
    id: string
    name: string
    brand: string | null
    category: string
    barcode: string | null
    packagingClass: string
    measurementUnit: string
    measurementValue: { toNumber(): number } | number
    quantityLabel: string | null
    imageUrl: string | null
    catalogSource: string | null
    isCombo: boolean
    unitCost: { toNumber(): number } | number
    unitPrice: { toNumber(): number } | number
    currency: FinanceProductAnalyticsRecord['currency']
    stock: number
  },
  options: {
    displayCurrency: FinanceProductAnalyticsRecord['displayCurrency']
    currencyService: CurrencyService
    snapshot: Awaited<ReturnType<CurrencyService['getSnapshot']>>
  },
): FinanceProductAnalyticsRecord {
  const catalogMetadata = resolveProductCatalogMetadata({
    name: product.name,
    brand: product.brand,
    measurementUnit: product.measurementUnit,
    measurementValue: product.measurementValue,
    quantityLabel: product.quantityLabel,
    imageUrl: product.imageUrl,
    catalogSource: product.catalogSource,
  })
  const originalUnitCost = toNumber(product.unitCost)
  const originalUnitPrice = toNumber(product.unitPrice)
  const originalInventoryCostValue = roundCurrency(originalUnitCost * product.stock)
  const originalInventorySalesValue = roundCurrency(originalUnitPrice * product.stock)
  const inventoryCostValue = options.currencyService.convert(
    originalInventoryCostValue,
    product.currency,
    options.displayCurrency,
    options.snapshot,
  )
  const inventorySalesValue = options.currencyService.convert(
    originalInventorySalesValue,
    product.currency,
    options.displayCurrency,
    options.snapshot,
  )
  const potentialProfit = roundCurrency(inventorySalesValue - inventoryCostValue)

  return {
    id: product.id,
    name: product.name,
    brand: catalogMetadata.brand,
    category: product.category,
    barcode: product.barcode,
    packagingClass: product.packagingClass,
    quantityLabel: catalogMetadata.quantityLabel,
    imageUrl: catalogMetadata.imageUrl,
    catalogSource: catalogMetadata.catalogSource,
    isCombo: product.isCombo,
    stock: product.stock,
    currency: product.currency,
    displayCurrency: options.displayCurrency,
    originalInventorySalesValue,
    originalPotentialProfit: roundCurrency(originalInventorySalesValue - originalInventoryCostValue),
    inventoryCostValue,
    inventorySalesValue,
    potentialProfit,
    marginPercent: inventorySalesValue > 0 ? roundPercent((potentialProfit / inventorySalesValue) * 100) : 0,
  }
}

function toNumber(value: { toNumber(): number } | number) {
  return typeof value === 'number' ? value : value.toNumber()
}
