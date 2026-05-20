import { ConflictException, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { CacheService } from '../../common/services/cache.service'
import type { ProductsServiceDependencies } from './products-service.types'

export async function invalidateProductsCache(deps: ProductsServiceDependencies, userId: string) {
  await Promise.all([
    deps.cache.del(CacheService.productsKey(userId, 'active')),
    deps.cache.del(CacheService.productsKey(userId, 'all')),
  ])
}

export function refreshProductsFinanceSummary(deps: ProductsServiceDependencies, workspaceUserId: string) {
  if (deps.financeService) {
    void deps.financeService.invalidateAndWarmSummary(workspaceUserId)
    return
  }

  void deps.cache.del(CacheService.financeKey(workspaceUserId))
}

export async function requireOwnedProduct(deps: ProductsServiceDependencies, userId: string, productId: string) {
  const product = await deps.prisma.product.findFirst({
    where: { id: productId, userId },
  })

  if (!product) {
    throw new NotFoundException('Produto nao encontrado para este usuario.')
  }

  return product
}

export function handleProductConflict(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new ConflictException('Ja existe um produto com este nome ou codigo de barras para a sua conta.')
  }

  throw error
}
