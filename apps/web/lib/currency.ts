import type { CurrencyCode } from '@contracts/contracts'

export const currencyOptions: Array<{ label: string; value: CurrencyCode }> = [
  { value: 'BRL', label: 'Real brasileiro (BRL)' },
  { value: 'USD', label: 'Dolar americano (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
]

export function formatCurrency(value: number, currency: CurrencyCode) {
  return new Intl.NumberFormat(localeByCurrency[currency], {
    style: 'currency',
    currency,
  }).format(value)
}

export function formatCurrencyComparison(options: {
  originalValue: number
  originalCurrency: CurrencyCode
  convertedValue: number
  displayCurrency: CurrencyCode
}) {
  const original = formatCurrency(options.originalValue, options.originalCurrency)
  if (options.originalCurrency === options.displayCurrency) {
    return {
      primary: original,
      secondary: null,
    }
  }

  return {
    primary: original,
    secondary: `aprox. ${formatCurrency(options.convertedValue, options.displayCurrency)}`,
  }
}

export function formatCompactCurrency(value: number, currency: CurrencyCode) {
  return new Intl.NumberFormat(localeByCurrency[currency], {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

const localeByCurrency: Record<CurrencyCode, string> = {
  BRL: 'pt-BR',
  USD: 'en-US',
  EUR: 'de-DE',
}

/**
 * Convenience shorthand for `formatCurrency(value, 'BRL')`.
 * Centralizes 8+ scattered inline `fmtBRL` helpers across the codebase.
 */
export function formatBRL(value: number): string {
  const safeValue = Number.isFinite(value) ? value : 0
  return safeValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
