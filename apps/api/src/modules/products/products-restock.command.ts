import { AuditSeverity } from '@prisma/client'
import { assertOwnerRole, resolveWorkspaceOwnerUserId } from '../../common/utils/workspace-access.util'
import type { RequestContext } from '../../common/utils/request-context.util'
import { resolveAuthActorUserId } from '../auth/auth-shared.util'
import type { AuthContext } from '../auth/auth.types'
import type { ProductsServiceDependencies } from './products-service.types'
import { invalidateProductsCache, refreshProductsFinanceSummary } from './products-service.shared'

const BULK_RESTOCK_TARGET_STOCK = 24
const BULK_RESTOCK_THRESHOLD_MULTIPLIER = 2

type BulkRestockInput = {
  auth: AuthContext
  dto: {
    mode?: 'low_stock' | 'all_active'
    targetStock?: number
  }
  context: RequestContext
}

type RestockProduct = {
  id: string
  name: string
  stock: number
  lowStockThreshold: number | null
}

type RestockPlan = {
  mode: 'low_stock' | 'all_active'
  targetStock: number
  updates: Array<{
    id: string
    name: string
    previousStock: number
    nextStock: number
  }>
}

export async function bulkRestockProductsForUser(deps: ProductsServiceDependencies, input: BulkRestockInput) {
  assertOwnerRole(input.auth, 'Apenas o dono pode reabastecer produtos em massa.')
  const workspaceUserId = resolveWorkspaceOwnerUserId(input.auth)
  const products = await loadActiveProducts(deps, workspaceUserId)
  const plan = buildRestockPlan(input.dto, products)

  if (plan.updates.length === 0) {
    return buildRestockResponse(plan, 0)
  }

  await persistRestockPlan(deps, plan)
  await recordBulkRestockAudit(deps, input, workspaceUserId, plan)
  refreshProductsFinanceSummary(deps, workspaceUserId)
  void invalidateProductsCache(deps, workspaceUserId)

  return buildRestockResponse(plan, plan.updates.length)
}

function loadActiveProducts(deps: ProductsServiceDependencies, workspaceUserId: string) {
  return deps.prisma.product.findMany({
    where: {
      userId: workspaceUserId,
      active: true,
    },
    select: {
      id: true,
      name: true,
      stock: true,
      lowStockThreshold: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
}

function buildRestockPlan(dto: BulkRestockInput['dto'], products: RestockProduct[]): RestockPlan {
  const mode = dto.mode ?? 'low_stock'
  const targetStock = Math.max(1, dto.targetStock ?? BULK_RESTOCK_TARGET_STOCK)
  const updates = products
    .filter((product) => shouldRestockProduct(product, mode, targetStock))
    .map((product) => ({
      id: product.id,
      name: product.name,
      previousStock: product.stock,
      nextStock: resolveDesiredStock(product, targetStock),
    }))

  return { mode, targetStock, updates }
}

function shouldRestockProduct(product: RestockProduct, mode: RestockPlan['mode'], targetStock: number) {
  if (mode === 'all_active') {
    return product.stock < resolveDesiredStock(product, targetStock)
  }

  return product.stock <= 0 || product.stock < targetStock || isUnderLowStockThreshold(product)
}

function isUnderLowStockThreshold(product: RestockProduct) {
  return product.lowStockThreshold != null && product.stock <= product.lowStockThreshold
}

function resolveDesiredStock(product: RestockProduct, targetStock: number) {
  return Math.max(
    targetStock,
    product.lowStockThreshold != null ? product.lowStockThreshold * BULK_RESTOCK_THRESHOLD_MULTIPLIER : 0,
  )
}

async function persistRestockPlan(deps: ProductsServiceDependencies, plan: RestockPlan) {
  await deps.prisma.$transaction(
    plan.updates.map((product) =>
      deps.prisma.product.update({
        where: { id: product.id },
        data: { stock: product.nextStock },
      }),
    ),
  )
}

async function recordBulkRestockAudit(
  deps: ProductsServiceDependencies,
  input: BulkRestockInput,
  workspaceUserId: string,
  plan: RestockPlan,
) {
  await deps.auditLogService.record({
    actorUserId: resolveAuthActorUserId(input.auth),
    event: 'product.bulk_restocked',
    resource: 'product',
    resourceId: workspaceUserId,
    metadata: {
      mode: plan.mode,
      targetStock: plan.targetStock,
      updatedCount: plan.updates.length,
      productIds: plan.updates.map((product) => product.id),
    },
    severity: AuditSeverity.INFO,
    ipAddress: input.context.ipAddress,
    userAgent: input.context.userAgent,
  })
}

function buildRestockResponse(plan: RestockPlan, updatedCount: number) {
  return {
    summary: {
      mode: plan.mode,
      targetStock: plan.targetStock,
      matchedCount: plan.updates.length,
      updatedCount,
    },
    products: plan.updates,
  }
}
