/* global process, console, URL, fetch, setTimeout */

import Redis from 'ioredis'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const DEFAULT_BATCH_SIZE = 50
const DEFAULT_DELAY_MS = 450
const PEXELS_API_URL = (process.env.PEXELS_API_URL?.trim() || 'https://api.pexels.com/v1').replace(/\/$/, '')
const PEXELS_API_KEY = process.env.PEXELS_API_KEY?.trim()

const COMBO_KEYWORDS = ['combo', 'combos', 'kit', 'balde', 'petisco', 'promocao', 'promoção']
const PREPARED_DRINK_KEYWORDS = ['drink', 'drinks', 'coquetel', 'coqueteis', 'cocktail', 'caipirinha', 'gin']
const FOOD_KEYWORDS = [
  'pizza',
  'burger',
  'hamb',
  'lanche',
  'batata',
  'porção',
  'porcao',
  'petisco',
  'pastel',
  'prato',
  'sobremesa',
  'açaí',
  'acai',
  'sanduíche',
  'sanduiche',
  'poke',
]
const PACKAGED_BEVERAGE_KEYWORDS = [
  'cerveja',
  'refrigerante',
  'água',
  'agua',
  'energético',
  'energetico',
  'suco',
  'chá',
  'cha',
  'lata',
  'garrafa',
  'long neck',
]
const BEER_SNACK_COMBO_KEYWORDS = ['cerveja', 'beer', 'chopp', 'petisco', 'porcao', 'porção', 'futebol']
const BURGER_COMBO_KEYWORDS = ['burger', 'hamb', 'lanche', 'batata']
const PIZZA_COMBO_KEYWORDS = ['pizza', 'calabresa', 'mussarela', 'pepperoni']

async function main() {
  const options = parseOptions(process.argv.slice(2))

  if (!PEXELS_API_KEY) {
    throw new Error('PEXELS_API_KEY ainda não foi configurada no runtime.')
  }

  const products = await prisma.product.findMany({
    take: options.limit,
    where: {
      ...(options.userId ? { userId: options.userId } : {}),
      ...(options.includeInactive ? {} : { active: true }),
    },
    orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
    select: {
      id: true,
      userId: true,
      name: true,
      brand: true,
      category: true,
      packagingClass: true,
      quantityLabel: true,
      isCombo: true,
      active: true,
      imageUrl: true,
      catalogSource: true,
    },
  })

  let scanned = 0
  let eligible = 0
  let updated = 0
  let skipped = 0
  let failed = 0
  const affectedUsers = new Set()
  const sampleChanges = []

  for (const product of products) {
    scanned += 1

    if (!shouldProcessProduct(product, options.mode)) {
      skipped += 1
      continue
    }

    const query = buildProductImageSearchQuery(product)
    if (!query) {
      skipped += 1
      continue
    }

    eligible += 1

    try {
      const imageUrl = await searchPexelsImage(query)
      if (!imageUrl) {
        skipped += 1
        continue
      }

      if (sampleChanges.length < 15) {
        sampleChanges.push({
          id: product.id,
          name: product.name,
          previousSource: product.catalogSource,
          nextImageUrl: imageUrl,
        })
      }

      if (options.apply) {
        await prisma.product.update({
          where: { id: product.id },
          data: {
            imageUrl,
            catalogSource: 'pexels',
          },
        })
        affectedUsers.add(product.userId)
      }

      updated += 1
    } catch (error) {
      failed += 1
      console.warn(
        `Falha ao enriquecer ${product.id} | ${product.name}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }

    await sleep(options.delayMs)
  }

  if (options.apply && affectedUsers.size > 0) {
    await invalidateSummaryCaches([...affectedUsers])
  }

  console.log(options.apply ? 'Backfill Pexels aplicado.' : 'Backfill Pexels em modo dry-run.')
  console.log(`- Produtos lidos: ${scanned}`)
  console.log(`- Produtos elegíveis: ${eligible}`)
  console.log(`- Produtos atualizados: ${updated}`)
  console.log(`- Produtos pulados: ${skipped}`)
  console.log(`- Produtos com falha: ${failed}`)
  console.log(`- Workspaces afetados: ${affectedUsers.size}`)

  if (sampleChanges.length > 0) {
    console.log('- Amostra de mudanças:')
    for (const sample of sampleChanges) {
      console.log(
        `  • ${sample.id} | ${sample.name} | ${sample.previousSource ?? 'sem-origem'} -> ${sample.nextImageUrl}`,
      )
    }
  }
}

function parseOptions(argv) {
  let apply = false
  let userId = null
  let limit = DEFAULT_BATCH_SIZE
  let delayMs = DEFAULT_DELAY_MS
  let includeInactive = false
  let mode = 'missing-only'

  for (const arg of argv) {
    if (arg === '--apply') {
      apply = true
      continue
    }

    if (arg === '--include-inactive') {
      includeInactive = true
      continue
    }

    if (arg.startsWith('--userId=')) {
      userId = arg.slice('--userId='.length).trim() || null
      continue
    }

    if (arg.startsWith('--limit=')) {
      const parsed = Number(arg.slice('--limit='.length))
      if (Number.isFinite(parsed) && parsed > 0) {
        limit = Math.min(parsed, 500)
      }
      continue
    }

    if (arg.startsWith('--delayMs=')) {
      const parsed = Number(arg.slice('--delayMs='.length))
      if (Number.isFinite(parsed) && parsed >= 0) {
        delayMs = parsed
      }
      continue
    }

    if (arg.startsWith('--mode=')) {
      const value = arg.slice('--mode='.length).trim()
      if (value === 'missing-only' || value === 'refresh-pexels') {
        mode = value
      }
    }
  }

  return { apply, delayMs, includeInactive, limit, mode, userId }
}

function shouldProcessProduct(product, mode) {
  const normalizedSource = normalizeNullable(product.catalogSource)
  const hasImage = Boolean(normalizeNullable(product.imageUrl))

  if (mode === 'missing-only') {
    return !hasImage
  }

  if (mode === 'refresh-pexels') {
    return !hasImage || normalizedSource === 'pexels'
  }

  return false
}

function buildProductImageSearchQuery(product) {
  const name = product.name.trim()
  if (!name) {
    return null
  }

  const haystack = normalize(`${product.name} ${product.brand ?? ''} ${product.category} ${product.packagingClass}`)

  if (product.isCombo || containsAny(haystack, COMBO_KEYWORDS)) {
    if (containsAny(haystack, BEER_SNACK_COMBO_KEYWORDS)) {
      return 'petisco cerveja bar'
    }

    if (containsAny(haystack, BURGER_COMBO_KEYWORDS)) {
      return `${name} hamburguer combo restaurante`
    }

    if (containsAny(haystack, PIZZA_COMBO_KEYWORDS)) {
      return `${name} pizza combo restaurante`
    }

    return `${name} comida combo restaurante`
  }

  if (isPackagedBeverageLike(product)) {
    return null
  }

  if (containsAny(haystack, PREPARED_DRINK_KEYWORDS)) {
    return `${name} drink bar`
  }

  if (containsAny(haystack, FOOD_KEYWORDS)) {
    return `${name} comida restaurante`
  }

  if (product.category.trim()) {
    return `${name} ${product.category.trim()} restaurante`
  }

  return `${name} produto restaurante`
}

function isPackagedBeverageLike(product) {
  const haystack = normalize(
    `${product.name} ${product.brand ?? ''} ${product.category} ${product.packagingClass} ${product.quantityLabel ?? ''}`,
  )

  if (product.isCombo || containsAny(haystack, COMBO_KEYWORDS)) {
    return false
  }

  return containsAny(haystack, PACKAGED_BEVERAGE_KEYWORDS)
}

function containsAny(haystack, keywords) {
  return keywords.some((keyword) => haystack.includes(normalize(keyword)))
}

function normalize(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

async function searchPexelsImage(query) {
  const searchUrl = new URL(`${PEXELS_API_URL}/search`)
  searchUrl.searchParams.set('query', query)
  searchUrl.searchParams.set('per_page', '1')
  searchUrl.searchParams.set('orientation', 'landscape')
  searchUrl.searchParams.set('size', 'medium')
  searchUrl.searchParams.set('locale', 'pt-BR')

  const response = await fetch(searchUrl, {
    headers: {
      Authorization: PEXELS_API_KEY,
    },
  })

  if (!response.ok) {
    const details = await safeReadText(response)
    throw new Error(details || `Pexels respondeu ${response.status}.`)
  }

  const payload = await response.json()
  const imageUrl = payload?.photos?.[0]?.src?.large
  return sanitizeHttpImageUrl(imageUrl)
}

async function safeReadText(response) {
  try {
    return (await response.text()).trim()
  } catch {
    return ''
  }
}

function sanitizeHttpImageUrl(value) {
  const normalized = value?.trim()
  if (!normalized) {
    return null
  }

  const url = new URL(normalized)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Imagem do Pexels precisa ser uma URL http(s) valida.')
  }

  return url.toString()
}

function resolveRedisUrl() {
  return (
    process.env.REDIS_URL?.trim() ||
    process.env.REDIS_PRIVATE_URL?.trim() ||
    process.env.REDIS_PUBLIC_URL?.trim() ||
    null
  )
}

async function invalidateSummaryCaches(userIds) {
  const redisUrl = resolveRedisUrl()

  if (!redisUrl) {
    console.log('- Redis não configurado. Invalidação de cache pulada.')
    return
  }

  const redis = new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    connectTimeout: 3000,
    enableOfflineQueue: false,
  })

  try {
    await redis.connect()
    const pipeline = redis.pipeline()

    for (const userId of userIds) {
      pipeline.del(`products:list:${userId}:active`)
      pipeline.del(`products:list:${userId}:all`)
      pipeline.del(`finance:summary:${userId}`)
    }

    await pipeline.exec()
    console.log(`- Cache invalidado para ${userIds.length} workspace(s).`)
  } catch (error) {
    console.warn(
      `- Falha ao invalidar cache Redis após o backfill: ${error instanceof Error ? error.message : String(error)}`,
    )
  } finally {
    await redis.quit().catch(() => undefined)
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function normalizeNullable(value) {
  const normalized = value?.trim()
  return normalized || null
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? (error.stack ?? error.message) : String(error))
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
