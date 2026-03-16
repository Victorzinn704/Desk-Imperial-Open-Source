import { Injectable, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { CurrencyCode } from '@prisma/client'
import { DEFAULT_EXCHANGE_PAIRS, DEFAULT_CURRENCY, SUPPORTED_CURRENCIES } from './currency.constants'

type AwesomeRatePayload = Record<
  string,
  {
    bid: string
    create_date: string
  }
>

export type ExchangeRatesSnapshot = {
  updatedAt: string | null
  rates: Record<string, number>
}

@Injectable()
export class CurrencyService {
  private cache: {
    expiresAt: number
    snapshot: ExchangeRatesSnapshot
  } | null = null

  constructor(private readonly configService: ConfigService) {}

  getSupportedCurrencies() {
    return [...SUPPORTED_CURRENCIES]
  }

  async getSnapshot(): Promise<ExchangeRatesSnapshot> {
    const now = Date.now()
    if (this.cache && this.cache.expiresAt > now) {
      return this.cache.snapshot
    }

    try {
      const response = await fetch(this.getRatesUrl())
      if (!response.ok) {
        throw new Error(`AwesomeAPI respondeu com status ${response.status}.`)
      }

      const payload = (await response.json()) as AwesomeRatePayload
      const snapshot = buildSnapshot(payload)
      this.cache = {
        expiresAt: now + this.getCacheTtlSeconds() * 1000,
        snapshot,
      }
      return snapshot
    } catch (error) {
      if (this.cache) {
        return this.cache.snapshot
      }

      throw new ServiceUnavailableException(
        error instanceof Error
          ? `Nao foi possivel consultar a cotacao em tempo real. ${error.message}`
          : 'Nao foi possivel consultar a cotacao em tempo real.',
      )
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

  private getCacheTtlSeconds() {
    const configuredTtl = Number(this.configService.get<string>('EXCHANGE_RATES_CACHE_SECONDS') ?? 300)
    return Math.max(configuredTtl, 30)
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

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100
}
