export function parseCurrencyInput(text: string): number | null {
  const cleaned = text
    .trim()
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
  if (!cleaned) {
    return null
  }

  const value = Number(cleaned)
  if (!Number.isFinite(value) || value < 0) {
    return null
  }

  return Math.round(value * 100) / 100
}
