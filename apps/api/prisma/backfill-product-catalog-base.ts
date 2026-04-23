import { Prisma, PrismaClient } from '@prisma/client'
import Redis from 'ioredis'
import { CacheService } from '../src/common/services/cache.service'
import { resolveRedisUrl } from '../src/common/utils/redis-url.util'
import { buildProductCatalogBackfillPatch } from '../src/modules/products/products-catalog-backfill.util'
import { loadSeedEnv } from './seed-runtime'

loadSeedEnv()

const prisma = new PrismaClient()
const BATCH_SIZE = 200

type ScriptOptions = {
  dryRun: boolean
  userId: string | null
}

async function main() {
  const options = parseOptions(process.argv.slice(2))
  const updatedUserIds = new Set<string>()
  const sampleChanges: Array<{ id: string; name: string; patch: Record<string, unknown> }> = []

  let cursor: string | null = null
  let scanned = 0
  let changed = 0
  let unchanged = 0
  let invalidImagesDropped = 0

  for (;;) {
    const products = await prisma.product.findMany({
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      where: {
        ...(options.userId ? { userId: options.userId } : {}),
        OR: [
          { brand: null },
          { brand: '' },
          { quantityLabel: null },
          { quantityLabel: '' },
          { catalogSource: null },
          { catalogSource: '' },
          { imageUrl: { not: null } },
        ],
      },
      orderBy: { id: 'asc' },
      select: {
        id: true,
        userId: true,
        name: true,
        brand: true,
        measurementUnit: true,
        measurementValue: true,
        quantityLabel: true,
        imageUrl: true,
        catalogSource: true,
      },
    })

    if (products.length === 0) {
      break
    }

    cursor = products[products.length - 1]?.id ?? null

    for (const product of products) {
      scanned += 1

      const result = buildProductCatalogBackfillPatch(product)
      const patchEntries = Object.entries(result.patch)

      if (result.invalidImageDropped) {
        invalidImagesDropped += 1
      }

      if (patchEntries.length === 0) {
        unchanged += 1
        continue
      }

      changed += 1
      updatedUserIds.add(product.userId)

      if (sampleChanges.length < 10) {
        sampleChanges.push({
          id: product.id,
          name: product.name,
          patch: result.patch,
        })
      }

      if (!options.dryRun) {
        await prisma.product.update({
          where: { id: product.id },
          data: result.patch,
        })
      }
    }
  }

  if (!options.dryRun && updatedUserIds.size > 0) {
    await invalidateSummaryCaches([...updatedUserIds])
  }

  console.log(options.dryRun ? 'Backfill em modo dry-run concluído.' : 'Backfill concluído.')
  console.log(`- Produtos lidos: ${scanned}`)
  console.log(`- Produtos atualizados: ${changed}`)
  console.log(`- Produtos sem mudança: ${unchanged}`)
  console.log(`- Imagens inválidas saneadas para null: ${invalidImagesDropped}`)
  console.log(`- Workspaces afetados: ${updatedUserIds.size}`)

  if (sampleChanges.length > 0) {
    console.log('- Amostra de mudanças:')
    for (const sample of sampleChanges) {
      console.log(`  • ${sample.id} | ${sample.name} -> ${JSON.stringify(sample.patch)}`)
    }
  }
}

function parseOptions(argv: string[]): ScriptOptions {
  let dryRun = false
  let userId: string | null = null

  for (const arg of argv) {
    if (arg === '--dry-run') {
      dryRun = true
      continue
    }

    if (arg.startsWith('--userId=')) {
      const value = arg.slice('--userId='.length).trim()
      userId = value || null
    }
  }

  return { dryRun, userId }
}

async function invalidateSummaryCaches(userIds: string[]) {
  const redisUrl = resolveRedisUrl(process.env)

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
      pipeline.del(CacheService.productsKey(userId, 'active'))
      pipeline.del(CacheService.productsKey(userId, 'all'))
      pipeline.del(CacheService.financeKey(userId))
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

main()
  .catch((error) => {
    console.error(formatScriptError(error))
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

function formatScriptError(error: unknown) {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return `Nao foi possivel conectar ao banco para o backfill. Verifique DATABASE_URL e suba o Postgres local antes de rodar o script.\nDetalhe: ${error.message}`
  }

  return error instanceof Error ? error.stack ?? error.message : String(error)
}
