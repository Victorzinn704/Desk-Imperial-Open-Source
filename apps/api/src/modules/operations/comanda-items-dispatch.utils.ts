import { KitchenItemStatus } from '@prisma/client'
import type { AuditLogService } from '../monitoring/audit-log.service'
import { resolveAuthActorUserId } from '../auth/auth-shared.util'
import type { AuthContext } from '../auth/auth.types'
import type { RequestContext } from '../../common/utils/request-context.util'
import { buildKitchenItemRealtimeDeltas } from './comanda-realtime-publish.utils'
import type { ComandaRealtimePublisher } from './comanda-realtime-publisher.service'

type ComandaItemAuditInput = {
  productId: string | null
  productName: string
  quantity: number
  unitPrice: number
}

type ReplaceAuditInput = {
  draftItems: Array<unknown>
  fields: {
    discountAmount: number
    serviceFeeAmount: number
  }
  mesaSelection: {
    tableLabel: string
  }
}

type KitchenItemEvent = {
  id: string
  kitchenQueuedAt: Date | null
  kitchenReadyAt: Date | null
  kitchenStatus: KitchenItemStatus | null
  notes: string | null
  productName: string
  quantity: number
}

type ComandaEvent = Parameters<ComandaRealtimePublisher['publishUpdated']>[0]['comanda']

export function recordComandaItemAudit(params: {
  auditLogService: AuditLogService
  auth: AuthContext
  comandaId: string
  context: RequestContext
  item: ComandaItemAuditInput
  itemId: string
}) {
  return params.auditLogService.record({
    actorUserId: resolveAuthActorUserId(params.auth),
    event: 'operations.comanda_item.created',
    resource: 'comanda',
    resourceId: params.comandaId,
    metadata: {
      itemId: params.itemId,
      productId: params.item.productId,
      productName: params.item.productName,
      quantity: params.item.quantity,
      unitPrice: params.item.unitPrice,
    },
    ipAddress: params.context.ipAddress,
    userAgent: params.context.userAgent,
  })
}

export function recordComandaBatchAudit(params: {
  auditLogService: AuditLogService
  auth: AuthContext
  comandaId: string
  context: RequestContext
  items: Array<{ id: string }>
}) {
  return params.auditLogService.record({
    actorUserId: resolveAuthActorUserId(params.auth),
    event: 'operations.comanda_items.batch_created',
    resource: 'comanda',
    resourceId: params.comandaId,
    metadata: { itemIds: params.items.map((item) => item.id), itemsCount: params.items.length },
    ipAddress: params.context.ipAddress,
    userAgent: params.context.userAgent,
  })
}

export function recordComandaReplaceAudit(params: {
  auditLogService: AuditLogService
  auth: AuthContext
  comandaId: string
  context: RequestContext
  input: ReplaceAuditInput
}) {
  return params.auditLogService.record({
    actorUserId: resolveAuthActorUserId(params.auth),
    event: 'operations.comanda.replaced',
    resource: 'comanda',
    resourceId: params.comandaId,
    metadata: {
      discountAmount: params.input.fields.discountAmount,
      itemsCount: params.input.draftItems.length,
      serviceFeeAmount: params.input.fields.serviceFeeAmount,
      tableLabel: params.input.mesaSelection.tableLabel,
    },
    ipAddress: params.context.ipAddress,
    userAgent: params.context.userAgent,
  })
}

export function publishSingleComandaItemResult(params: {
  auth: AuthContext
  mutationStartedAtMs: number
  preparedItem: { kitchenQueuedAt: Date | null; requiresKitchen: boolean }
  realtime: ComandaRealtimePublisher
  result: { businessDate: Date; item: KitchenItemEvent; refreshedComanda: ComandaEvent }
  workspaceOwnerUserId: string
}) {
  params.realtime.invalidate(params.workspaceOwnerUserId, params.result.businessDate)
  params.realtime.publishUpdated({
    auth: params.auth,
    businessDate: params.result.businessDate,
    comanda: params.result.refreshedComanda,
    instrumentation: { mutationName: 'add-comanda-item', mutationStartedAtMs: params.mutationStartedAtMs },
  })
  if (params.preparedItem.requiresKitchen && params.preparedItem.kitchenQueuedAt) {
    params.realtime.publishKitchenQueued({
      auth: params.auth,
      businessDate: params.result.businessDate,
      comanda: params.result.refreshedComanda,
      item: params.result.item,
    })
  }
}

export function publishQueuedKitchenItems(params: {
  auth: AuthContext
  businessDate: Date
  comanda: ComandaEvent
  items: KitchenItemEvent[]
  realtime: ComandaRealtimePublisher
}) {
  for (const item of params.items) {
    if (item.kitchenStatus !== KitchenItemStatus.QUEUED || !item.kitchenQueuedAt) {
      continue
    }
    params.realtime.publishKitchenQueued({
      auth: params.auth,
      businessDate: params.businessDate,
      comanda: params.comanda,
      item,
    })
  }
}

export function publishBatchComandaItemsResult(params: {
  auth: AuthContext
  mutationName: 'add-comanda-items' | 'replace-comanda'
  mutationStartedAtMs: number
  realtime: ComandaRealtimePublisher
  result: { businessDate: Date; createdItems?: KitchenItemEvent[]; refreshedComanda: ComandaEvent }
  workspaceOwnerUserId: string
}) {
  params.realtime.invalidate(params.workspaceOwnerUserId, params.result.businessDate)
  params.realtime.publishUpdated({
    auth: params.auth,
    businessDate: params.result.businessDate,
    comanda: params.result.refreshedComanda,
    options: {
      kitchenItems: buildKitchenItemRealtimeDeltas(params.result.refreshedComanda, params.result.businessDate),
      replaceKitchenItems: true,
    },
    instrumentation: { mutationName: params.mutationName, mutationStartedAtMs: params.mutationStartedAtMs },
  })
  publishQueuedKitchenItems({
    auth: params.auth,
    businessDate: params.result.businessDate,
    comanda: params.result.refreshedComanda,
    items: params.result.createdItems ?? [],
    realtime: params.realtime,
  })
}
