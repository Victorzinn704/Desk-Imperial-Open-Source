import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { CurrencyCode } from '@prisma/client'
import { roundCurrency } from '../../common/utils/number-rounding.util'
import {
  DEFAULT_CURRENCY,
  DEFAULT_EXCHANGE_PAIRS,
  DEFAULT_FALLBACK_EUR_BRL,
  DEFAULT_FALLBACK_USD_BRL,
  SUPPORTED_CURRENCIES,
} from './currency.constants'

type AwesomeRatePayload = Record<
  string,
  {
    bid: string
    create_date: string
  }
>

export type ExchangeRatesSource = 'live' | 'stale-cache' | 'fallback'

export type ExchangeRatesSnapshot = {
  updatedAt: string | null
  source: ExchangeRatesSource
  notice: string | null
  rates: Record<string, number>
}

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name)
  private cache: {
    freshUntil: number
    staleUntil: number
    snapshot: ExchangeRatesSnapshot
  } | null = null
  private retryAfterUntil = 0

  constructor(private readonly configService: ConfigService) {}

  getSupportedCurrencies() {
    return [...SUPPORTED_CURRENCIES]
  }

  async getSnapshot(): Promise<ExchangeRatesSnapshot> {
    const now = Date.now()
    if (this.cache && this.cache.freshUntil > now) {
      return this.cache.snapshot
    }

    if (this.cache && this.retryAfterUntil > now) {
      return this.buildStaleSnapshot(
        this.cache.snapshot,
        'Limite temporario de consultas atingido. Estamos reutilizando a ultima cotacao disponivel.',
      )
    }

    try {
      const response = await fetch(this.getRatesUrl(), {
        headers: this.getRequestHeaders(),
        signal: AbortSignal.timeout(10000),
      })
      if (!response.ok) {
        if (response.status === 429) {
          this.retryAfterUntil = now + this.getRateLimitBackoffSeconds() * 1000
        }
        throw new Error(`AwesomeAPI respondeu com status ${response.status}.`)
      }

      const payload = (await response.json()) as AwesomeRatePayload
      const snapshot = buildSnapshot(payload)
      if (Object.keys(snapshot.rates).length === 0) {
        throw new Error('A AwesomeAPI nao retornou cotacoes validas para BRL, USD e EUR.')
      }
      this.cache = {
        freshUntil: now + this.getCacheTtlSeconds() * 1000,
        staleUntil: now + this.getStaleCacheTtlSeconds() * 1000,
        snapshot,
      }
      this.retryAfterUntil = 0
      return snapshot
    } catch (error) {
      const errorMessage = extractErrorMessage(error)

      if (this.cache && this.cache.staleUntil > now) {
        this.logger.warn(`Cotacao em modo stale-cache: ${errorMessage}`)
        return this.buildStaleSnapshot(
          this.cache.snapshot,
          'Cotacao ao vivo indisponivel no momento. Exibindo a ultima leitura valida em cache.',
        )
      }

      if (this.cache) {
        this.logger.warn(`Cotacao em modo stale-cache prolongado: ${errorMessage}`)
        return this.buildStaleSnapshot(
          this.cache.snapshot,
          'Cotacao ao vivo indisponivel. Exibindo a ultima leitura conhecida ate a API voltar a responder.',
        )
      }

      const fallbackSnapshot = this.buildEmergencyFallbackSnapshot()
      this.logger.warn(`Cotacao em modo fallback: ${errorMessage}`)
      return fallbackSnapshot
    }
  }

  convert(amount: number, from: CurrencyCode, to: CurrencyCode, snapshot: ExchangeRatesSnapshot): number {
    if (from === to) {
      return roundCurrency(amount)
    }

    const directKey = buildPairKey(from, to)
    const directRate = snapshot.rates[directKey]
    if (directRate) {
      return roundCurrency(amount * directRate)
    }

    const inverseKey = buildPairKey(to, from)
    const inverseRate = snapshot.rates[inverseKey]
    if (inverseRate) {
      return roundCurrency(amount / inverseRate)
    }

    const viaBase = DEFAULT_CURRENCY
    if (from !== viaBase && to !== viaBase) {
      const amountInBase: number = this.convert(amount, from, viaBase, snapshot)
      return this.convert(amountInBase, viaBase, to, snapshot)
    }

    throw new ServiceUnavailableException(`Nao existe cotacao disponivel para ${from}/${to}.`)
  }

  private getRatesUrl() {
    const configuredUrl = this.configService.get<string>('EXCHANGE_RATES_URL')
    if (!configuredUrl) {
      return `https://economia.awesomeapi.com.br/last/${DEFAULT_EXCHANGE_PAIRS.join(',')}`
    }

    const normalizedUrl = configuredUrl.trim().replace(/\/+$/, '')
    if (normalizedUrl.endsWith('/last')) {
      return `${normalizedUrl}/${DEFAULT_EXCHANGE_PAIRS.join(',')}`
    }

    return normalizedUrl
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

  private buildStaleSnapshot(snapshot: ExchangeRatesSnapshot, notice: string): ExchangeRatesSnapshot {
    return {
      ...snapshot,
      source: 'stale-cache',
      notice,
    }
  }

  private buildEmergencyFallbackSnapshot(): ExchangeRatesSnapshot {
    const usdBrl = this.readFallbackRate('EXCHANGE_RATES_FALLBACK_USD_BRL', DEFAULT_FALLBACK_USD_BRL)
    const eurBrl = this.readFallbackRate('EXCHANGE_RATES_FALLBACK_EUR_BRL', DEFAULT_FALLBACK_EUR_BRL)
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

  private readFallbackRate(key: string, fallback: number) {
    const configured = Number(this.configService.get<string>(key) ?? '')
    return Number.isFinite(configured) && configured > 0 ? configured : fallback
  }
}

function buildSnapshot(payload: AwesomeRatePayload): ExchangeRatesSnapshot {
  const rates: Record<string, number> = {}
  let latestTimestamp = 0

  for (const [key, quote] of Object.entries(payload)) {
    if (!quote?.bid) {
      continue
    }

    const code = normalizeCurrencyCode(quoteCodeSegment(key, 0))
    const codeIn = normalizeCurrencyCode(quoteCodeSegment(key, 1))

    if (!code || !codeIn || !SUPPORTED_CURRENCIES.includes(code) || !SUPPORTED_CURRENCIES.includes(codeIn)) {
      continue
    }

    const bid = Number.parseFloat(quote.bid)
    if (!Number.isFinite(bid) || bid <= 0) {
      continue
    }

    rates[buildPairKey(code, codeIn)] = bid

    const parsedDate = Date.parse(quote.create_date.replace(' ', 'T'))
    latestTimestamp = Number.isFinite(parsedDate) ? Math.max(latestTimestamp, parsedDate) : latestTimestamp
  }

  return {
    updatedAt: latestTimestamp ? new Date(latestTimestamp).toISOString() : null,
    source: 'live',
    notice: null,
    rates,
  }
}

function quoteCodeSegment(key: string, index: 0 | 1) {
  const normalized = key.replaceAll('-', '').toUpperCase()
  return index === 0 ? normalized.slice(0, 3) : normalized.slice(3, 6)
}

function normalizeCurrencyCode(value: string): CurrencyCode | null {
  return SUPPORTED_CURRENCIES.find((currency) => currency === value) ?? null
}

function buildPairKey(from: CurrencyCode, to: CurrencyCode) {
  return `${from}_${to}`
}

function extractErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Erro desconhecido ao consultar cotacoes.'
}
