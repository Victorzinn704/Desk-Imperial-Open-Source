import {
  BadGatewayException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { RequestContext } from '../../common/utils/request-context.util'
import { CacheService } from '../../common/services/cache.service'
import { resolveAuthActorUserId } from '../auth/auth-shared.util'
import { FinanceService } from '../finance/finance.service'
import { AuditLogService } from '../monitoring/audit-log.service'
import type { AuthContext } from '../auth/auth.types'
import {
  buildGeminiInsightRequestBody,
  extractGeminiResponseText,
  type GeminiGenerateContentResponse,
} from './market-intelligence-gemini.util'
import { buildMarketInsightPrompt } from './market-intelligence.prompt'
import { normalizeInsightPayload } from './market-intelligence.payload'
import { resolveMarketInsightFocus } from './market-intelligence.scope'
import type { MarketInsightFocus, MarketInsightResponse, RateLimitEntry } from './market-intelligence.types'

export type { MarketInsightResponse } from './market-intelligence.types'

@Injectable()
export class MarketIntelligenceService {
  private readonly logger = new Logger(MarketIntelligenceService.name)

  constructor(
    private readonly configService: ConfigService,
    private readonly financeService: FinanceService,
    private readonly auditLogService: AuditLogService,
    private readonly cache: CacheService,
  ) {}

  async getInsightForUser(
    auth: AuthContext,
    focus: string | undefined,
    context: RequestContext,
  ): Promise<MarketInsightResponse> {
    const insightFocus = resolveMarketInsightFocus(focus)
    const cacheKey = CacheService.geminiKey(auth.userId, auth.preferredCurrency, insightFocus.value)
    const cached = await this.getCachedInsight({ auth, context, focus: insightFocus, cacheKey })

    if (cached) {
      return cached
    }

    const apiKey = this.requireApiKey()
    const rateLimitState = await this.consumeRateLimit({ auth, context })
    const result = await this.generateInsight({ auth, focus: insightFocus, apiKey })

    await this.cache.set(cacheKey, result, this.getCacheTtlSeconds())
    await this.recordGeneratedInsight({ auth, context, focus: insightFocus, result, rateLimitState })

    return result
  }

  private async getCachedInsight(params: {
    auth: AuthContext
    context: RequestContext
    focus: MarketInsightFocus
    cacheKey: string
  }) {
    const cached = await this.cache.get<MarketInsightResponse>(params.cacheKey)
    if (!cached) {
      return null
    }

    await this.auditLogService.record({
      actorUserId: resolveAuthActorUserId(params.auth),
      event: 'market-intelligence.cached',
      resource: 'market_intelligence',
      metadata: { focus: params.focus.value, model: cached.model },
      ipAddress: params.context.ipAddress,
      userAgent: params.context.userAgent,
    })

    return { ...cached, cached: true }
  }

  private requireApiKey() {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY')
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'A inteligencia de mercado ainda nao foi configurada. Adicione GEMINI_API_KEY para ativar o Gemini Flash.',
      )
    }

    return apiKey
  }

  private async consumeRateLimit(params: { auth: AuthContext; context: RequestContext }) {
    const rateLimitKey = CacheService.ratelimitKey(
      'gemini',
      this.buildRateLimitKey({ userId: params.auth.userId, ipAddress: params.context.ipAddress }),
    )

    await this.assertRequestAllowed(rateLimitKey)
    return this.recordRequest(rateLimitKey)
  }

  private async generateInsight(params: { auth: AuthContext; focus: MarketInsightFocus; apiKey: string }) {
    const finance = await this.financeService.getSummaryForUser(params.auth)
    const model = this.getModel()
    const rawText = await this.requestProvider({
      apiKey: params.apiKey,
      auth: params.auth,
      finance,
      focus: params.focus,
      model,
    })
    const insight = normalizeInsightPayload(rawText)

    return {
      generatedAt: new Date().toISOString(),
      model,
      focus: params.focus.value,
      cached: false,
      summary: insight.summary,
      forecast: insight.forecast,
      opportunities: insight.opportunities,
      risks: insight.risks,
      nextActions: insight.nextActions,
    }
  }

  private async requestProvider(params: {
    apiKey: string
    auth: AuthContext
    finance: Awaited<ReturnType<FinanceService['getSummaryForUser']>>
    focus: MarketInsightFocus
    model: string
  }) {
    const response = await this.fetchProviderResponse(params)

    if (!response.ok) {
      const errorText = await response.text()
      this.logger.warn(`Gemini respondeu com erro ${response.status}: ${errorText}`)
      throw new BadGatewayException(
        'Nao foi possivel concluir a leitura da IA neste momento. Tente novamente em instantes.',
      )
    }

    const payload = (await response.json()) as GeminiGenerateContentResponse
    const rawText = extractGeminiResponseText(payload)
    if (!rawText) {
      throw new BadGatewayException('A IA nao retornou uma leitura valida para esta consulta.')
    }

    return rawText
  }

  private async fetchProviderResponse(params: {
    apiKey: string
    auth: AuthContext
    finance: Awaited<ReturnType<FinanceService['getSummaryForUser']>>
    focus: MarketInsightFocus
    model: string
  }) {
    try {
      return await fetch(this.buildModelUrl({ model: params.model, apiKey: params.apiKey }), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(this.getRequestTimeoutMs()),
        body: JSON.stringify(
          buildGeminiInsightRequestBody({
            prompt: buildMarketInsightPrompt({
              auth: params.auth,
              finance: params.finance,
              focus: params.focus,
            }),
            maxOutputTokens: this.getMaxOutputTokens(),
            thinkingBudget: this.getThinkingBudget(),
          }),
        ),
      })
    } catch (error) {
      this.logger.warn(`Gemini nao respondeu: ${String(error)}`)
      throw new ServiceUnavailableException(
        'Nao foi possivel conectar ao servico de IA neste momento. Tente novamente em instantes.',
      )
    }
  }

  private async recordGeneratedInsight(params: {
    auth: AuthContext
    context: RequestContext
    focus: MarketInsightFocus
    result: MarketInsightResponse
    rateLimitState: RateLimitEntry
  }) {
    await this.auditLogService.record({
      actorUserId: resolveAuthActorUserId(params.auth),
      event: 'market-intelligence.generated',
      resource: 'market_intelligence',
      metadata: {
        focus: params.focus.value,
        model: params.result.model,
        attempts: params.rateLimitState.count,
        lockedUntil: params.rateLimitState.lockedUntil
          ? new Date(params.rateLimitState.lockedUntil).toISOString()
          : null,
      },
      ipAddress: params.context.ipAddress,
      userAgent: params.context.userAgent,
    })
  }

  private async assertRequestAllowed(redisKey: string): Promise<void> {
    const entry = await this.cache.get<RateLimitEntry>(redisKey)
    if (!entry) {
      return
    }

    const now = Date.now()

    if (entry.lockedUntil && entry.lockedUntil > now) {
      const retryAfterSeconds = Math.ceil((entry.lockedUntil - now) / 1000)
      throw new HttpException(
        `Muitas solicitacoes de analise com IA. Tente novamente em ${retryAfterSeconds} segundo(s).`,
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }

    if (entry.firstAttemptAt + this.getWindowMs() <= now) {
      await this.cache.del(redisKey)
    }
  }

  private async recordRequest(redisKey: string): Promise<RateLimitEntry> {
    const now = Date.now()
    const existing = await this.cache.get<RateLimitEntry>(redisKey)

    if (!existing || existing.firstAttemptAt + this.getWindowMs() <= now) {
      const fresh: RateLimitEntry = { count: 1, firstAttemptAt: now, lockedUntil: null }
      await this.cache.set(redisKey, fresh, Math.ceil(this.getWindowMs() / 1000))
      return fresh
    }

    const newCount = existing.count + 1
    const shouldLock = newCount >= this.getMaxRequests()
    const lockedUntil = shouldLock ? now + this.getLockMs() : null
    const updated: RateLimitEntry = { count: newCount, firstAttemptAt: existing.firstAttemptAt, lockedUntil }
    const ttlSeconds = shouldLock
      ? Math.ceil(this.getLockMs() / 1000)
      : Math.ceil((existing.firstAttemptAt + this.getWindowMs() - now) / 1000)

    await this.cache.set(redisKey, updated, Math.max(ttlSeconds, 1))
    return updated
  }

  private buildRateLimitKey(params: { userId: string; ipAddress: string | null }) {
    return `market-intelligence:${params.userId}:${params.ipAddress ?? 'unknown'}`
  }

  private getModel() {
    return this.configService.get<string>('GEMINI_MODEL') ?? 'gemini-2.5-flash'
  }

  private getRequestTimeoutMs() {
    return Math.max(Number(this.configService.get<string>('GEMINI_TIMEOUT_MS') ?? 15000), 5000)
  }

  private getMaxOutputTokens() {
    return Math.max(Number(this.configService.get<string>('GEMINI_MAX_OUTPUT_TOKENS') ?? 768), 256)
  }

  private getThinkingBudget() {
    const configured = Number(this.configService.get<string>('GEMINI_THINKING_BUDGET') ?? 0)
    return Number.isFinite(configured) ? configured : 0
  }

  private buildModelUrl(params: { model: string; apiKey: string }) {
    const baseUrl =
      this.configService.get<string>('GEMINI_API_URL') ?? 'https://generativelanguage.googleapis.com/v1beta/models'
    return `${baseUrl}/${params.model}:generateContent?key=${encodeURIComponent(params.apiKey)}`
  }

  private getCacheTtlSeconds() {
    return Math.max(Number(this.configService.get<string>('GEMINI_CACHE_SECONDS') ?? 900), 60)
  }

  private getMaxRequests() {
    return Math.max(Number(this.configService.get<string>('GEMINI_MAX_REQUESTS') ?? 6), 1)
  }

  private getWindowMs() {
    return Math.max(Number(this.configService.get<string>('GEMINI_WINDOW_MINUTES') ?? 60), 1) * 60 * 1000
  }

  private getLockMs() {
    return Math.max(Number(this.configService.get<string>('GEMINI_LOCK_MINUTES') ?? 60), 1) * 60 * 1000
  }
}
