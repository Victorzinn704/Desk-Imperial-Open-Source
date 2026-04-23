import { resolveProductCatalogMetadata, sanitizeProductCatalogImageUrl } from './products-catalog.util'

type DecimalLike = { toNumber(): number } | number | null | undefined

export type ProductCatalogBackfillInput = {
  name: string
  brand?: string | null
  measurementUnit?: string | null
  measurementValue?: DecimalLike
  quantityLabel?: string | null
  imageUrl?: string | null
  catalogSource?: string | null
}

export type ProductCatalogBackfillPatch = Partial<{
  brand: string | null
  quantityLabel: string | null
  imageUrl: string | null
  catalogSource: string
}>

export type ProductCatalogBackfillResult = {
  patch: ProductCatalogBackfillPatch
  invalidImageDropped: boolean
}

export function buildProductCatalogBackfillPatch(input: ProductCatalogBackfillInput): ProductCatalogBackfillResult {
  const normalizedImage = normalizeLegacyImageUrl(input.imageUrl)
  const metadata = resolveProductCatalogMetadata({
    ...input,
    imageUrl: normalizedImage.value,
  })

  const patch: ProductCatalogBackfillPatch = {}

  if (normalizeNullable(input.brand) !== metadata.brand) {
    patch.brand = metadata.brand
  }

  if (normalizeNullable(input.quantityLabel) !== metadata.quantityLabel) {
    patch.quantityLabel = metadata.quantityLabel
  }

  if (normalizeNullable(input.catalogSource) !== metadata.catalogSource) {
    patch.catalogSource = metadata.catalogSource
  }

  if (normalizeNullable(input.imageUrl) !== normalizedImage.value) {
    patch.imageUrl = normalizedImage.value
  }

  return {
    patch,
    invalidImageDropped: normalizedImage.invalidDropped,
  }
}

function normalizeLegacyImageUrl(value: string | null | undefined) {
  const normalized = value?.trim() || null

  if (!normalized) {
    return {
      value: null,
      invalidDropped: false,
    }
  }

  try {
    return {
      value: sanitizeProductCatalogImageUrl(normalized),
      invalidDropped: false,
    }
  } catch {
    return {
      value: null,
      invalidDropped: true,
    }
  }
}

function normalizeNullable(value: string | null | undefined) {
  const normalized = value?.trim()
  return normalized || null
}
