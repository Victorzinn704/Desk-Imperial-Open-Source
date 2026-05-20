export type NotificationChannel = 'TELEGRAM' | 'EMAIL' | 'WEBHOOK'
export type UserNotificationChannel = 'WEB_TOAST' | 'MOBILE_TOAST'

export type NotificationRecipientScope = 'WORKSPACE_OWNER' | 'WORKSPACE_MANAGERS' | 'WORKSPACE_OPERATIONS'

export type NotificationEventType =
  | 'sales.daily_summary'
  | 'sales.weekly_summary'
  | 'inventory.low_stock'
  | 'cash.closed'
  | 'operations.alert'
  | 'operations.comanda.status_changed'
  | 'operations.kitchen_item.status_changed'

export type WorkspaceNotificationPreference = {
  channel: NotificationChannel
  eventType: NotificationEventType
  enabled: boolean
  inherited: boolean
}

export type UserNotificationPreference = {
  channel: UserNotificationChannel
  eventType: NotificationEventType
  enabled: boolean
  inherited: boolean
}

export type NotificationDeliveryState = 'queued' | 'sent' | 'failed' | 'suppressed'

export type NotificationEnvelope = {
  workspaceOwnerUserId: string
  actorUserId?: string | null | undefined
  eventType: NotificationEventType
  recipientScope: NotificationRecipientScope
  payload: Record<string, unknown>
  idempotencyKey: string
  preferredChannels?: NotificationChannel[] | undefined
}

export type NotificationChannelCapability = {
  channel: NotificationChannel
  enabled: boolean
  mode: 'outbound' | 'disabled'
  reason?: string | undefined
}

export type QueuedNotificationResult = {
  state: NotificationDeliveryState
  channels: NotificationChannel[]
  idempotencyKey: string
  queuedAt: string
  suppressedReason?: string | undefined
}

export const SUPPORTED_WORKSPACE_NOTIFICATION_PREFERENCES = [
  {
    channel: 'TELEGRAM',
    eventType: 'operations.comanda.status_changed',
    enabled: true,
  },
  {
    channel: 'TELEGRAM',
    eventType: 'operations.kitchen_item.status_changed',
    enabled: true,
  },
] as const satisfies ReadonlyArray<Pick<WorkspaceNotificationPreference, 'channel' | 'eventType' | 'enabled'>>

export const SUPPORTED_USER_NOTIFICATION_PREFERENCES = [
  {
    channel: 'WEB_TOAST',
    eventType: 'operations.comanda.status_changed',
    enabled: true,
  },
  {
    channel: 'WEB_TOAST',
    eventType: 'operations.kitchen_item.status_changed',
    enabled: true,
  },
  {
    channel: 'MOBILE_TOAST',
    eventType: 'operations.comanda.status_changed',
    enabled: true,
  },
  {
    channel: 'MOBILE_TOAST',
    eventType: 'operations.kitchen_item.status_changed',
    enabled: true,
  },
] as const satisfies ReadonlyArray<Pick<UserNotificationPreference, 'channel' | 'eventType' | 'enabled'>>
