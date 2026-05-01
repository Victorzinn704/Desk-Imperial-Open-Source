import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { AuditSeverity, TelegramAccountStatus, UserStatus } from '@prisma/client'
import { ConfigService } from '@nestjs/config'
import type { RequestContext } from '../../common/utils/request-context.util'
import { CacheService } from '../../common/services/cache.service'
import { PrismaService } from '../../database/prisma.service'
import { AuditLogService } from '../monitoring/audit-log.service'
import { OperationsRealtimeService } from '../operations-realtime/operations-realtime.service'
import type { OperationsRealtimeEnvelope } from '../operations-realtime/operations-realtime.types'
import { TelegramAdapter } from './infra/telegram/telegram.adapter'
import { NotificationPreferencesService } from './notification-preferences.service'
import type {
  NotificationChannel,
  NotificationChannelCapability,
  NotificationEnvelope,
  QueuedNotificationResult,
} from './notifications.types'

const NOTIFICATION_DELIVERY_TTL_SECONDS = 60 * 60 * 24

@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private unsubscribeRealtime: (() => void) | null = null

  constructor(
    private readonly configService: ConfigService,
    private readonly auditLogService: AuditLogService,
    private readonly cache: CacheService,
    private readonly prisma: PrismaService,
    private readonly operationsRealtimeService: OperationsRealtimeService,
    private readonly telegramAdapter: TelegramAdapter,
    private readonly notificationPreferencesService: NotificationPreferencesService,
  ) {}

  onModuleInit() {
    this.unsubscribeRealtime = this.operationsRealtimeService.subscribeAll((envelope) => {
      void this.dispatchOperationsRealtimeNotification(envelope)
    })
  }

  onModuleDestroy() {
    this.unsubscribeRealtime?.()
    this.unsubscribeRealtime = null
  }

  getChannelCapabilities(): NotificationChannelCapability[] {
    const emailKey = this.configService.get<string>('BREVO_API_KEY')?.trim()
    const webhookEnabled =
      this.configService.get<string>('OUTBOUND_WEBHOOK_ENABLED') === 'true' ||
      !!this.configService.get<string>('ALERTMANAGER_WEBHOOK_URL')?.trim()

    return [
      this.telegramAdapter.describeCapability(),
      emailKey
        ? {
            channel: 'EMAIL',
            enabled: true,
            mode: 'outbound',
          }
        : {
            channel: 'EMAIL',
            enabled: false,
            mode: 'disabled',
            reason: 'BREVO_API_KEY ausente.',
          },
      webhookEnabled
        ? {
            channel: 'WEBHOOK',
            enabled: true,
            mode: 'outbound',
          }
        : {
            channel: 'WEBHOOK',
            enabled: false,
            mode: 'disabled',
            reason: 'Nenhum webhook outbound configurado.',
          },
    ]
  }

  async queueDelivery(input: NotificationEnvelope, context?: RequestContext): Promise<QueuedNotificationResult> {
    const channels = resolveEnabledNotificationChannels(input.preferredChannels, this.getChannelCapabilities())
    const queuedAt = new Date().toISOString()

    if (!channels.length) {
      await this.auditLogService.record({
        actorUserId: input.actorUserId,
        event: 'notifications.delivery.suppressed',
        resource: 'notification_delivery',
        resourceId: input.idempotencyKey,
        severity: AuditSeverity.WARN,
        metadata: {
          eventType: input.eventType,
          recipientScope: input.recipientScope,
          suppressedReason: 'no_enabled_channel',
        },
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      })

      return {
        state: 'suppressed',
        channels: [],
        idempotencyKey: input.idempotencyKey,
        queuedAt,
        suppressedReason: 'Nenhum canal outbound habilitado.',
      }
    }

    const cacheKey = CacheService.notificationsDeliveryKey(input.workspaceOwnerUserId, input.idempotencyKey)
    const existing = await this.cache.get<{ queuedAt: string }>(cacheKey)

    if (existing) {
      return {
        state: 'suppressed',
        channels,
        idempotencyKey: input.idempotencyKey,
        queuedAt: existing.queuedAt,
        suppressedReason: 'Entrega ja enfileirada para esta chave de idempotencia.',
      }
    }

    await this.cache.set(
      cacheKey,
      {
        queuedAt,
        channels,
        eventType: input.eventType,
        recipientScope: input.recipientScope,
      },
      NOTIFICATION_DELIVERY_TTL_SECONDS,
    )

    await this.auditLogService.record({
      actorUserId: input.actorUserId,
      event: 'notifications.delivery.queued',
      resource: 'notification_delivery',
      resourceId: input.idempotencyKey,
      metadata: {
        eventType: input.eventType,
        recipientScope: input.recipientScope,
        channels,
      },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    })

    return {
      state: 'queued',
      channels,
      idempotencyKey: input.idempotencyKey,
      queuedAt,
    }
  }

  async dispatchOperationsRealtimeNotification(envelope: OperationsRealtimeEnvelope) {
    if (!this.telegramAdapter.isWorkspaceEnabled(envelope.workspaceOwnerUserId)) {
      return null
    }

    const resolved = resolveOperationsRealtimeNotification(envelope)
    if (!resolved) {
      return null
    }

    const preference = await this.notificationPreferencesService.resolveEffectivePreference(
      envelope.workspaceOwnerUserId,
      'TELEGRAM',
      resolved.eventType,
    )

    if (!preference.enabled) {
      await this.auditLogService.record({
        actorUserId: envelope.actorUserId,
        event: 'notifications.delivery.suppressed',
        resource: 'notification_delivery',
        resourceId: envelope.id,
        severity: AuditSeverity.INFO,
        metadata: {
          eventType: resolved.eventType,
          recipientScope: resolved.recipientScope,
          suppressedReason: 'workspace_preference_disabled',
          channel: 'TELEGRAM',
        },
      })
      return {
        state: 'suppressed' as const,
        channels: ['TELEGRAM' as const],
        idempotencyKey: `operations-realtime:${envelope.id}`,
        queuedAt: envelope.createdAt,
        suppressedReason: 'Workspace desabilitou esta notificação.',
      }
    }

    const queued = await this.queueDelivery({
      workspaceOwnerUserId: envelope.workspaceOwnerUserId,
      actorUserId: envelope.actorUserId,
      eventType: resolved.eventType,
      recipientScope: resolved.recipientScope,
      payload: {
        event: envelope.event,
        ...resolved.payload,
      },
      idempotencyKey: `operations-realtime:${envelope.id}`,
      preferredChannels: ['TELEGRAM'],
    })

    if (queued.state !== 'queued' || !queued.channels.includes('TELEGRAM')) {
      return queued
    }

    const recipients = await this.resolveTelegramRecipients(
      envelope.workspaceOwnerUserId,
      resolved.recipientScope,
    )

    let sentCount = 0
    for (const recipient of recipients) {
      try {
        await this.telegramAdapter.sendTextMessage(recipient.telegramChatId, resolved.text)
        sentCount += 1
      } catch (error) {
        if (this.telegramAdapter.isBlockedByUserError(error)) {
          await this.prisma.telegramAccount.updateMany({
            where: {
              id: recipient.id,
              status: TelegramAccountStatus.ACTIVE,
            },
            data: {
              status: TelegramAccountStatus.BLOCKED,
              revokedAt: new Date(),
            },
          })
          continue
        }

        throw error
      }
    }

    if (sentCount > 0) {
      await this.auditLogService.record({
        actorUserId: envelope.actorUserId,
        event: 'notifications.delivery.sent',
        resource: 'notification_delivery',
        resourceId: envelope.id,
        metadata: {
          eventType: resolved.eventType,
          recipientScope: resolved.recipientScope,
          channels: ['TELEGRAM'],
          sentCount,
        },
      })
    }

    return {
      ...queued,
      state: sentCount > 0 ? 'sent' : queued.state,
    }
  }

  private async resolveTelegramRecipients(
    workspaceOwnerUserId: string,
    recipientScope: NotificationEnvelope['recipientScope'],
  ) {
    const accounts = await this.prisma.telegramAccount.findMany({
      where: {
        workspaceOwnerUserId,
        status: TelegramAccountStatus.ACTIVE,
        user: {
          status: UserStatus.ACTIVE,
          ...(recipientScope === 'WORKSPACE_OWNER' ? { role: 'OWNER' } : {}),
        },
      },
      select: {
        id: true,
        telegramChatId: true,
      },
      orderBy: {
        linkedAt: 'asc',
      },
    })

    const deduped = new Map<string, (typeof accounts)[number]>()
    for (const account of accounts) {
      const key = account.telegramChatId.toString()
      if (!deduped.has(key)) {
        deduped.set(key, account)
      }
    }

    return [...deduped.values()]
  }
}

export function resolveEnabledNotificationChannels(
  preferredChannels: NotificationChannel[] | undefined,
  capabilities: NotificationChannelCapability[],
) {
  const enabledChannels = capabilities
    .filter((capability) => capability.enabled)
    .map((capability) => capability.channel)

  if (!preferredChannels?.length) {
    return enabledChannels
  }

  return preferredChannels.filter(
    (channel, index, list) => list.indexOf(channel) === index && enabledChannels.includes(channel),
  )
}

function resolveOperationsRealtimeNotification(envelope: OperationsRealtimeEnvelope) {
  switch (envelope.event) {
    case 'comanda.updated': {
      const payload = envelope.payload as Record<string, unknown>
      const previousStatus = asString(payload.previousStatus)
      const nextStatus = asString(payload.status)
      const mesaLabel = asString(payload.mesaLabel) ?? 'Mesa'
      const comandaId = asString(payload.comandaId) ?? 'comanda'

      if (!previousStatus || !nextStatus || previousStatus === nextStatus) {
        return null
      }

      return {
        eventType: 'operations.comanda.status_changed' as const,
        recipientScope: 'WORKSPACE_OWNER' as const,
        payload: {
          comandaId,
          mesaLabel,
          previousStatus,
          status: nextStatus,
        },
        text: [
          'PDV · mudança de status',
          `${mesaLabel} · ${shortComandaId(comandaId)}`,
          `${formatComandaStatus(previousStatus)} -> ${formatComandaStatus(nextStatus)}`,
        ].join('\n'),
      }
    }
    case 'comanda.closed': {
      const payload = envelope.payload as Record<string, unknown>
      const mesaLabel = asString(payload.mesaLabel) ?? 'Mesa'
      const comandaId = asString(payload.comandaId) ?? 'comanda'
      const paymentMethod = asString(payload.paymentMethod)

      return {
        eventType: 'operations.comanda.status_changed' as const,
        recipientScope: 'WORKSPACE_OWNER' as const,
        payload: {
          comandaId,
          mesaLabel,
          status: 'CLOSED',
          paymentMethod,
        },
        text: [
          'PDV · comanda fechada',
          `${mesaLabel} · ${shortComandaId(comandaId)}`,
          paymentMethod ? `Pagamento: ${paymentMethod}` : 'Pagamento registrado',
        ].join('\n'),
      }
    }
    case 'kitchen.item.updated': {
      const payload = envelope.payload as Record<string, unknown>
      const mesaLabel = asString(payload.mesaLabel) ?? 'Mesa'
      const productName = asString(payload.productName) ?? 'Item'
      const previousKitchenStatus = asString(payload.previousKitchenStatus)
      const kitchenStatus = asString(payload.kitchenStatus)

      if (!kitchenStatus || previousKitchenStatus === kitchenStatus) {
        return null
      }

      return {
        eventType: 'operations.kitchen_item.status_changed' as const,
        recipientScope: 'WORKSPACE_OWNER' as const,
        payload: {
          mesaLabel,
          productName,
          previousKitchenStatus,
          kitchenStatus,
        },
        text: [
          'Cozinha · atualização',
          `${mesaLabel} · ${productName}`,
          previousKitchenStatus
            ? `${formatKitchenStatus(previousKitchenStatus)} -> ${formatKitchenStatus(kitchenStatus)}`
            : formatKitchenStatus(kitchenStatus),
        ].join('\n'),
      }
    }
    default:
      return null
  }
}

function asString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function shortComandaId(comandaId: string) {
  return `#${comandaId.slice(-6).toUpperCase()}`
}

function formatComandaStatus(status: string) {
  switch (status) {
    case 'OPEN':
      return 'Aberta'
    case 'IN_PREPARATION':
      return 'Em preparo'
    case 'READY':
      return 'Pronta'
    case 'CLOSED':
      return 'Fechada'
    case 'CANCELLED':
      return 'Cancelada'
    default:
      return status
  }
}

function formatKitchenStatus(status: string) {
  switch (status) {
    case 'QUEUED':
      return 'Na fila'
    case 'IN_PREPARATION':
      return 'Em preparo'
    case 'READY':
      return 'Pronto'
    case 'DELIVERED':
      return 'Entregue'
    default:
      return status
  }
}
