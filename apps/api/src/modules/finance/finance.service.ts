import { Injectable, Logger } from '@nestjs/common'
import { trace } from '@opentelemetry/api'
import type { FinanceSummaryResponse } from '@contracts/contracts'
import { recordFinanceSummaryTelemetry } from '../../common/observability/business-telemetry.util'
import { CacheService } from '../../common/services/cache.service'
import { assertOwnerRole, resolveWorkspaceOwnerUserId } from '../../common/utils/workspace-access.util'
import { PrismaService } from '../../database/prisma.service'
import type { AuthContext } from '../auth/auth.types'
import { CurrencyService } from '../currency/currency.service'
import { PillarsService } from './pillars.service'
import { buildAndCacheFinanceSummary } from './finance-summary-builder.util'
import {
  FINANCE_SUMMARY_FRESH_TTL_SECONDS,
  type FinanceSummaryCacheEntry,
  getFinanceSummaryCacheAgeMs,
  shouldRefreshFinanceSummaryCache,
  unwrapFinanceSummaryCache,
} from './finance-summary-cache.util'

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
      recordFinanceSummaryCacheHit({ auth, cached, cachedEntry, startedAt })
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

  private buildAndCacheSummary(params: {
    workspaceUserId: string
    displayCurrency: FinanceSummaryResponse['displayCurrency']
    role: AuthContext['role']
    cacheKey: string
    startedAt?: number
  }) {
    return buildAndCacheFinanceSummary({
      ...params,
      prisma: this.prisma,
      currencyService: this.currencyService,
      cache: this.cache,
    })
  }
}

function recordFinanceSummaryCacheHit(input: {
  auth: AuthContext
  cached: FinanceSummaryResponse
  cachedEntry: FinanceSummaryCacheEntry | FinanceSummaryResponse | null
  startedAt: number
}) {
  const cacheAgeMs = getFinanceSummaryCacheAgeMs(input.cachedEntry)
  const attributes = {
    'desk.finance.cache_hit': true,
    'desk.finance.cache_state': resolveFinanceCacheState(cacheAgeMs),
    'desk.user.role': input.auth.role,
    ...(cacheAgeMs != null ? { 'desk.finance.cache_age_ms': cacheAgeMs } : {}),
  }

  recordFinanceSummaryTelemetry(performance.now() - input.startedAt, toTelemetryMetrics(input.cached), attributes)
  trace.getActiveSpan()?.setAttributes({
    ...attributes,
    'desk.finance.active_products': input.cached.totals.activeProducts,
    'desk.finance.timeline_points': input.cached.revenueTimeline.length,
    'desk.finance.sales_map_regions': input.cached.salesMap.length,
  })
}

function resolveFinanceCacheState(cacheAgeMs: number | null) {
  return cacheAgeMs != null && cacheAgeMs > FINANCE_SUMMARY_FRESH_TTL_SECONDS * 1000 ? 'stale' : 'fresh'
}

function toTelemetryMetrics(summary: FinanceSummaryResponse) {
  return {
    activeProducts: summary.totals.activeProducts,
    timelinePoints: summary.revenueTimeline.length,
    salesMapRegions: summary.salesMap.length,
  }
}
