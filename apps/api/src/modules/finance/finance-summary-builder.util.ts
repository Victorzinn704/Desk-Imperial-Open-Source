import { trace } from '@opentelemetry/api'
import type { FinanceSummaryResponse } from '@contracts/contracts'
import { recordFinanceSummaryTelemetry } from '../../common/observability/business-telemetry.util'
import { CacheService } from '../../common/services/cache.service'
import { PrismaService } from '../../database/prisma.service'
import type { AuthContext } from '../auth/auth.types'
import { CurrencyService } from '../currency/currency.service'
import {
  buildCategoryCollections,
  buildRecentOrders,
  buildRevenueTimeline,
  buildSalesByChannel,
  buildSalesCategoryBreakdown,
  buildSalesMap,
  buildTopCustomers,
  buildTopEmployees,
  buildTopProducts,
  buildTopRegions,
} from './finance-analytics.util'
import type { FinanceAggregationOptions, FinanceProductAnalyticsRecord } from './finance-analytics.types'
import { FINANCE_SUMMARY_STALE_TTL_SECONDS, type FinanceSummaryCacheEntry } from './finance-summary-cache.util'
import { toFinanceProductAnalyticsRecord } from './finance-summary-product.mapper'
import { type FinanceSummarySource, loadFinanceSummarySource } from './finance-summary-source.util'
import { buildFinanceSummaryTotals } from './finance-summary-totals.util'

type FinanceSummaryBuildInput = {
  prisma: PrismaService
  currencyService: CurrencyService
  cache: CacheService
  workspaceUserId: string
  displayCurrency: FinanceSummaryResponse['displayCurrency']
  role: AuthContext['role']
  cacheKey: string
  startedAt?: number
}

export async function buildAndCacheFinanceSummary(input: FinanceSummaryBuildInput): Promise<FinanceSummaryResponse> {
  const snapshot = await input.currencyService.getSnapshot()
  const now = new Date()
  const source = await loadFinanceSummarySource(input.prisma, input.workspaceUserId, now)
  const options = {
    currencyService: input.currencyService,
    displayCurrency: input.displayCurrency,
    snapshot,
  }

  const records = source.products.map((product) => toFinanceProductAnalyticsRecord(product, options))
  const totals = buildFinanceSummaryTotals({
    records,
    products: source.products,
    allTimeAggregates: source.allTimeAggregates,
    currentMonthAggregates: source.currentMonthAggregates,
    previousMonthAggregates: source.previousMonthAggregates,
    options,
  })
  const { categoryBreakdown, categoryTopProducts } = buildCategoryCollections(records)
  const result = buildFinanceSummaryResponse({
    source,
    totals,
    categoryBreakdown,
    categoryTopProducts,
    records,
    options,
    now,
    rates: snapshot,
  })

  await cacheFinanceSummary(input.cache, input.cacheKey, result)
  recordFinanceSummaryCacheMiss(input.role, result, input.startedAt)
  return result
}

function buildFinanceSummaryResponse(input: {
  source: FinanceSummarySource
  totals: FinanceSummaryResponse['totals']
  categoryBreakdown: FinanceSummaryResponse['categoryBreakdown']
  categoryTopProducts: FinanceSummaryResponse['categoryTopProducts']
  records: FinanceProductAnalyticsRecord[]
  options: FinanceAggregationOptions
  now: Date
  rates: FinanceAggregationOptions['snapshot']
}): FinanceSummaryResponse {
  return {
    displayCurrency: input.options.displayCurrency,
    ratesUpdatedAt: input.rates.updatedAt,
    ratesSource: input.rates.source,
    ratesNotice: input.rates.notice,
    totals: input.totals,
    categoryBreakdown: input.categoryBreakdown,
    salesCategoryBreakdown: buildSalesCategoryBreakdown(input.source.categorySalesOrders, input.options),
    categoryTopProducts: input.categoryTopProducts,
    topProducts: buildTopProducts(input.records),
    recentOrders: buildRecentOrders(input.source.recentOrders, input.options),
    revenueTimeline: buildRevenueTimeline(input.source.timelineOrders, input.now, input.options),
    salesByChannel: buildSalesByChannel(input.source.channelOrders, input.options),
    topCustomers: buildTopCustomers(input.source.customerOrders, input.options),
    topEmployees: buildTopEmployees(input.source.employeeOrders, input.options),
    salesMap: buildSalesMap(input.source.geographyOrders, input.options),
    topRegions: buildTopRegions(input.source.geographyOrders, input.options),
  }
}

function cacheFinanceSummary(cache: CacheService, cacheKey: string, result: FinanceSummaryResponse) {
  const cacheEntry: FinanceSummaryCacheEntry = {
    payload: result,
    cachedAt: new Date().toISOString(),
  }

  return cache.set(cacheKey, cacheEntry, FINANCE_SUMMARY_STALE_TTL_SECONDS)
}

function recordFinanceSummaryCacheMiss(
  role: AuthContext['role'],
  result: FinanceSummaryResponse,
  startedAt: number | undefined,
) {
  const attributes = { 'desk.finance.cache_hit': false, 'desk.user.role': role }
  recordFinanceSummaryTelemetry(getDurationMs(startedAt), toTelemetryMetrics(result), attributes)
  trace.getActiveSpan()?.setAttributes({
    ...attributes,
    'desk.finance.active_products': result.totals.activeProducts,
    'desk.finance.timeline_points': result.revenueTimeline.length,
    'desk.finance.sales_map_regions': result.salesMap.length,
  })
}

function toTelemetryMetrics(result: FinanceSummaryResponse) {
  return {
    activeProducts: result.totals.activeProducts,
    timelinePoints: result.revenueTimeline.length,
    salesMapRegions: result.salesMap.length,
  }
}

function getDurationMs(startedAt: number | undefined) {
  return startedAt != null ? performance.now() - startedAt : 0
}
