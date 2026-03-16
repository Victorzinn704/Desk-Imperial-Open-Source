import type { CurrencyCode } from '@prisma/client'

export const SUPPORTED_CURRENCIES = ['BRL', 'USD', 'EUR'] as const satisfies CurrencyCode[]

export const DEFAULT_CURRENCY: CurrencyCode = 'BRL'

export const DEFAULT_EXCHANGE_PAIRS = [
  'USD-BRL',
  'EUR-BRL',
  'BRL-USD',
  'BRL-EUR',
  'USD-EUR',
  'EUR-USD',
] as const

export const DEFAULT_FALLBACK_USD_BRL = 5.5
export const DEFAULT_FALLBACK_EUR_BRL = 6
