import { BadRequestException } from '@nestjs/common'

const productBarcodeLengths = new Set([8, 12, 13, 14])

export function normalizeProductBarcodeInput(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined
  }

  if (value === null) {
    return null
  }

  const normalized = String(value).replace(/\D/g, '')
  return normalized.length > 0 ? normalized : null
}

export function sanitizeProductBarcode(value: unknown, label = 'Codigo de barras'): string | null {
  const normalized = normalizeProductBarcodeInput(value)

  if (normalized == null) {
    return null
  }

  if (!productBarcodeLengths.has(normalized.length)) {
    throw new BadRequestException(`${label} precisa ter 8, 12, 13 ou 14 digitos.`)
  }

  return normalized
}

export function isValidProductBarcode(value: string) {
  return productBarcodeLengths.has(value.length)
}
