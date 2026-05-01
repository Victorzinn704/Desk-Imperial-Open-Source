import { Injectable } from '@nestjs/common'
import type { RequestContext } from '../../common/utils/request-context.util'
import { resolveAuthActorUserId } from '../auth/auth-shared.util'
import type { AuthContext } from '../auth/auth.types'
import { AuditLogService } from '../monitoring/audit-log.service'
import { NotificationsService } from '../notifications/notifications.service'
import { resolveIntelligenceToolsForRole } from './intelligence-platform.catalog'
import type { IntelligenceCapabilityResponse } from './intelligence-platform.types'

@Injectable()
export class IntelligencePlatformService {
  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async describeCapabilities(auth: AuthContext, context: RequestContext): Promise<IntelligenceCapabilityResponse> {
    const tools = resolveIntelligenceToolsForRole(auth.role)
    const deliveryChannels = this.notificationsService.getChannelCapabilities()

    await this.auditLogService.record({
      actorUserId: resolveAuthActorUserId(auth),
      event: 'intelligence-platform.capabilities.read',
      resource: 'intelligence_platform',
      metadata: {
        actorRole: auth.role,
        toolCount: tools.length,
        telegramEnabled: deliveryChannels.some((channel) => channel.channel === 'TELEGRAM' && channel.enabled),
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return {
      generatedAt: new Date().toISOString(),
      actorRole: auth.role,
      ragMode: 'internal-docs-only',
      freeTextChatEnabled: false,
      mutationPolicy: {
        stepUpRequired: true,
        idempotencyRequired: true,
      },
      deliveryChannels,
      tools,
    }
  }
}
