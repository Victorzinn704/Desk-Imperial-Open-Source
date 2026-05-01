import { BadRequestException } from '@nestjs/common'
import { trimTrailingDecimalZeros } from '@contracts/contracts'

type DecimalLike = { toNumber(): number } | number | null | undefined

type ProductCatalogMetadataInput = {
  name: string
  brand?: string | null
  measurementUnit?: string | null
  measurementValue?: DecimalLike
  quantityLabel?: string | null
  imageUrl?: string | null
  catalogSource?: string | null
}

type ProductCatalogMetadata = {
  brand: string | null
  quantityLabel: string | null
  imageUrl: string | null
  catalogSource: string
}

const MANUAL_PRODUCT_CATALOG_SOURCE = 'manual'

const KNOWN_PRODUCT_BRANDS = [
  { brand: 'Guarana Antarctica', aliases: ['guarana antarctica', 'guarana antartica'] },
  { brand: 'Coca-Cola', aliases: ['coca cola', 'coca-cola', 'coke'] },
  { brand: 'Guaravita', aliases: ['guaravita'] },
  { brand: 'Heineken', aliases: ['heineken'] },
  { brand: 'Brahma', aliases: ['brahma'] },
  { brand: 'Antarctica', aliases: ['antarctica', 'antartica'] },
  { brand: 'Budweiser', aliases: ['budweiser', 'bud'] },
  { brand: 'Stella Artois', aliases: ['stella artois', 'stella'] },
  { brand: 'Spaten', aliases: ['spaten'] },
  { brand: 'Corona', aliases: ['corona'] },
  { brand: 'Original', aliases: ['original'] },
  { brand: 'Amstel', aliases: ['amstel'] },
  { brand: 'Skol', aliases: ['skol'] },
  { brand: 'Fanta', aliases: ['fanta'] },
  { brand: 'Sprite', aliases: ['sprite'] },
  { brand: 'Pepsi', aliases: ['pepsi'] },
  { brand: 'Agua Mineral', aliases: ['agua mineral'] },
] as const

export function sanitizeProductCatalogImageUrl(value: string | null | undefined, label = 'Imagem do catalogo') {
  const normalized = value?.trim()

  if (!normalized) {
    return null
  }

  try {
    const url = new URL(normalized)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('unsupported protocol')
    }

    return url.toString()
  } catch {
    throw new BadRequestException(`${label} precisa ser uma URL http(s) valida.`)
  }
}

export function resolveProductCatalogMetadata(input: ProductCatalogMetadataInput): ProductCatalogMetadata {
  return {
    brand: inferProductBrand(input.name, input.brand),
    quantityLabel: resolveProductQuantityLabel(input.quantityLabel, input.measurementUnit, input.measurementValue),
    imageUrl: input.imageUrl?.trim() || null,
    catalogSource: resolveProductCatalogSource(input.catalogSource),
  }
}

export function resolveProductCatalogSource(value: string | null | undefined) {
  const normalized = value?.trim()
  return normalized || MANUAL_PRODUCT_CATALOG_SOURCE
}

export function inferProductBrand(name: string, explicitBrand?: string | null) {
  const normalizedExplicitBrand = explicitBrand?.trim()
  if (normalizedExplicitBrand) {
    return normalizedExplicitBrand
  }

  const haystack = normalizeText(name)
  if (!haystack) {
    return null
  }

  const matchedBrand = KNOWN_PRODUCT_BRANDS.find((entry) =>
    entry.aliases.some((alias) => haystack.includes(normalizeText(alias))),
  )

  return matchedBrand?.brand ?? null
}

export function resolveProductQuantityLabel(
  explicitQuantityLabel: string | null | undefined,
  measurementUnit: string | null | undefined,
  measurementValue: DecimalLike,
) {
  const normalizedQuantityLabel = explicitQuantityLabel?.trim()
  if (normalizedQuantityLabel) {
    return normalizedQuantityLabel
  }

  const normalizedUnit = measurementUnit?.trim().toUpperCase()
  const numericValue = toNumber(measurementValue)
  if (!(normalizedUnit && Number.isFinite(numericValue)) || numericValue <= 0) {
    return null
  }

  const formattedValue = Number.isInteger(numericValue)
    ? String(numericValue)
    : trimTrailingDecimalZeros(numericValue.toFixed(2))

  switch (normalizedUnit) {
    case 'ML':
      return `${formattedValue}ml`
    case 'L':
      return `${formattedValue}L`
    case 'G':
      return `${formattedValue}g`
    case 'KG':
      return `${formattedValue}kg`
    case 'UN':
      return `${formattedValue} und`
    default:
      return null
  }
}

function toNumber(value: DecimalLike) {
  if (value == null) {
    return Number.NaN
  }

  return typeof value === 'number' ? value : value.toNumber()
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}
