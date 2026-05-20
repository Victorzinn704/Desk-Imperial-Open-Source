import { CacheService } from '../../common/services/cache.service'
import type { OrdersServiceDependencies } from './orders-service.types'

export type OrdersCacheScope = {
  workspaceUserId: string
  employeeScope: string | null
  includeCancelled: boolean
  limit: number
  includeItems: boolean
}

export function buildOrdersCacheKey(scope: OrdersCacheScope) {
  const employeeScope = scope.employeeScope ? `employee:${scope.employeeScope}` : 'workspace'
  const statusScope = scope.includeCancelled ? 'cancelled' : 'completed'
  const detailScope = scope.includeItems ? 'full' : 'summary'

  return `${CacheService.ordersKey(scope.workspaceUserId)}:${employeeScope}:${statusScope}:${detailScope}:${scope.limit}`
}

export async function invalidateOrdersCache(deps: OrdersServiceDependencies, userId: string) {
  await Promise.all([
    deps.cache.del(CacheService.ordersKey(userId)),
    deps.cache.delByPrefix(`${CacheService.ordersKey(userId)}:`),
  ])
}

export function refreshOrdersFinanceSummary(deps: OrdersServiceDependencies, workspaceUserId: string) {
  if (deps.financeService) {
    void deps.financeService.invalidateAndWarmSummary(workspaceUserId)
    return
  }

  void deps.cache.del(CacheService.financeKey(workspaceUserId))
}
