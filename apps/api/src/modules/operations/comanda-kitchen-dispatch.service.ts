import { Inject, Injectable } from '@nestjs/common'
import { type ComandaItem, ComandaStatus, KitchenItemStatus } from '@prisma/client'
import type { RequestContext } from '../../common/utils/request-context.util'
import { resolveAuthActorUserId } from '../auth/auth-shared.util'
import type { AuthContext } from '../auth/auth.types'
import { AuditLogService } from '../monitoring/audit-log.service'
import { ComandaRealtimePublisher } from './comanda-realtime-publisher.service'
import { toRealtimeStatus } from './comanda-realtime-status.utils'
import type { UpdateKitchenItemStatusDto } from './operations.schemas'

type KitchenComandaPayload = Parameters<ComandaRealtimePublisher['publishUpdated']>[0]['comanda']

type KitchenDispatchResult = {
  businessDate: Date
  comandaId: string
  previousComandaStatus: ComandaStatus
  previousKitchenStatus: KitchenItemStatus | null
  refreshedComanda: KitchenComandaPayload | null | undefined
  updatedItem: ComandaItem
}

@Injectable()
export class ComandaKitchenDispatchService {
  constructor(
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService,
    @Inject(ComandaRealtimePublisher) private readonly realtime: ComandaRealtimePublisher,
  ) {}

  recordStatusUpdated(params: {
    auth: AuthContext
    itemId: string
    status: UpdateKitchenItemStatusDto['status']
    comandaId: string
    context: RequestContext
  }) {
    return this.auditLogService.record({
      actorUserId: resolveAuthActorUserId(params.auth),
      event: 'operations.kitchen_item.status_updated',
      resource: 'comanda_item',
      resourceId: params.itemId,
      metadata: { status: params.status, comandaId: params.comandaId },
      ipAddress: params.context.ipAddress,
      userAgent: params.context.userAgent,
    })
  }

  publishStatusUpdated(params: {
    auth: AuthContext
    mutationStartedAtMs: number
    result: KitchenDispatchResult
    workspaceOwnerUserId: string
  }) {
    this.realtime.invalidate(params.workspaceOwnerUserId, params.result.businessDate)

    if (!params.result.refreshedComanda) {
      return
    }

    this.realtime.publishKitchenUpdated({
      auth: params.auth,
      businessDate: params.result.businessDate,
      comanda: params.result.refreshedComanda,
      item: params.result.updatedItem,
      options: { previousKitchenStatus: resolvePreviousKitchenStatus(params.result.previousKitchenStatus) },
      instrumentation: {
        mutationName: 'update-kitchen-item-status',
        mutationStartedAtMs: params.mutationStartedAtMs,
      },
    })
    this.realtime.publishUpdated({
      auth: params.auth,
      businessDate: params.result.businessDate,
      comanda: params.result.refreshedComanda,
      options: buildComandaStatusOptions(params.result),
    })
  }
}

function buildComandaStatusOptions(result: KitchenDispatchResult) {
  if (!result.refreshedComanda || result.refreshedComanda.status === result.previousComandaStatus) {
    return undefined
  }

  return { previousStatus: toRealtimeStatus(result.previousComandaStatus) }
}

function resolvePreviousKitchenStatus(status: KitchenItemStatus | null) {
  if (status === 'DELIVERED' || status === 'READY' || status === 'IN_PREPARATION') {
    return status
  }

  return 'QUEUED' as const
}
