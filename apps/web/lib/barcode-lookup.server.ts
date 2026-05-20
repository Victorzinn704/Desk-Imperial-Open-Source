import { trimTrailingDecimalZeros } from '@contracts/contracts'
import {
  getNationalPackagedBeverageSource,
  resolveBrazilianPackagedBeverageMatch,
} from '@/lib/brazilian-packaged-beverage-catalog'
import type {
  Barcode,
  BarcodeLookupPayload,
  BarcodeLookupRequest,
  BarcodeLookupResult,
  BarcodeNormalizationInput,
  CategoryExtractionInput,
  DescriptionInput,
  EanPicturesResponse,
  ImageProxyInput,
  MeasurementUnit,
  OpenFoodFactsPayloadInput,
  OpenFoodFactsResponse,
  PackagingInferenceInput,
  QuantityExtractionInput,
  TextCandidatesInput,
} from '@/lib/barcode-lookup.types'

const OPEN_FOOD_FACTS_API_URL = (
  process.env.OPEN_FOOD_FACTS_API_URL ?? 'https://world.openfoodfacts.org/api/v2'
).replace(/\/$/, '')
const OPEN_FOOD_FACTS_USER_AGENT =
  process.env.OPEN_FOOD_FACTS_USER_AGENT ?? 'DeskImperial/1.0 (https://app.deskimperial.online)'
const EAN_PICTURES_API_URL = (process.env.EAN_PICTURES_API_URL ?? 'http://www.eanpictures.com.br:9000/api').replace(
  /\/$/,
  '',
)
const LOOKUP_TIMEOUT_MS = 6_000
const LOOKUP_CACHE_TTL_MS = 24 * 60 * 60 * 1000
const validBarcodeLengths = new Set([8, 12, 13, 14])
const openFoodFactsFields = [
  'product_name',
  'product_name_pt',
  'product_name_en',
  'generic_name',
  'brands',
  'categories',
  'categories_tags_en',
  'quantity',
  'packaging',
  'packaging_text',
  'packaging_text_pt',
  'serving_size',
  'image_front_small_url',
].join(',')

const quantityFallback = { measurementUnit: null, measurementValue: null, quantityLabel: null } as const
const measurementUnitAliases: Array<{ aliases: string[]; label: string; unit: MeasurementUnit }> = [
  { aliases: ['ml'], label: 'ml', unit: 'ML' },
  { aliases: ['l', 'lt', 'lts'], label: 'L', unit: 'L' },
  { aliases: ['g'], label: 'g', unit: 'G' },
  { aliases: ['kg'], label: 'kg', unit: 'KG' },
  { aliases: ['un', 'und', 'unid', 'unidade'], label: 'und', unit: 'UN' },
]
const packagingBaseMatchers: Array<{ label: string; matchers: string[] }> = [
  { label: 'Long neck', matchers: ['long neck'] },
  { label: 'Latao', matchers: ['latao', 'latão'] },
  { label: 'Lata', matchers: ['lata'] },
  { label: 'Garrafa', matchers: ['garrafa', 'pet'] },
  { label: 'Frasco', matchers: ['frasco'] },
  { label: 'Pacote', matchers: ['pacote'] },
  { label: 'Caixa', matchers: ['caixa'] },
  { label: 'Sache', matchers: ['sache', 'sachê'] },
  { label: 'Dose', matchers: ['dose'] },
]
const lookupCache = new Map<Barcode, { expiresAt: number; payload: BarcodeLookupPayload }>()

export async function lookupBarcodeCatalogPayload({
  barcode,
  requestUrl,
}: BarcodeLookupRequest): Promise<BarcodeLookupResult> {
  const cached = readLookupCache(barcode)
  if (cached) {
    return { ok: true, payload: cached }
  }

  const payload = await resolveBarcodePayload(barcode).catch(() => null)
  if (!payload) {
    return {
      message: 'Nao foi possivel consultar o catalogo por EAN agora. Tente novamente em instantes.',
      ok: false,
      status: 503,
    }
  }
  if (!hasUsefulPayload(payload)) {
    return { message: 'EAN encontrado, mas sem dados suficientes para pre-preenchimento.', ok: false, status: 404 }
  }

  const resolvedPayload = withProxiedImage({ payload, requestUrl })
  writeLookupCache(barcode, resolvedPayload)
  return { ok: true, payload: resolvedPayload }
}

export function normalizeBarcode({ value }: BarcodeNormalizationInput) {
  const digits = (value ?? '').replace(/\D/g, '')
  return validBarcodeLengths.has(digits.length) ? (digits as Barcode) : null
}

async function resolveBarcodePayload(barcode: Barcode) {
  const eanPicturesPayload = await lookupEanPictures(barcode)
  return eanPicturesPayload ?? lookupOpenFoodFacts(barcode)
}

async function lookupEanPictures(barcode: Barcode): Promise<BarcodeLookupPayload | null> {
  const response = await fetch(`${EAN_PICTURES_API_URL}/desc/${barcode}`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
  }).catch(() => null)
  if (!response?.ok) {
    return null
  }

  const payload = (await response.json().catch(() => null)) as EanPicturesResponse | null
  if (payload?.Status !== '200') {
    return null
  }

  const quantity = extractQuantity({ rawQuantity: payload.QuantidadeEmbalagem })
  return {
    barcode,
    brand: firstNonEmpty({ values: [payload.Marca] }),
    category: firstNonEmpty({ values: [payload.Categoria] }),
    description: null,
    imageUrl: `/api/barcode/image/eanpictures/${barcode}`,
    measurementUnit: quantity.measurementUnit,
    measurementValue: quantity.measurementValue,
    name: firstNonEmpty({ values: [payload.Nome] }),
    packagingClass: firstNonEmpty({ values: [payload.Embalagem, payload.QuantidadeEmbalagem] }),
    quantityLabel: quantity.quantityLabel,
    servingSize: null,
    source: 'ean_pictures',
  }
}

async function lookupOpenFoodFacts(barcode: Barcode): Promise<BarcodeLookupPayload | null> {
  const response = await fetch(
    `${OPEN_FOOD_FACTS_API_URL}/product/${barcode}.json?fields=${encodeURIComponent(openFoodFactsFields)}`,
    {
      cache: 'no-store',
      headers: { Accept: 'application/json', 'User-Agent': OPEN_FOOD_FACTS_USER_AGENT },
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    },
  )
  if (!response.ok) {
    return null
  }

  const payload = (await response.json()) as OpenFoodFactsResponse
  return payload.status === 1 && payload.product
    ? buildOpenFoodFactsPayload({ barcode, product: payload.product })
    : null
}

function buildOpenFoodFactsPayload({ barcode, product }: OpenFoodFactsPayloadInput): BarcodeLookupPayload {
  const name = firstNonEmpty({
    values: [product.product_name_pt, product.product_name, product.product_name_en, product.generic_name],
  })
  const brand = extractBrand(product.brands)
  const category = extractCategory({ rawCategories: product.categories, tagCategories: product.categories_tags_en })
  const quantity = extractQuantity({ rawQuantity: product.quantity })
  const packagingText = firstNonEmpty({
    values: [product.packaging_text_pt, product.packaging_text, product.packaging],
  })
  const packagingClass = inferPackagingClass({ name, packagingText, quantityLabel: quantity.quantityLabel })
  return {
    barcode,
    brand,
    category,
    description: buildDescription({ genericName: product.generic_name, productName: name }),
    imageUrl: firstNonEmpty({ values: [product.image_front_small_url] }),
    measurementUnit: quantity.measurementUnit,
    measurementValue: quantity.measurementValue,
    name,
    packagingClass,
    quantityLabel: quantity.quantityLabel,
    servingSize: firstNonEmpty({ values: [product.serving_size] }),
    source: resolveOpenFoodFactsSource({
      barcode,
      brand,
      category,
      name,
      packagingClass,
      quantityLabel: quantity.quantityLabel,
    }),
  }
}

function resolveOpenFoodFactsSource(input: {
  barcode: string
  brand: string | null
  category: string | null
  name: string | null
  packagingClass: string | null
  quantityLabel: string | null
}) {
  return resolveBrazilianPackagedBeverageMatch({ ...input, name: input.name ?? '' })
    ? getNationalPackagedBeverageSource()
    : 'open_food_facts'
}

function withProxiedImage({ payload, requestUrl }: ImageProxyInput): BarcodeLookupPayload {
  if (!payload.imageUrl?.startsWith('/')) {
    return payload
  }

  const parsedUrl = new URL(requestUrl)
  return parsedUrl.protocol === 'https:'
    ? { ...payload, imageUrl: new URL(payload.imageUrl, parsedUrl.origin).toString() }
    : payload
}

function readLookupCache(barcode: Barcode) {
  const cached = lookupCache.get(barcode)
  if (!cached) {
    return null
  }
  if (cached.expiresAt > Date.now()) {
    return cached.payload
  }

  lookupCache.delete(barcode)
  return null
}

function writeLookupCache(barcode: Barcode, payload: BarcodeLookupPayload) {
  lookupCache.set(barcode, { expiresAt: Date.now() + LOOKUP_CACHE_TTL_MS, payload })
}

function hasUsefulPayload(payload: BarcodeLookupPayload) {
  return Boolean(
    payload.name ||
    payload.brand ||
    payload.category ||
    payload.quantityLabel ||
    payload.packagingClass ||
    payload.description,
  )
}

function firstNonEmpty({ values }: TextCandidatesInput) {
  return values.map((value) => value?.trim()).find(Boolean) ?? null
}

function buildDescription({ genericName, productName }: DescriptionInput) {
  const normalizedGeneric = genericName?.trim()
  if (
    !normalizedGeneric ||
    (productName && normalizedGeneric.localeCompare(productName, 'pt-BR', { sensitivity: 'base' }) === 0)
  ) {
    return null
  }
  return normalizedGeneric
}

function extractBrand(value: string | undefined) {
  return (
    value
      ?.split(',')
      .map((entry) => entry.trim())
      .find(Boolean) || null
  )
}

function extractCategory({ rawCategories, tagCategories }: CategoryExtractionInput) {
  const directCategory = rawCategories
    ?.split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .at(-1)
  return directCategory || tagCategories?.map(normalizeCategoryTag).filter(Boolean).at(-1) || null
}

function normalizeCategoryTag(entry: string) {
  return entry.replace(/^en:/, '').replace(/-/g, ' ').trim()
}

function extractQuantity({ rawQuantity }: QuantityExtractionInput) {
  const normalized = rawQuantity?.trim().toLowerCase().replace(',', '.').replace(/\s+/g, '')
  if (!normalized) {
    return quantityFallback
  }

  const match = normalized.match(/^(\d+(?:\.\d+)?)(ml|l|lt|lts|g|kg|un|und|unid|unidade)s?$/i)
  const rawValue = match ? Number(match[1]) : Number.NaN
  if (!(match && Number.isFinite(rawValue) && rawValue > 0)) {
    return buildUnknownQuantity(rawQuantity)
  }

  const unitMetadata = resolveMeasurementUnit(match[2].toLowerCase())
  const formattedValue = Number.isInteger(rawValue) ? String(rawValue) : trimTrailingDecimalZeros(rawValue.toFixed(2))
  return {
    measurementUnit: unitMetadata.unit,
    measurementValue: rawValue,
    quantityLabel: `${formattedValue}${unitMetadata.label}`,
  }
}

function inferPackagingClass({ name, packagingText, quantityLabel }: PackagingInferenceInput) {
  const packagingBase = resolvePackagingBase(`${packagingText ?? ''} ${name ?? ''}`.toLowerCase())
  return [packagingBase, quantityLabel].filter(Boolean).join(' ') || packagingText || null
}

function buildUnknownQuantity(rawQuantity: string | undefined) {
  return { measurementUnit: null, measurementValue: null, quantityLabel: rawQuantity?.trim() ?? null }
}

function resolveMeasurementUnit(rawUnit: string) {
  return (
    measurementUnitAliases.find((entry) => entry.aliases.includes(rawUnit)) ??
    measurementUnitAliases[measurementUnitAliases.length - 1]
  )
}

function resolvePackagingBase(source: string) {
  return (
    packagingBaseMatchers.find((candidate) => candidate.matchers.some((matcher) => source.includes(matcher)))?.label ??
    null
  )
}
