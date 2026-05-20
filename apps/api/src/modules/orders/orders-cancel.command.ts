import { ConflictException, NotFoundException } from '@nestjs/common'
import { AuditSeverity, OrderStatus, Prisma } from '@prisma/client'
import { assertOwnerRole, resolveWorkspaceOwnerUserId } from '../../common/utils/workspace-access.util'
import type { RequestContext } from '../../common/utils/request-context.util'
import { resolveAuthActorUserId } from '../auth/auth-shared.util'
import type { AuthContext } from '../auth/auth.types'
import { buildProductConsumptionMap } from '../products/product-combo-consumption.util'
import { invalidateOrdersCache, refreshOrdersFinanceSummary } from './orders-cache.utils'
import { toOrderRecord } from './orders.types'
import { orderProductInventoryInclude, type OrdersServiceDependencies } from './orders-service.types'

type CancelOrderInput = {
  auth: AuthContext
  orderId: string
  context: RequestContext
}

type CancellationResult = {
  order: Awaited<ReturnType<typeof loadOwnedOrder>>
  cancelledNow: boolean
}
type OrderItem = Awaited<ReturnType<typeof loadOwnedOrder>>['items'][number]
type OrderItemWithProduct = OrderItem & { productId: string }

export async function cancelOrderForUser(deps: OrdersServiceDependencies, input: CancelOrderInput) {
  assertOwnerRole(input.auth, 'Apenas o dono pode cancelar vendas ja registradas.')
  const workspaceUserId = resolveWorkspaceOwnerUserId(input.auth)
  const cancellationResult = await cancelOrderTransaction(deps, workspaceUserId, input.orderId)

  if (cancellationResult.cancelledNow) {
    await recordOrderCancelledAudit(deps, input, cancellationResult)
  }

  const snapshot = await deps.currencyService.getSnapshot()

  if (cancellationResult.cancelledNow) {
    refreshOrdersFinanceSummary(deps, workspaceUserId)
    void invalidateOrdersCache(deps, workspaceUserId)
  }

  return {
    order: toOrderRecord(cancellationResult.order, {
      displayCurrency: input.auth.preferredCurrency,
      currencyService: deps.currencyService,
      snapshot,
    }),
  }
}

async function cancelOrderTransaction(
  deps: OrdersServiceDependencies,
  workspaceUserId: string,
  orderId: string,
): Promise<CancellationResult> {
  const cancelledAt = new Date()

  return deps.prisma.$transaction(
    async (transaction) => {
      const order = await loadOwnedOrder(transaction, workspaceUserId, orderId)

      if (order.status === OrderStatus.CANCELLED) {
        return { order, cancelledNow: false }
      }

      if (order.comandaId) {
        throw new ConflictException('Vendas geradas por comanda devem ser canceladas pelo fluxo de comanda.')
      }

      const updated = await markOrderAsCancelled(transaction, workspaceUserId, order.id, cancelledAt)
      if (updated.count !== 1) {
        return resolveConcurrentCancellation(transaction, workspaceUserId, order.id)
      }

      await restoreOrderStock(transaction, workspaceUserId, order)

      return {
        order: {
          ...order,
          status: OrderStatus.CANCELLED,
          cancelledAt,
        },
        cancelledNow: true,
      }
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  )
}

async function loadOwnedOrder(transaction: Prisma.TransactionClient, workspaceUserId: string, orderId: string) {
  const order = await transaction.order.findFirst({
    where: {
      id: orderId,
      userId: workspaceUserId,
    },
    include: { items: true },
  })

  if (!order) {
    throw new NotFoundException('Pedido nao encontrado para esta conta.')
  }

  return order
}

function markOrderAsCancelled(
  transaction: Prisma.TransactionClient,
  workspaceUserId: string,
  orderId: string,
  cancelledAt: Date,
) {
  return transaction.order.updateMany({
    where: {
      id: orderId,
      userId: workspaceUserId,
      status: OrderStatus.COMPLETED,
    },
    data: {
      status: OrderStatus.CANCELLED,
      cancelledAt,
    },
  })
}

async function resolveConcurrentCancellation(
  transaction: Prisma.TransactionClient,
  workspaceUserId: string,
  orderId: string,
): Promise<CancellationResult> {
  const currentOrder = await transaction.order.findFirst({
    where: {
      id: orderId,
      userId: workspaceUserId,
    },
    include: { items: true },
  })

  if (currentOrder?.status === OrderStatus.CANCELLED) {
    return { order: currentOrder, cancelledNow: false }
  }

  throw new ConflictException('Nao foi possivel cancelar este pedido agora. Tente novamente.')
}

async function restoreOrderStock(
  transaction: Prisma.TransactionClient,
  workspaceUserId: string,
  order: Awaited<ReturnType<typeof loadOwnedOrder>>,
) {
  const products = await loadProductsForStockRestore(transaction, workspaceUserId, order.items)
  const productsById = new Map(products.map((product) => [product.id, product]))
  const stockToRestore = buildProductConsumptionMap(buildStockRestoreItems(order.items), productsById)

  for (const [productId, quantity] of stockToRestore.entries()) {
    await transaction.product.updateMany({
      where: {
        id: productId,
        userId: workspaceUserId,
      },
      data: {
        stock: {
          increment: quantity,
        },
      },
    })
  }
}

function loadProductsForStockRestore(
  transaction: Prisma.TransactionClient,
  workspaceUserId: string,
  items: Awaited<ReturnType<typeof loadOwnedOrder>>['items'],
) {
  const productIds = collectOrderProductIds(items)
  return productIds.length
    ? transaction.product.findMany({
        where: {
          id: { in: productIds },
          userId: workspaceUserId,
        },
        include: orderProductInventoryInclude,
      })
    : []
}

function collectOrderProductIds(items: Awaited<ReturnType<typeof loadOwnedOrder>>['items']) {
  return [
    ...new Set(items.map((item) => item.productId).filter((productId): productId is string => Boolean(productId))),
  ]
}

function buildStockRestoreItems(items: Awaited<ReturnType<typeof loadOwnedOrder>>['items']) {
  return items.filter(hasProductId).map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
  }))
}

function hasProductId(item: OrderItem): item is OrderItemWithProduct {
  return Boolean(item.productId)
}

async function recordOrderCancelledAudit(
  deps: OrdersServiceDependencies,
  input: CancelOrderInput,
  cancellationResult: CancellationResult,
) {
  await deps.auditLogService.record({
    actorUserId: resolveAuthActorUserId(input.auth),
    event: 'order.cancelled',
    resource: 'order',
    resourceId: cancellationResult.order.id,
    severity: AuditSeverity.WARN,
    metadata: {
      totalItems: cancellationResult.order.totalItems,
      totalRevenue: Number(cancellationResult.order.totalRevenue),
    },
    ipAddress: input.context.ipAddress,
    userAgent: input.context.userAgent,
  })
}
