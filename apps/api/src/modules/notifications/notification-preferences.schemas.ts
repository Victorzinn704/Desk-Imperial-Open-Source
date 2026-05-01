import { z } from 'zod'
import {
  SUPPORTED_USER_NOTIFICATION_PREFERENCES,
  SUPPORTED_WORKSPACE_NOTIFICATION_PREFERENCES,
} from './notifications.types'

const supportedWorkspaceChannelSchema = z.enum(
  SUPPORTED_WORKSPACE_NOTIFICATION_PREFERENCES.map((entry) => entry.channel) as [string, ...string[]],
)

const supportedWorkspaceEventTypeSchema = z.enum(
  SUPPORTED_WORKSPACE_NOTIFICATION_PREFERENCES.map((entry) => entry.eventType) as [string, ...string[]],
)

const supportedUserChannelSchema = z.enum(
  SUPPORTED_USER_NOTIFICATION_PREFERENCES.map((entry) => entry.channel) as [string, ...string[]],
)

const supportedUserEventTypeSchema = z.enum(
  SUPPORTED_USER_NOTIFICATION_PREFERENCES.map((entry) => entry.eventType) as [string, ...string[]],
)

export const updateWorkspaceNotificationPreferencesBodySchema = z
  .object({
    preferences: z
      .array(
        z
          .object({
            channel: supportedWorkspaceChannelSchema,
            eventType: supportedWorkspaceEventTypeSchema,
            enabled: z.boolean(),
          })
          .strict(),
      )
      .min(1)
      .max(SUPPORTED_WORKSPACE_NOTIFICATION_PREFERENCES.length),
  })
  .strict()

export const updateUserNotificationPreferencesBodySchema = z
  .object({
    preferences: z
      .array(
        z
          .object({
            channel: supportedUserChannelSchema,
            eventType: supportedUserEventTypeSchema,
            enabled: z.boolean(),
          })
          .strict(),
      )
      .min(1)
      .max(SUPPORTED_USER_NOTIFICATION_PREFERENCES.length),
  })
  .strict()

export type UpdateWorkspaceNotificationPreferencesDto = z.infer<typeof updateWorkspaceNotificationPreferencesBodySchema>
export type UpdateUserNotificationPreferencesDto = z.infer<typeof updateUserNotificationPreferencesBodySchema>
