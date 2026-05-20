import type { OrderRecord } from '@contracts/contracts'
import { groupOrdersByDay, isSameDateKey, topChannelEntry, topOperatorEntry } from './pedidos-environment.helpers'
import type { PedidosInsights } from './pedidos-environment.types'

export function buildPedidosInsights(
  params: Readonly<{
    orders: OrderRecord[]
    totals:
      | {
          completedOrders: number
          cancelledOrders: number
          realizedRevenue: number
          realizedProfit: number
          soldUnits: number
        }
      | undefined
  }>,
): PedidosInsights {
  const { orders, totals } = params
  const sortedOrders = sortOrdersByCreatedAt(orders)
  const groups = groupOrdersByDay(sortedOrders)
  const summary = buildOrderSummary(sortedOrders, totals)

  return {
    ...summary,
    groups,
    latest: sortedOrders[0] ?? null,
    sortedOrders,
    topChannel: topChannelEntry(orders),
    topOperator: topOperatorEntry(orders),
    busiestDay: [...groups].sort((left, right) => right.orders.length - left.orders.length)[0] ?? null,
  }
}

function sortOrdersByCreatedAt(orders: OrderRecord[]) {
  return [...orders].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
}

function buildOrderSummary(
  orders: OrderRecord[],
  totals:
    | {
        completedOrders: number
        cancelledOrders: number
        realizedRevenue: number
        realizedProfit: number
        soldUnits: number
      }
    | undefined,
) {
  const completedOrders = orders.filter((order) => order.status === 'COMPLETED')
  const cancelledOrders = orders.filter((order) => order.status === 'CANCELLED')
  const realized = buildRealizedSummary(orders, completedOrders, cancelledOrders, totals)
  const uniqueCounts = buildUniqueCounts(orders)
  const groups = groupOrdersByDay(orders)
  const averagePerDay = groups.length > 0 ? Math.round((orders.length / groups.length) * 10) / 10 : 0

  return {
    activeDays: groups.length,
    averagePerDay,
    averageTicket: realized.completedCount > 0 ? realized.completedRevenue / Math.max(1, realized.completedCount) : 0,
    cancelledCount: realized.cancelledCount,
    completedCount: realized.completedCount,
    completedProfit: realized.completedProfit,
    completedRevenue: realized.completedRevenue,
    totalItems: realized.totalItems,
    uniqueChannels: uniqueCounts.uniqueChannels,
    uniqueOperators: uniqueCounts.uniqueOperators,
    ordersToday: orders.filter((order) => isSameDateKey(order.createdAt, new Date())).length,
    cancelRate:
      orders.length > 0 ? `${Math.round((realized.cancelledCount / Math.max(1, orders.length)) * 100)}%` : '0%',
    biggest: [...orders].sort((left, right) => right.totalRevenue - left.totalRevenue)[0] ?? null,
    lastCancelled: orders.find((order) => order.status === 'CANCELLED') ?? null,
  }
}

function buildRealizedSummary(
  orders: OrderRecord[],
  completedOrders: OrderRecord[],
  cancelledOrders: OrderRecord[],
  totals:
    | {
        completedOrders: number
        cancelledOrders: number
        realizedRevenue: number
        realizedProfit: number
        soldUnits: number
      }
    | undefined,
) {
  return {
    cancelledCount: totals?.cancelledOrders ?? cancelledOrders.length,
    completedCount: totals?.completedOrders ?? completedOrders.length,
    completedProfit: totals?.realizedProfit ?? completedOrders.reduce((sum, order) => sum + order.totalProfit, 0),
    completedRevenue: totals?.realizedRevenue ?? completedOrders.reduce((sum, order) => sum + order.totalRevenue, 0),
    totalItems: totals?.soldUnits ?? orders.reduce((sum, order) => sum + order.totalItems, 0),
  }
}

function buildUniqueCounts(orders: OrderRecord[]) {
  return {
    uniqueChannels: new Set(orders.map((order) => order.channel ?? 'balcao')).size,
    uniqueOperators: new Set(orders.map((order) => order.sellerName).filter(Boolean)).size,
  }
}
