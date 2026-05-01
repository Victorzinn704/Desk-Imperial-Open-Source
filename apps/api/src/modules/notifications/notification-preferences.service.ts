import { Injectable } from '@nestjs/common'
import type { RequestContext } from '../../common/utils/request-context.util'
import { assertOwnerRole, resolveWorkspaceOwnerUserId } from '../../common/utils/workspace-access.util'
import { PrismaService } from '../../database/prisma.service'
import type { AuthContext } from '../auth/auth.types'
import { AuditLogService } from '../monitoring/audit-log.service'
import type {
  UpdateUserNotificationPreferencesDto,
  UpdateWorkspaceNotificationPreferencesDto,
} from './notification-preferences.schemas'
import {
  type NotificationChannel,
  type NotificationEventType,
  SUPPORTED_USER_NOTIFICATION_PREFERENCES,
  SUPPORTED_WORKSPACE_NOTIFICATION_PREFERENCES,
  type UserNotificationChannel,
  type UserNotificationPreference,
  type WorkspaceNotificationPreference,
} from './notifications.types'

type PreferenceKey = `${NotificationChannel}:${NotificationEventType}`
type UserPreferenceKey = `${UserNotificationChannel}:${NotificationEventType}`

function buildPreferenceKey(channel: NotificationChannel, eventType: NotificationEventType): PreferenceKey {
  return `${channel}:${eventType}`
}

function buildUserPreferenceKey(
  channel: UserNotificationChannel,
  eventType: NotificationEventType,
): UserPreferenceKey {
  return `${channel}:${eventType}`
}

function isSupportedPreference(channel: string, eventType: string) {
  return SUPPORTED_WORKSPACE_NOTIFICATION_PREFERENCES.some(
    (entry) => entry.channel === channel && entry.eventType === eventType,
  )
}

function isSupportedUserPreference(channel: string, eventType: string) {
  return SUPPORTED_USER_NOTIFICATION_PREFERENCES.some(
    (entry) => entry.channel === channel && entry.eventType === eventType,
  )
}

@Injectable()
export class NotificationPreferencesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async listForWorkspace(auth: AuthContext): Promise<{ preferences: WorkspaceNotificationPreference[] }> {
    assertOwnerRole(auth)
    const workspaceOwnerUserId = resolveWorkspaceOwnerUserId(auth)
    return {
      preferences: await this.resolveWorkspacePreferences(workspaceOwnerUserId),
    }
  }

  async updateForWorkspace(
    auth: AuthContext,
    dto: UpdateWorkspaceNotificationPreferencesDto,
    context: RequestContext,
  ): Promise<{ preferences: WorkspaceNotificationPreference[] }> {
    assertOwnerRole(auth)
    const workspaceOwnerUserId = resolveWorkspaceOwnerUserId(auth)

    await this.prisma.$transaction(
      dto.preferences.map((preference) => {
        const channel = preference.channel as NotificationChannel
        const eventType = preference.eventType as NotificationEventType
        const fallback = resolveSupportedPreference(channel, eventType)
        if (!fallback || preference.enabled === fallback.enabled) {
          return this.prisma.notificationPreference.deleteMany({
            where: {
              workspaceOwnerUserId,
              channel,
              eventType,
            },
          })
        }

        return this.prisma.notificationPreference.upsert({
          where: {
            workspaceOwnerUserId_channel_eventType: {
              workspaceOwnerUserId,
              channel,
              eventType,
            },
          },
          update: {
            enabled: preference.enabled,
          },
          create: {
            workspaceOwnerUserId,
            channel,
            eventType,
            enabled: preference.enabled,
          },
        })
      }),
    )

    await this.auditLogService.record({
      actorUserId: auth.userId,
      event: 'notifications.preferences.updated',
      resource: 'notification_preferences',
      resourceId: workspaceOwnerUserId,
      metadata: {
        preferences: dto.preferences,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return {
      preferences: await this.resolveWorkspacePreferences(workspaceOwnerUserId),
    }
  }

  async resolveEffectivePreference(
    workspaceOwnerUserId: string,
    channel: NotificationChannel,
    eventType: NotificationEventType,
  ): Promise<WorkspaceNotificationPreference> {
    if (!isSupportedPreference(channel, eventType)) {
      return {
        channel,
        eventType,
        enabled: true,
        inherited: true,
      }
    }

    const existing = await this.prisma.notificationPreference.findUnique({
      where: {
        workspaceOwnerUserId_channel_eventType: {
          workspaceOwnerUserId,
          channel,
          eventType,
        },
      },
      select: {
        enabled: true,
      },
    })

    const fallback = resolveSupportedPreference(channel, eventType)!

    return {
      channel,
      eventType,
      enabled: existing?.enabled ?? fallback.enabled,
      inherited: existing == null,
    }
  }

  async resolveWorkspacePreferences(workspaceOwnerUserId: string): Promise<WorkspaceNotificationPreference[]> {
    const rows = await this.prisma.notificationPreference.findMany({
      where: {
        workspaceOwnerUserId,
        OR: SUPPORTED_WORKSPACE_NOTIFICATION_PREFERENCES.map((entry) => ({
          channel: entry.channel,
          eventType: entry.eventType,
        })),
      },
      select: {
        channel: true,
        eventType: true,
        enabled: true,
      },
    })

    const overrideMap = new Map<PreferenceKey, boolean>(
      rows.map((row) => [
        buildPreferenceKey(row.channel as NotificationChannel, row.eventType as NotificationEventType),
        row.enabled,
      ]),
    )

    return SUPPORTED_WORKSPACE_NOTIFICATION_PREFERENCES.map((entry) => {
      const key = buildPreferenceKey(entry.channel, entry.eventType)
      const override = overrideMap.get(key)
      return {
        channel: entry.channel,
        eventType: entry.eventType,
        enabled: override ?? entry.enabled,
        inherited: override == null,
      }
    })
  }

  async listForUser(auth: AuthContext): Promise<{ preferences: UserNotificationPreference[] }> {
    return {
      preferences: await this.resolveUserPreferences(auth.userId),
    }
  }

  async updateForUser(
    auth: AuthContext,
    dto: UpdateUserNotificationPreferencesDto,
    context: RequestContext,
  ): Promise<{ preferences: UserNotificationPreference[] }> {
    await this.prisma.$transaction(
      dto.preferences.map((preference) => {
        const channel = preference.channel as UserNotificationChannel
        const eventType = preference.eventType as NotificationEventType
        const fallback = resolveSupportedUserPreference(channel, eventType)
        if (!fallback || preference.enabled === fallback.enabled) {
          return this.prisma.userNotificationPreference.deleteMany({
            where: {
              userId: auth.userId,
              channel,
              eventType,
            },
          })
        }

        return this.prisma.userNotificationPreference.upsert({
          where: {
            userId_channel_eventType: {
              userId: auth.userId,
              channel,
              eventType,
            },
          },
          update: {
            enabled: preference.enabled,
          },
          create: {
            userId: auth.userId,
            channel,
            eventType,
            enabled: preference.enabled,
          },
        })
      }),
    )

    await this.auditLogService.record({
      actorUserId: auth.userId,
      event: 'notifications.user_preferences.updated',
      resource: 'user_notification_preferences',
      resourceId: auth.userId,
      metadata: {
        preferences: dto.preferences,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return {
      preferences: await this.resolveUserPreferences(auth.userId),
    }
  }

  async resolveEffectiveUserPreference(
    userId: string,
    channel: UserNotificationChannel,
    eventType: NotificationEventType,
  ): Promise<UserNotificationPreference> {
    if (!isSupportedUserPreference(channel, eventType)) {
      return {
        channel,
        eventType,
        enabled: true,
        inherited: true,
      }
    }

    const existing = await this.prisma.userNotificationPreference.findUnique({
      where: {
        userId_channel_eventType: {
          userId,
          channel,
          eventType,
        },
      },
      select: {
        enabled: true,
      },
    })

    const fallback = resolveSupportedUserPreference(channel, eventType)!

    return {
      channel,
      eventType,
      enabled: existing?.enabled ?? fallback.enabled,
      inherited: existing == null,
    }
  }

  async resolveUserPreferences(userId: string): Promise<UserNotificationPreference[]> {
    const rows = await this.prisma.userNotificationPreference.findMany({
      where: {
        userId,
        OR: SUPPORTED_USER_NOTIFICATION_PREFERENCES.map((entry) => ({
          channel: entry.channel,
          eventType: entry.eventType,
        })),
      },
      select: {
        channel: true,
        eventType: true,
        enabled: true,
      },
    })

    const overrideMap = new Map<UserPreferenceKey, boolean>(
      rows.map((row) => [
        buildUserPreferenceKey(row.channel as UserNotificationChannel, row.eventType as NotificationEventType),
        row.enabled,
      ]),
    )

    return SUPPORTED_USER_NOTIFICATION_PREFERENCES.map((entry) => {
      const key = buildUserPreferenceKey(entry.channel, entry.eventType)
      const override = overrideMap.get(key)
      return {
        channel: entry.channel,
        eventType: entry.eventType,
        enabled: override ?? entry.enabled,
        inherited: override == null,
      }
    })
  }
}

function resolveSupportedPreference(channel: NotificationChannel, eventType: NotificationEventType) {
  return SUPPORTED_WORKSPACE_NOTIFICATION_PREFERENCES.find(
    (entry) => entry.channel === channel && entry.eventType === eventType,
  )
}

function resolveSupportedUserPreference(channel: UserNotificationChannel, eventType: NotificationEventType) {
  return SUPPORTED_USER_NOTIFICATION_PREFERENCES.find(
    (entry) => entry.channel === channel && entry.eventType === eventType,
  )
}
