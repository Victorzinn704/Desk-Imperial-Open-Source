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
import { sanitizePlainText } from '../../common/utils/input-hardening.util'
import { FinanceService } from '../finance/finance.service'
import { AuditLogService } from '../monitoring/audit-log.service'
import type { AuthContext } from '../auth/auth.types'

type InsightCacheEntry = {
  expiresAt: number
  payload: MarketInsightResponse
}

type AttemptEntry = {
  count: number
  firstAttemptAt: number
  lockedUntil: number | null
}

type MarketInsightModelPayload = {
  summary?: unknown
  forecast?: unknown
  opportunities?: unknown
  risks?: unknown
  nextActions?: unknown
}

export type MarketInsightResponse = {
  generatedAt: string
  model: string
  focus: string
  cached: boolean
  summary: string
  forecast: string
  opportunities: string[]
  risks: string[]
  nextActions: string[]
}

@Injectable()
export class MarketIntelligenceService {
  private readonly logger = new Logger(MarketIntelligenceService.name)
  private readonly cache = new Map<string, InsightCacheEntry>()
  private readonly attempts = new Map<string, AttemptEntry>()

  constructor(
    private readonly configService: ConfigService,
    private readonly financeService: FinanceService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async getInsightForUser(
    auth: AuthContext,
    focus: string | undefined,
    context: RequestContext,
  ): Promise<MarketInsightResponse> {
    const normalizedFocus =
      sanitizePlainText(focus, 'Foco da analise', {
        allowEmpty: true,
        rejectFormula: true,
      }) ?? 'Visao executiva geral'
    const cacheKey = `${auth.userId}:${auth.preferredCurrency}:${normalizedFocus.toLowerCase()}`
    const cached = this.getCachedInsight(cacheKey)

    if (cached) {
      await this.auditLogService.record({
        actorUserId: auth.userId,
        event: 'market-intelligence.cached',
        resource: 'market_intelligence',
        metadata: {
          focus: normalizedFocus,
          model: cached.model,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })

      return {
        ...cached,
        cached: true,
      }
    }

    const apiKey = this.configService.get<string>('GEMINI_API_KEY')
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'A inteligencia de mercado ainda nao foi configurada. Adicione GEMINI_API_KEY para ativar o Gemini Flash.',
      )
    }

    const rateLimitKey = this.buildRateLimitKey(auth.userId, context.ipAddress)
    this.assertRequestAllowed(rateLimitKey)
    const rateLimitState = this.recordRequest(rateLimitKey)
    const finance = await this.financeService.getSummaryForUser(auth)
    const model = this.configService.get<string>('GEMINI_MODEL') ?? 'gemini-2.5-flash'
    const response = await fetch(this.buildModelUrl(model, apiKey), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: buildPrompt({
                  auth,
                  finance,
                  focus: normalizedFocus,
                }),
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.45,
          topP: 0.9,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              summary: { type: 'STRING' },
              forecast: { type: 'STRING' },
              opportunities: {
                type: 'ARRAY',
                items: { type: 'STRING' },
              },
              risks: {
                type: 'ARRAY',
                items: { type: 'STRING' },
              },
              nextActions: {
                type: 'ARRAY',
                items: { type: 'STRING' },
              },
            },
            required: ['summary', 'forecast', 'opportunities', 'risks', 'nextActions'],
          },
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      this.logger.warn(`Gemini respondeu com erro ${response.status}: ${errorText}`)
      throw new BadGatewayException(
        'Nao foi possivel concluir a leitura da IA neste momento. Tente novamente em instantes.',
      )
    }

    const payload = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            text?: string
          }>
        }
      }>
    }

    const rawText = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('')?.trim()
    if (!rawText) {
      throw new BadGatewayException('A IA nao retornou uma leitura valida para esta consulta.')
    }

    const insight = normalizeInsightPayload(rawText)
    const result: MarketInsightResponse = {
      generatedAt: new Date().toISOString(),
      model,
      focus: normalizedFocus,
      cached: false,
      summary: insight.summary,
      forecast: insight.forecast,
      opportunities: insight.opportunities,
      risks: insight.risks,
      nextActions: insight.nextActions,
    }

    this.cache.set(cacheKey, {
      expiresAt: Date.now() + this.getCacheTtlSeconds() * 1000,
      payload: result,
    })

    await this.auditLogService.record({
      actorUserId: auth.userId,
      event: 'market-intelligence.generated',
      resource: 'market_intelligence',
      metadata: {
        focus: normalizedFocus,
        model,
        attempts: rateLimitState.count,
        lockedUntil: rateLimitState.lockedUntil
          ? new Date(rateLimitState.lockedUntil).toISOString()
          : null,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return result
  }

  private buildModelUrl(model: string, apiKey: string) {
    const baseUrl =
      this.configService.get<string>('GEMINI_API_URL') ??
      'https://generativelanguage.googleapis.com/v1beta/models'
    return `${baseUrl}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
  }

  private getCacheTtlSeconds() {
    return Math.max(Number(this.configService.get<string>('GEMINI_CACHE_SECONDS') ?? 900), 60)
  }

  private buildRateLimitKey(userId: string, ipAddress: string | null) {
    return `market-intelligence:${userId}:${ipAddress ?? 'unknown'}`
  }

  private assertRequestAllowed(key: string) {
    const entry = this.attempts.get(key)
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
      this.attempts.delete(key)
    }
  }

  private recordRequest(key: string) {
    const now = Date.now()
    const current = this.attempts.get(key)

    if (!current || current.firstAttemptAt + this.getWindowMs() <= now) {
      const next: AttemptEntry = {
        count: 1,
        firstAttemptAt: now,
        lockedUntil: null,
      }
      this.attempts.set(key, next)
      return next
    }

    current.count += 1
    if (current.count >= this.getMaxRequests()) {
      current.lockedUntil = now + this.getLockMs()
    }

    this.attempts.set(key, current)
    return current
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

  private getCachedInsight(key: string) {
    const entry = this.cache.get(key)
    if (!entry) {
      return null
    }

    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key)
      return null
    }

    return entry.payload
  }
}

function buildPrompt(params: {
  auth: AuthContext
  finance: Awaited<ReturnType<FinanceService['getSummaryForUser']>>
  focus: string
}) {
  const payload = {
    companyName: params.auth.companyName ?? params.auth.fullName,
    displayCurrency: params.finance.displayCurrency,
    ratesUpdatedAt: params.finance.ratesUpdatedAt,
    totals: params.finance.totals,
    salesByChannel: params.finance.salesByChannel.slice(0, 5),
    topCustomers: params.finance.topCustomers.slice(0, 5),
    topProducts: params.finance.topProducts.slice(0, 5).map((product) => ({
      name: product.name,
      category: product.category,
      stock: product.stock,
      marginPercent: product.marginPercent,
      inventorySalesValue: product.inventorySalesValue,
      potentialProfit: product.potentialProfit,
    })),
    topEmployees: params.finance.topEmployees.slice(0, 5),
    topRegions: params.finance.topRegions.slice(0, 5),
    revenueTimeline: params.finance.revenueTimeline,
    categoryBreakdown: params.finance.categoryBreakdown.slice(0, 6),
    focus: params.focus,
  }

  return [
    'Voce e um consultor executivo de mercado e previsao comercial para pequenas e medias operacoes.',
    'Use apenas os dados internos abaixo. Nao invente noticias externas, cotacoes adicionais ou fatos nao fornecidos.',
    'Quando fizer previsoes, trate-as como inferencias de curto prazo baseadas na operacao observada.',
    'Responda em portugues do Brasil.',
    'Entregue JSON valido com as chaves:',
    '- summary: resumo executivo em 2 ou 3 frases',
    '- forecast: previsao de curto prazo com explicacao objetiva',
    '- opportunities: lista de 3 oportunidades',
    '- risks: lista de 3 riscos',
    '- nextActions: lista de 3 a 4 acoes praticas',
    '',
    `Foco principal da consulta: ${params.focus}`,
    '',
    'Dados da operacao:',
    JSON.stringify(payload, null, 2),
  ].join('\n')
}

function normalizeInsightPayload(rawText: string) {
  let parsed: MarketInsightModelPayload

  try {
    parsed = JSON.parse(rawText) as MarketInsightModelPayload
  } catch {
    throw new BadGatewayException('A IA retornou um formato invalido para a leitura executiva.')
  }

  const summary = normalizeString(parsed.summary)
  const forecast = normalizeString(parsed.forecast)
  const opportunities = normalizeStringArray(parsed.opportunities, 3)
  const risks = normalizeStringArray(parsed.risks, 3)
  const nextActions = normalizeStringArray(parsed.nextActions, 4)

  if (!summary || !forecast || !opportunities.length || !risks.length || !nextActions.length) {
    throw new BadGatewayException('A resposta da IA veio incompleta para o dashboard executivo.')
  }

  return {
    summary,
    forecast,
    opportunities,
    risks,
    nextActions,
  }
}

function normalizeString(value: unknown) {
  if (typeof value !== 'string') {
    return ''
  }

  return value.replace(/\s+/g, ' ').trim()
}

function normalizeStringArray(value: unknown, maxItems: number) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, maxItems)
}
