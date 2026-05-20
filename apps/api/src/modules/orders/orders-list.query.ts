import { OrderStatus, type Prisma } from '@prisma/client'
import { resolveWorkspaceOwnerUserId } from '../../common/utils/workspace-access.util'
import { roundCurrency } from '../../common/utils/number-rounding.util'
import type { AuthContext } from '../auth/auth.types'
import type { ListOrdersQueryDto } from './dto/list-orders.query'
import { buildOrdersCacheKey, type OrdersCacheScope } from './orders-cache.utils'
import { toOrderRecord } from './orders.types'
import { orderListSelect, orderListWithItemsSelect, type OrdersServiceDependencies } from './orders-service.types'

type OrdersListInput = {
  auth: AuthContext
  query: ListOrdersQueryDto
}

type OrdersListResponse = {
  items: ReturnType<typeof toOrderRecord>[]
  totals: {
    completedOrders: number
    cancelledOrders: number
    realizedRevenue: number
    realizedProfit: number
    soldUnits: number
  }
}

export async function listOrdersForUser(deps: OrdersServiceDependencies, input: OrdersListInput) {
  const scope = resolveOrdersListScope(input)
  const cacheKey = buildOrdersCacheKey(scope)
  const cached = await deps.cache.get<OrdersListResponse>(cacheKey)

  if (cached) {
    return cached
  }

  const [snapshot, ordersData] = await Promise.all([deps.currencyService.getSnapshot(), loadOrdersData(deps, scope)])
  const result = buildOrdersListResponse(deps, input.auth, snapshot, ordersData)

  void deps.cache.set(cacheKey, result, 90)

  return result
}

function resolveOrdersListScope({ auth, query }: OrdersListInput): OrdersCacheScope {
  return {
    workspaceUserId: resolveWorkspaceOwnerUserId(auth),
    employeeScope: auth.role === 'STAFF' ? auth.employeeId : null,
    includeCancelled: query.includeCancelled ?? false,
    limit: query.limit ?? 10,
    includeItems: query.includeItems ?? false,
  }
}

async function loadOrdersData(deps: OrdersServiceDependencies, scope: OrdersCacheScope) {
  const where = buildListWhere(scope)
  const aggregateWhere = buildAggregateWhere(scope)

  const [orders, completedAgg, cancelledCount, soldUnitsAgg] = await Promise.all([
    deps.prisma.order.findMany({
      where,
      select: scope.includeItems ? orderListWithItemsSelect : orderListSelect,
      orderBy: { createdAt: 'desc' },
      take: scope.limit,
    }),
    deps.prisma.order.aggregate({
      where: {
        ...aggregateWhere,
        status: OrderStatus.COMPLETED,
      },
      _count: true,
      _sum: {
        totalRevenue: true,
        totalProfit: true,
        totalItems: true,
      },
    }),
    deps.prisma.order.count({
      where: {
        ...aggregateWhere,
        status: OrderStatus.CANCELLED,
      },
    }),
    deps.prisma.orderItem.aggregate({
      where: {
        order: {
          ...aggregateWhere,
          status: OrderStatus.COMPLETED,
        },
      },
      _sum: { quantity: true },
    }),
  ])

  return { orders, completedAgg, cancelledCount, soldUnitsAgg }
}

function buildListWhere(scope: OrdersCacheScope): Prisma.OrderWhereInput {
  return {
    ...buildAggregateWhere(scope),
    ...(scope.includeCancelled ? {} : { status: OrderStatus.COMPLETED }),
  }
}

function buildAggregateWhere(scope: OrdersCacheScope): Prisma.OrderWhereInput {
  return {
    userId: scope.workspaceUserId,
    ...(scope.employeeScope ? { employeeId: scope.employeeScope } : {}),
  }
}

function buildOrdersListResponse(
  deps: OrdersServiceDependencies,
  auth: AuthContext,
  snapshot: Awaited<ReturnType<OrdersServiceDependencies['currencyService']['getSnapshot']>>,
  data: Awaited<ReturnType<typeof loadOrdersData>>,
): OrdersListResponse {
  return {
    items: data.orders.map((order) =>
      toOrderRecord(order as Parameters<typeof toOrderRecord>[0], {
        displayCurrency: auth.preferredCurrency,
        currencyService: deps.currencyService,
        snapshot,
      }),
    ),
    totals: {
      completedOrders: data.completedAgg._count,
      cancelledOrders: data.cancelledCount,
      realizedRevenue: roundCurrency(Number(data.completedAgg._sum.totalRevenue ?? 0)),
      realizedProfit: roundCurrency(Number(data.completedAgg._sum.totalProfit ?? 0)),
      soldUnits: data.soldUnitsAgg._sum.quantity ?? 0,
    },
  }
}
