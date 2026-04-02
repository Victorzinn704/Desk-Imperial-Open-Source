import { BadGatewayException, HttpException, ServiceUnavailableException } from '@nestjs/common'
import { MarketIntelligenceService } from '../src/modules/market-intelligence/market-intelligence.service'
import type { ConfigService } from '@nestjs/config'
import type { FinanceService } from '../src/modules/finance/finance.service'
import type { AuditLogService } from '../src/modules/monitoring/audit-log.service'
import type { CacheService } from '../src/common/services/cache.service'
import { makeAuthContext } from './helpers/auth-context.factory'
import { makeRequestContext } from './helpers/request-context.factory'

describe('MarketIntelligenceService', () => {
  const configValues: Record<string, string | undefined> = {
    GEMINI_API_KEY: 'test-key',
    GEMINI_MODEL: 'gemini-2.5-flash',
    GEMINI_TIMEOUT_MS: '15000',
    GEMINI_MAX_OUTPUT_TOKENS: '768',
    GEMINI_THINKING_BUDGET: '0',
    GEMINI_CACHE_SECONDS: '900',
    GEMINI_MAX_REQUESTS: '6',
    GEMINI_WINDOW_MINUTES: '60',
    GEMINI_LOCK_MINUTES: '60',
  }

  const configService = {
    get: jest.fn((key: string) => configValues[key]),
  }

  const financeService = {
    getSummaryForUser: jest.fn(),
  }

  const auditLogService = {
    record: jest.fn(async () => {}),
  }

  const cache = {
    get: jest.fn(),
    set: jest.fn(async () => {}),
    del: jest.fn(async () => {}),
  }

  const originalFetch = global.fetch

  function makeFinanceSummary() {
    return {
      displayCurrency: 'BRL',
      ratesUpdatedAt: new Date().toISOString(),
      totals: {
        activeProducts: 2,
        completedOrders: 3,
        realizedRevenue: 300,
        realizedProfit: 120,
      },
      salesByChannel: [],
      topCustomers: [],
      topProducts: [],
      topEmployees: [],
      topRegions: [],
      revenueTimeline: [],
      categoryBreakdown: [],
    }
  }

  let service: MarketIntelligenceService

  beforeEach(() => {
    jest.clearAllMocks()
    configValues.GEMINI_API_KEY = 'test-key'
    service = new MarketIntelligenceService(
      configService as unknown as ConfigService,
      financeService as unknown as FinanceService,
      auditLogService as unknown as AuditLogService,
      cache as unknown as CacheService,
    )
    ;(global as any).fetch = jest.fn()
    financeService.getSummaryForUser.mockResolvedValue(makeFinanceSummary())
  })

  afterAll(() => {
    ;(global as any).fetch = originalFetch
  })

  it('retorna resultado em cache sem chamar provider externo', async () => {
    cache.get.mockResolvedValueOnce({
      generatedAt: new Date().toISOString(),
      model: 'gemini-2.5-flash',
      focus: 'Visao executiva geral',
      cached: false,
      summary: 'Resumo',
      forecast: 'Previsao',
      opportunities: ['Oportunidade 1'],
      risks: ['Risco 1'],
      nextActions: ['Acao 1'],
    })

    const result = await service.getInsightForUser(makeAuthContext(), undefined, makeRequestContext())

    expect(result.cached).toBe(true)
    expect((global as any).fetch).not.toHaveBeenCalled()
    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'market-intelligence.cached' }),
    )
  })

  it('falha quando GEMINI_API_KEY nao esta configurada', async () => {
    configValues.GEMINI_API_KEY = undefined
    cache.get.mockResolvedValueOnce(null)

    await expect(service.getInsightForUser(makeAuthContext(), 'foco', makeRequestContext())).rejects.toThrow(
      ServiceUnavailableException,
    )
  })

  it('bloqueia quando rate limit esta em lock ativo', async () => {
    cache.get
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ count: 7, firstAttemptAt: Date.now() - 1000, lockedUntil: Date.now() + 60_000 })

    await expect(service.getInsightForUser(makeAuthContext(), 'foco', makeRequestContext())).rejects.toThrow(
      HttpException,
    )
    expect(financeService.getSummaryForUser).not.toHaveBeenCalled()
  })

  it('retorna bad gateway quando provider responde erro', async () => {
    cache.get.mockResolvedValueOnce(null).mockResolvedValueOnce(null)
    ;(global as any).fetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'provider-failed',
    })

    await expect(service.getInsightForUser(makeAuthContext(), 'foco', makeRequestContext())).rejects.toThrow(
      BadGatewayException,
    )
  })

  it('retorna bad gateway quando payload da IA nao e json valido', async () => {
    cache.get.mockResolvedValueOnce(null).mockResolvedValueOnce(null)
    ;(global as any).fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: 'texto-sem-json' }],
            },
          },
        ],
      }),
    })

    await expect(service.getInsightForUser(makeAuthContext(), 'foco', makeRequestContext())).rejects.toThrow(
      BadGatewayException,
    )
  })

  it('gera insight e persiste cache quando provider responde formato valido', async () => {
    cache.get.mockResolvedValueOnce(null).mockResolvedValueOnce(null)
    ;(global as any).fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    summary: 'Resumo executivo objetivo',
                    forecast: 'Previsao de estabilidade no curto prazo',
                    opportunities: ['Ampliar canal PDV'],
                    risks: ['Oscilacao de demanda'],
                    nextActions: ['Revisar mix de produtos'],
                  }),
                },
              ],
            },
          },
        ],
      }),
    })

    const result = await service.getInsightForUser(makeAuthContext(), 'margem', makeRequestContext())

    expect(result.cached).toBe(false)
    expect(result.summary).toContain('Resumo executivo')
    expect(cache.set).toHaveBeenCalledTimes(2)
    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'market-intelligence.generated' }),
    )
  })
})
