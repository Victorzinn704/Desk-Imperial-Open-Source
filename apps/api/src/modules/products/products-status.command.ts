import { ConflictException } from '@nestjs/common'
import { AuditSeverity } from '@prisma/client'
import { assertOwnerRole, resolveWorkspaceOwnerUserId } from '../../common/utils/workspace-access.util'
import type { RequestContext } from '../../common/utils/request-context.util'
import { resolveAuthActorUserId } from '../auth/auth-shared.util'
import type { AuthContext } from '../auth/auth.types'
import { toProductRecord } from './products-response.mapper'
import { type ProductsServiceDependencies, productWithComboInclude } from './products-service.types'
import { invalidateProductsCache, refreshProductsFinanceSummary, requireOwnedProduct } from './products-service.shared'

type ProductStatusInput = {
  auth: AuthContext
  productId: string
  context: RequestContext
}

export function archiveProductForUser(deps: ProductsServiceDependencies, input: ProductStatusInput) {
  return setProductActiveStateForUser(deps, { ...input, active: false })
}

export function restoreProductForUser(deps: ProductsServiceDependencies, input: ProductStatusInput) {
  return setProductActiveStateForUser(deps, { ...input, active: true })
}

export async function deleteProductForUser(deps: ProductsServiceDependencies, input: ProductStatusInput) {
  assertOwnerRole(input.auth, 'Apenas o dono pode excluir produtos.')
  const workspaceUserId = resolveWorkspaceOwnerUserId(input.auth)
  const existingProduct = await requireOwnedProduct(deps, workspaceUserId, input.productId)

  if (existingProduct.active) {
    throw new ConflictException('Arquive o produto antes de excluir em definitivo.')
  }

  await assertProductCanBeDeleted(deps, existingProduct.id)
  await deps.prisma.product.delete({ where: { id: existingProduct.id } })
  await deps.auditLogService.record({
    actorUserId: resolveAuthActorUserId(input.auth),
    event: 'product.deleted',
    resource: 'product',
    resourceId: existingProduct.id,
    severity: AuditSeverity.WARN,
    metadata: {
      name: existingProduct.name,
      category: existingProduct.category,
    },
    ipAddress: input.context.ipAddress,
    userAgent: input.context.userAgent,
  })

  refreshProductsFinanceSummary(deps, workspaceUserId)
  void invalidateProductsCache(deps, workspaceUserId)

  return {
    success: true,
    deletedProductId: existingProduct.id,
  }
}

async function setProductActiveStateForUser(
  deps: ProductsServiceDependencies,
  input: ProductStatusInput & { active: boolean },
) {
  assertOwnerRole(input.auth, 'Apenas o dono pode alterar o status dos produtos.')
  const workspaceUserId = resolveWorkspaceOwnerUserId(input.auth)
  const existingProduct = await requireOwnedProduct(deps, workspaceUserId, input.productId)

  await deps.prisma.product.update({
    where: { id: existingProduct.id },
    data: { active: input.active },
  })

  const product = await deps.prisma.product.findUniqueOrThrow({
    where: { id: existingProduct.id },
    include: productWithComboInclude,
  })

  await deps.auditLogService.record({
    actorUserId: resolveAuthActorUserId(input.auth),
    event: input.active ? 'product.restored' : 'product.archived',
    resource: 'product',
    resourceId: product.id,
    metadata: {
      name: product.name,
      active: input.active,
    },
    ipAddress: input.context.ipAddress,
    userAgent: input.context.userAgent,
  })

  refreshProductsFinanceSummary(deps, workspaceUserId)
  void invalidateProductsCache(deps, workspaceUserId)

  const snapshot = await deps.currencyService.getSnapshot()

  return {
    product: toProductRecord(product, {
      displayCurrency: input.auth.preferredCurrency,
      currencyService: deps.currencyService,
      snapshot,
    }),
  }
}

async function assertProductCanBeDeleted(deps: ProductsServiceDependencies, productId: string) {
  const combosUsingProduct = await deps.prisma.productComboItem.findMany({
    where: {
      componentProductId: productId,
    },
    select: {
      comboProduct: {
        select: {
          id: true,
          name: true,
          active: true,
        },
      },
    },
    take: 5,
  })

  if (combosUsingProduct.length === 0) {
    return
  }

  const comboNames = [...new Set(combosUsingProduct.map((item) => item.comboProduct.name).filter(Boolean))]
  throw new ConflictException(
    `Este produto ainda compõe ${comboNames.length > 1 ? 'combos' : 'um combo'}: ${comboNames.join(', ')}. Atualize ou remova esses combos antes de excluir em definitivo.`,
  )
}
