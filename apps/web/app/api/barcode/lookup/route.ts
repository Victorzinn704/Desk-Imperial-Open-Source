import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { trimTrailingDecimalZeros } from '@contracts/contracts'
import {
  getNationalPackagedBeverageSource,
  resolveBrazilianPackagedBeverageMatch,
} from '@/lib/brazilian-packaged-beverage-catalog'
import { resolveApiBaseUrl } from '@/lib/api-base-url'

export const dynamic = 'force-dynamic'

const OPEN_FOOD_FACTS_API_URL = (
  process.env.OPEN_FOOD_FACTS_API_URL ?? 'https://world.openfoodfacts.org/api/v2'
).replace(/\/$/, '')
const OPEN_FOOD_FACTS_USER_AGENT =
  process.env.OPEN_FOOD_FACTS_USER_AGENT ?? 'DeskImperial/1.0 (https://app.deskimperial.online)'
const LOOKUP_TIMEOUT_MS = 6_000
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

type OpenFoodFactsProduct = {
  product_name?: string
  product_name_pt?: string
  product_name_en?: string
  generic_name?: string
  brands?: string
  categories?: string
  categories_tags_en?: string[]
  quantity?: string
  packaging?: string
  packaging_text?: string
  packaging_text_pt?: string
  serving_size?: string
  image_front_small_url?: string
}

type OpenFoodFactsResponse = {
  status?: number
  product?: OpenFoodFactsProduct
}

type MeasurementUnit = 'ML' | 'L' | 'G' | 'KG' | 'UN'

const quantityFallback = {
  quantityLabel: null,
  measurementUnit: null,
  measurementValue: null,
} as const

const measurementUnitAliases: Array<{
  aliases: string[]
  label: string
  unit: MeasurementUnit
}> = [
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

export async function POST(request: Request) {
  const sessionStatus = await resolveSessionStatus()
  if (sessionStatus === 'missing' || sessionStatus === 'invalid') {
    return NextResponse.json({ message: 'Sessao autenticada obrigatoria para consultar EAN.' }, { status: 401 })
  }
  if (sessionStatus === 'unavailable') {
    return NextResponse.json(
      { message: 'Nao foi possivel validar a sessao agora. Verifique se a API local esta ativa.' },
      { status: 503 },
    )
  }

  const body = (await request.json().catch(() => null)) as { barcode?: string } | null
  const normalizedBarcode = normalizeBarcode(body?.barcode)

  if (!normalizedBarcode) {
    return NextResponse.json({ message: 'Informe um EAN valido com 8, 12, 13 ou 14 digitos.' }, { status: 400 })
  }

  try {
    const response = await fetch(
      `${OPEN_FOOD_FACTS_API_URL}/product/${normalizedBarcode}.json?fields=${encodeURIComponent(openFoodFactsFields)}`,
      {
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          'User-Agent': OPEN_FOOD_FACTS_USER_AGENT,
        },
        signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
      },
    )

    if (!response.ok) {
      return NextResponse.json(
        { message: 'Nao foi possivel consultar o catalogo por EAN agora. Tente novamente em instantes.' },
        { status: 503 },
      )
    }

    const payload = (await response.json()) as OpenFoodFactsResponse
    if (payload.status !== 1 || !payload.product) {
      return NextResponse.json({ message: 'EAN nao encontrado na base externa no momento.' }, { status: 404 })
    }

    const product = payload.product
    const name = firstNonEmpty([
      product.product_name_pt,
      product.product_name,
      product.product_name_en,
      product.generic_name,
    ])
    const description = buildDescription(product.generic_name, name)
    const brand = extractBrand(product.brands)
    const category = extractCategory(product.categories, product.categories_tags_en)
    const quantity = extractQuantity(product.quantity)
    const packagingText = firstNonEmpty([product.packaging_text_pt, product.packaging_text, product.packaging])
    const packagingClass = inferPackagingClass(name, packagingText, quantity.quantityLabel)

    if (!(name || brand || category || quantity.quantityLabel || packagingClass || description)) {
      return NextResponse.json(
        { message: 'EAN encontrado, mas sem dados suficientes para pre-preenchimento.' },
        { status: 404 },
      )
    }

    const nationalBeverageMatch = resolveBrazilianPackagedBeverageMatch({
      barcode: normalizedBarcode,
      name: name ?? '',
      brand,
      category,
      packagingClass,
      quantityLabel: quantity.quantityLabel,
    })

    return NextResponse.json({
      barcode: normalizedBarcode,
      name,
      description,
      brand,
      category,
      quantityLabel: quantity.quantityLabel,
      measurementUnit: quantity.measurementUnit,
      measurementValue: quantity.measurementValue,
      packagingClass,
      servingSize: firstNonEmpty([product.serving_size]),
      imageUrl: firstNonEmpty([product.image_front_small_url]),
      source: nationalBeverageMatch ? getNationalPackagedBeverageSource() : 'open_food_facts',
    })
  } catch {
    return NextResponse.json(
      { message: 'Nao foi possivel consultar o catalogo por EAN agora. Tente novamente em instantes.' },
      { status: 503 },
    )
  }
}

async function resolveSessionStatus(): Promise<'active' | 'invalid' | 'missing' | 'unavailable'> {
  const requestHeaders = await headers()
  const cookie = requestHeaders.get('cookie')
  if (!cookie) {
    return 'missing'
  }

  try {
    const API_BASE_URL = resolveApiBaseUrl()
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        cookie,
      },
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    })

    return response.ok ? 'active' : 'invalid'
  } catch {
    return 'unavailable'
  }
}

function normalizeBarcode(value: string | undefined) {
  const digits = (value ?? '').replace(/\D/g, '')
  return validBarcodeLengths.has(digits.length) ? digits : null
}

function firstNonEmpty(values: Array<string | undefined>) {
  for (const value of values) {
    const normalized = value?.trim()
    if (normalized) {
      return normalized
    }
  }

  return null
}

function buildDescription(genericName: string | undefined, productName: string | null) {
  const normalizedGeneric = genericName?.trim()
  if (!normalizedGeneric) {
    return null
  }

  if (productName && normalizedGeneric.localeCompare(productName, 'pt-BR', { sensitivity: 'base' }) === 0) {
    return null
  }

  return normalizedGeneric
}

function extractBrand(value: string | undefined) {
  const firstBrand = value
    ?.split(',')
    .map((entry) => entry.trim())
    .find(Boolean)

  return firstBrand || null
}

function extractCategory(rawCategories: string | undefined, tagCategories: string[] | undefined) {
  const directCategory = rawCategories
    ?.split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .at(-1)

  if (directCategory) {
    return directCategory
  }

  const tagCategory = tagCategories
    ?.map((entry) => entry.replace(/^en:/, '').replace(/-/g, ' ').trim())
    .filter(Boolean)
    .at(-1)

  return tagCategory || null
}

function extractQuantity(rawQuantity: string | undefined) {
  const normalized = rawQuantity?.trim().toLowerCase().replace(',', '.').replace(/\s+/g, '')
  if (!normalized) {
    return quantityFallback
  }

  const match = normalized.match(/^(\d+(?:\.\d+)?)(ml|l|lt|lts|g|kg|un|und|unid|unidade)s?$/i)
  if (!match) {
    return buildUnknownQuantity(rawQuantity)
  }

  const rawValue = Number(match[1])
  if (!Number.isFinite(rawValue) || rawValue <= 0) {
    return buildUnknownQuantity(rawQuantity)
  }

  const unitMetadata = resolveMeasurementUnit(match[2].toLowerCase())
  const formattedValue = Number.isInteger(rawValue) ? String(rawValue) : trimTrailingDecimalZeros(rawValue.toFixed(2))

  return {
    quantityLabel: `${formattedValue}${unitMetadata.label}`,
    measurementUnit: unitMetadata.unit,
    measurementValue: rawValue,
  }
}

function inferPackagingClass(name: string | null, packagingText: string | null, quantityLabel: string | null) {
  const source = `${packagingText ?? ''} ${name ?? ''}`.toLowerCase()
  const packagingBase = resolvePackagingBase(source)

  if (packagingBase && quantityLabel) {
    return `${packagingBase} ${quantityLabel}`
  }

  if (packagingBase) {
    return packagingBase
  }

  if (quantityLabel) {
    return quantityLabel
  }

  return packagingText || null
}

function buildUnknownQuantity(rawQuantity: string | undefined) {
  return {
    quantityLabel: rawQuantity?.trim() ?? null,
    measurementUnit: null,
    measurementValue: null,
  }
}

function resolveMeasurementUnit(rawUnit: string) {
  const unitMetadata = measurementUnitAliases.find((entry) => entry.aliases.includes(rawUnit))
  return unitMetadata ?? measurementUnitAliases.at(-1)!
}

function resolvePackagingBase(source: string) {
  for (const candidate of packagingBaseMatchers) {
    if (candidate.matchers.some((matcher) => source.includes(matcher))) {
      return candidate.label
    }
  }

  return null
}
