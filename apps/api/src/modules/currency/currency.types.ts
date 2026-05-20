import type { CurrencyCode } from '@prisma/client'

export type ExchangeRatesSource = 'live' | 'stale-cache' | 'fallback'

export type ExchangeRatesSnapshot = {
  updatedAt: string | null
  source: ExchangeRatesSource
  notice: string | null
  rates: Record<string, number>
}

export type CurrencyAmount = {
  amount: number
  currency: CurrencyCode
}

export type CurrencyConversionInput = {
  source: CurrencyAmount
  targetCurrency: CurrencyCode
  snapshot: ExchangeRatesSnapshot
}
