import { AuditSeverity } from '@prisma/client'
import type { PrismaService } from '../../database/prisma.service'
import { CacheService } from '../../common/services/cache.service'
import type { AuditLogService } from '../monitoring/audit-log.service'
import type { OperationsHelpersService } from './operations-helpers.service'
import type { OperationsResponseOptionsDto } from './dto/operations-response-options.dto'
import { toComandaRecord } from './operations.types'
import { buildOptionalOperationsSnapshot } from './operations-domain.utils'

export async function buildComandaResponse(
  helpers: OperationsHelpersService,
  workspaceOwnerUserId: string,
  businessDate: Date,
  comanda: Parameters<typeof toComandaRecord>[0],
  options?: OperationsResponseOptionsDto,
) {
  return {
    comanda: toComandaRecord(comanda),
    ...(await buildOptionalOperationsSnapshot(helpers, workspaceOwnerUserId, businessDate, options)),
  }
}

export async function checkLowStockAfterClose(
  prisma: PrismaService,
  auditLogService: AuditLogService,
  actorUserId: string,
  workspaceOwnerUserId: string,
  items: Array<{ productId: string | null; productName: string }>,
) {
  const productIds = [...new Set(items.map((i) => i.productId).filter(Boolean))] as string[]
  if (!productIds.length) {
    return
  }

  const products =
    (await prisma.product.findMany({
      where: {
        id: { in: productIds },
        userId: workspaceOwnerUserId,
        lowStockThreshold: { not: null },
      },
      select: { id: true, name: true, stock: true, lowStockThreshold: true },
    })) ?? []

  for (const product of products) {
    if (product.lowStockThreshold != null && product.stock <= product.lowStockThreshold) {
      void auditLogService.record({
        actorUserId,
        event: 'product.stock.low',
        resource: 'product',
        resourceId: product.id,
        severity: AuditSeverity.WARN,
        metadata: {
          name: product.name,
          stock: product.stock,
          lowStockThreshold: product.lowStockThreshold,
        },
      })
    }
  }
}

export function invalidateLiveSnapshotCache(
  cache: CacheService,
  workspaceOwnerUserId: string,
  businessDate: Date,
) {
  const cacheKey = CacheService.operationsLiveKey(workspaceOwnerUserId, businessDate.toISOString(), false)
  void cache.del(cacheKey)
}
