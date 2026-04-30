export type NotificationChannel = 'TELEGRAM' | 'EMAIL' | 'WEBHOOK'

export type NotificationRecipientScope = 'WORKSPACE_OWNER' | 'WORKSPACE_MANAGERS' | 'WORKSPACE_OPERATIONS'

export type NotificationEventType =
  | 'sales.daily_summary'
  | 'sales.weekly_summary'
  | 'inventory.low_stock'
  | 'cash.closed'
  | 'operations.alert'

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
