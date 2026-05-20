import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { roundCurrency } from '../../common/utils/number-rounding.util'
import {
  DEFAULT_CURRENCY,
  DEFAULT_EXCHANGE_PAIRS,
  DEFAULT_FALLBACK_EUR_BRL,
  DEFAULT_FALLBACK_USD_BRL,
  SUPPORTED_CURRENCIES,
} from './currency.constants'
import {
  assertSnapshotHasRates,
  type AwesomeRatePayload,
  buildPairKey,
  buildSnapshot,
  extractErrorMessage,
  trimTrailingSlashes,
} from './currency-rates.utils'
import type { CurrencyConversionInput, ExchangeRatesSnapshot } from './currency.types'

export type {
  CurrencyAmount,
  CurrencyConversionInput,
  ExchangeRatesSnapshot,
  ExchangeRatesSource,
} from './currency.types'

type ExchangeRatesCacheEntry = {
  freshUntil: number
  staleUntil: number
  snapshot: ExchangeRatesSnapshot
}
type ExchangeRatesClock = {
  nowMs: number
}
type RatesHttpFailure = {
  clock: ExchangeRatesClock
  status: number
}
type SnapshotCacheWrite = {
  clock: ExchangeRatesClock
  snapshot: ExchangeRatesSnapshot
}
type SnapshotFailure = {
  clock: ExchangeRatesClock
  error: unknown
}
type StaleSnapshotInput = {
  notice: string
  snapshot: ExchangeRatesSnapshot
}
type FallbackRateConfig = {
  fallback: number
  key: string
}

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name)
  private cache: ExchangeRatesCacheEntry | null = null
  private retryAfterUntil = 0

  constructor(private readonly configService: ConfigService) {}

  getSupportedCurrencies() {
    return [...SUPPORTED_CURRENCIES]
  }

  async getSnapshot(): Promise<ExchangeRatesSnapshot> {
    const clock = this.createClock()
    const freshSnapshot = this.resolveFreshCachedSnapshot(clock)
    if (freshSnapshot) {
      return freshSnapshot
    }

    const rateLimitedSnapshot = this.resolveRateLimitedSnapshot(clock)
    if (rateLimitedSnapshot) {
      return rateLimitedSnapshot
    }

    try {
      return await this.fetchAndCacheLiveSnapshot(clock)
    } catch (error) {
      return this.buildFailureSnapshot({ error, clock })
    }
  }

  convert({ source, targetCurrency, snapshot }: CurrencyConversionInput): number {
    const { amount, currency: sourceCurrency } = source

    if (sourceCurrency === targetCurrency) {
      return roundCurrency(amount)
    }

    const directKey = buildPairKey({ from: sourceCurrency, to: targetCurrency })
    const directRate = snapshot.rates[directKey]
    if (directRate) {
      return roundCurrency(amount * directRate)
    }

    const inverseKey = buildPairKey({ from: targetCurrency, to: sourceCurrency })
    const inverseRate = snapshot.rates[inverseKey]
    if (inverseRate) {
      return roundCurrency(amount / inverseRate)
    }

    const viaBase = DEFAULT_CURRENCY
    if (sourceCurrency !== viaBase && targetCurrency !== viaBase) {
      const amountInBase = this.convert({
        source: { amount, currency: sourceCurrency },
        targetCurrency: viaBase,
        snapshot,
      })
      return this.convert({
        source: { amount: amountInBase, currency: viaBase },
        targetCurrency,
        snapshot,
      })
    }

    throw new ServiceUnavailableException(`Nao existe cotacao disponivel para ${sourceCurrency}/${targetCurrency}.`)
  }

  private getRatesUrl() {
    const configuredUrl = this.configService.get<string>('EXCHANGE_RATES_URL')
    if (!configuredUrl) {
      return `https://economia.awesomeapi.com.br/last/${DEFAULT_EXCHANGE_PAIRS.join(',')}`
    }

    const normalizedUrl = trimTrailingSlashes({ value: configuredUrl.trim() })
    if (normalizedUrl.endsWith('/last')) {
      return `${normalizedUrl}/${DEFAULT_EXCHANGE_PAIRS.join(',')}`
    }

    return normalizedUrl
  }

  private createClock(): ExchangeRatesClock {
    return { nowMs: Date.now() }
  }

  private resolveFreshCachedSnapshot(clock: ExchangeRatesClock) {
    return this.cache && this.cache.freshUntil > clock.nowMs ? this.cache.snapshot : null
  }

  private resolveRateLimitedSnapshot(clock: ExchangeRatesClock) {
    if (!(this.cache && this.retryAfterUntil > clock.nowMs)) {
      return null
    }

    return this.buildStaleSnapshot({
      snapshot: this.cache.snapshot,
      notice: 'Limite temporario de consultas atingido. Estamos reutilizando a ultima cotacao disponivel.',
    })
  }

  private async fetchAndCacheLiveSnapshot(clock: ExchangeRatesClock) {
    const response = await fetch(this.getRatesUrl(), this.buildRatesRequestOptions())
    if (!response.ok) {
      this.registerRatesFailure({ status: response.status, clock })
    }

    const snapshot = buildSnapshot((await response.json()) as AwesomeRatePayload)
    assertSnapshotHasRates(snapshot)
    this.cacheLiveSnapshot({ snapshot, clock })
    return snapshot
  }

  private buildRatesRequestOptions(): RequestInit {
    const requestHeaders = this.getRequestHeaders()
    if (!requestHeaders) {
      return {
        signal: AbortSignal.timeout(10000),
      }
    }

    return {
      headers: requestHeaders,
      signal: AbortSignal.timeout(10000),
    }
  }

  private registerRatesFailure({ status, clock }: RatesHttpFailure): never {
    if (status === 429) {
      this.retryAfterUntil = clock.nowMs + this.getRateLimitBackoffSeconds() * 1000
    }

    throw new Error(`AwesomeAPI respondeu com status ${status}.`)
  }

  private cacheLiveSnapshot({ snapshot, clock }: SnapshotCacheWrite) {
    this.cache = {
      freshUntil: clock.nowMs + this.getCacheTtlSeconds() * 1000,
      staleUntil: clock.nowMs + this.getStaleCacheTtlSeconds() * 1000,
      snapshot,
    }
    this.retryAfterUntil = 0
  }

  private buildFailureSnapshot({ error, clock }: SnapshotFailure) {
    const errorMessage = extractErrorMessage({ error })

    if (this.cache && this.cache.staleUntil > clock.nowMs) {
      this.logger.warn(`Cotacao em modo stale-cache: ${errorMessage}`)
      return this.buildStaleSnapshot({
        snapshot: this.cache.snapshot,
        notice: 'Cotacao ao vivo indisponivel no momento. Exibindo a ultima leitura valida em cache.',
      })
    }

    if (this.cache) {
      this.logger.warn(`Cotacao em modo stale-cache prolongado: ${errorMessage}`)
      return this.buildStaleSnapshot({
        snapshot: this.cache.snapshot,
        notice: 'Cotacao ao vivo indisponivel. Exibindo a ultima leitura conhecida ate a API voltar a responder.',
      })
    }

    this.logger.warn(`Cotacao em modo fallback: ${errorMessage}`)
    return this.buildEmergencyFallbackSnapshot()
  }

  private getRequestHeaders() {
    const apiKey = this.configService.get<string>('EXCHANGE_RATES_API_KEY')?.trim()
    if (!apiKey) {
      return undefined
    }

    return {
      'x-api-key': apiKey,
    }
  }

  private getCacheTtlSeconds() {
    const configuredTtl = Number(this.configService.get<string>('EXCHANGE_RATES_CACHE_SECONDS') ?? 300)
    return Math.max(configuredTtl, 30)
  }

  private getStaleCacheTtlSeconds() {
    const configuredTtl = Number(this.configService.get<string>('EXCHANGE_RATES_STALE_CACHE_SECONDS') ?? 21600)
    return Math.max(configuredTtl, this.getCacheTtlSeconds())
  }

  private getRateLimitBackoffSeconds() {
    const configuredBackoff = Number(this.configService.get<string>('EXCHANGE_RATES_RATE_LIMIT_BACKOFF_SECONDS') ?? 600)
    return Math.max(configuredBackoff, 60)
  }

  private buildStaleSnapshot({ snapshot, notice }: StaleSnapshotInput): ExchangeRatesSnapshot {
    return {
      ...snapshot,
      source: 'stale-cache',
      notice,
    }
  }

  private buildEmergencyFallbackSnapshot(): ExchangeRatesSnapshot {
    const usdBrl =
      this.readFallbackRate({ key: 'EXCHANGE_RATES_FALLBACK_USD_BRL', fallback: DEFAULT_FALLBACK_USD_BRL }) || 1
    const eurBrl =
      this.readFallbackRate({ key: 'EXCHANGE_RATES_FALLBACK_EUR_BRL', fallback: DEFAULT_FALLBACK_EUR_BRL }) || 1
    const usdEur = usdBrl / eurBrl
    const eurUsd = eurBrl / usdBrl

    return {
      updatedAt: null,
      source: 'fallback',
      notice:
        'Cotacao temporariamente indisponivel. Exibindo uma estimativa de contingencia para manter o painel operacional.',
      rates: {
        BRL_USD: roundCurrency(1 / usdBrl),
        BRL_EUR: roundCurrency(1 / eurBrl),
        USD_BRL: roundCurrency(usdBrl),
        EUR_BRL: roundCurrency(eurBrl),
        USD_EUR: roundCurrency(usdEur),
        EUR_USD: roundCurrency(eurUsd),
      },
    }
  }

  private readFallbackRate({ key, fallback }: FallbackRateConfig) {
    const configured = Number(this.configService.get<string>(key) ?? '')
    const resolved = Number.isFinite(configured) && configured > 0 ? configured : fallback
    return resolved > 0 ? resolved : 1 // Prevents absolute 0 bypassing earlier bounds
  }
}
