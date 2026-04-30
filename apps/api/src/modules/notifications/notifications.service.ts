import { Injectable } from '@nestjs/common'
import { AuditSeverity } from '@prisma/client'
import { ConfigService } from '@nestjs/config'
import type { RequestContext } from '../../common/utils/request-context.util'
import { CacheService } from '../../common/services/cache.service'
import { AuditLogService } from '../monitoring/audit-log.service'
import { TelegramAdapter } from './infra/telegram/telegram.adapter'
import type {
  NotificationChannel,
  NotificationChannelCapability,
  NotificationEnvelope,
  QueuedNotificationResult,
} from './notifications.types'

const NOTIFICATION_DELIVERY_TTL_SECONDS = 60 * 60 * 24

@Injectable()
export class NotificationsService {
  constructor(
    private readonly configService: ConfigService,
    private readonly auditLogService: AuditLogService,
    private readonly cache: CacheService,
    private readonly telegramAdapter: TelegramAdapter,
  ) {}

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
