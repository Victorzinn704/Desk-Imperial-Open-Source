import type { CurrencyCode } from '@prisma/client'
import { SUPPORTED_CURRENCIES } from './currency.constants'
import type { ExchangeRatesSnapshot } from './currency.types'

export type AwesomeRatePayload = Record<
  string,
  {
    bid: string
    create_date: string
  }
>

type AwesomeRateQuote = AwesomeRatePayload[string]
type CurrencyPair = {
  from: CurrencyCode
  to: CurrencyCode
}
type PairKeyInput = {
  from: CurrencyCode
  to: CurrencyCode
}
type RateQuoteInput = {
  pair: CurrencyPair
  quote: AwesomeRateQuote
}
type RawAwesomePairKey = {
  pairKey: string
}
type CurrencyCodeCandidate = {
  value: string
}
type RawRateBid = {
  value: string | undefined
}
type RawQuoteTimestamp = {
  value: string
}
type RawUrlText = {
  value: string
}
type UnknownErrorInput = {
  error: unknown
}

export function buildSnapshot(payload: AwesomeRatePayload): ExchangeRatesSnapshot {
  const rates: Record<string, number> = {}
  let latestTimestamp = 0

  for (const [key, quote] of Object.entries(payload)) {
    const pair = parseCurrencyPair({ pairKey: key })
    if (!pair) {
      continue
    }

    const parsedQuote = parseRateQuote({ pair, quote })
    if (!parsedQuote) {
      continue
    }

    rates[buildPairKey(parsedQuote.pair)] = parsedQuote.bid
    latestTimestamp = Math.max(latestTimestamp, parsedQuote.timestamp)
  }

  return {
    updatedAt: latestTimestamp ? new Date(latestTimestamp).toISOString() : null,
    source: 'live',
    notice: null,
    rates,
  }
}

export function assertSnapshotHasRates(snapshot: ExchangeRatesSnapshot) {
  if (Object.keys(snapshot.rates).length === 0) {
    throw new Error('A AwesomeAPI nao retornou cotacoes validas para BRL, USD e EUR.')
  }
}

export function buildPairKey({ from, to }: PairKeyInput) {
  return `${from}_${to}`
}

export function extractErrorMessage({ error }: UnknownErrorInput) {
  return error instanceof Error ? error.message : 'Erro desconhecido ao consultar cotacoes.'
}

export function trimTrailingSlashes({ value }: RawUrlText) {
  let end = value.length
  while (end > 0 && value[end - 1] === '/') {
    end -= 1
  }

  return end === value.length ? value : value.slice(0, end)
}

function parseRateQuote({ pair, quote }: RateQuoteInput) {
  const bid = parsePositiveBid({ value: quote?.bid })

  if (bid === null) {
    return null
  }

  return {
    bid,
    pair,
    timestamp: parseQuoteTimestamp({ value: quote.create_date }),
  }
}

function parseCurrencyPair({ pairKey }: RawAwesomePairKey): CurrencyPair | null {
  const normalized = pairKey.replaceAll('-', '').toUpperCase()
  const from = normalizeCurrencyCode({ value: normalized.slice(0, 3) })
  const to = normalizeCurrencyCode({ value: normalized.slice(3, 6) })

  return from && to ? { from, to } : null
}

function parsePositiveBid({ value }: RawRateBid) {
  if (!value) {
    return null
  }

  const bid = Number.parseFloat(value)
  return Number.isFinite(bid) && bid > 0 ? bid : null
}

function normalizeCurrencyCode({ value }: CurrencyCodeCandidate): CurrencyCode | null {
  return SUPPORTED_CURRENCIES.find((currency) => currency === value) ?? null
}

function parseQuoteTimestamp({ value }: RawQuoteTimestamp) {
  const parsedDate = Date.parse(value.replace(' ', 'T'))
  return Number.isFinite(parsedDate) ? parsedDate : 0
}
