import { type ApiBody, apiFetch } from './api-core'

export type TelegramIntegrationStatusResponse = {
  enabled: boolean
  workspaceEnabled: boolean
  restrictionReason: 'environment_disabled' | 'workspace_closed' | null
  botUsername: string | null
  deeplinkBase: string | null
  linked: boolean
  account: {
    telegramChatId: string
    telegramUserId: string
    telegramUsername: string | null
    status: string
    linkedAt: string
    lastActiveAt: string
  } | null
}

export type TelegramLinkTokenResponse = {
  token: string
  deeplink: string
  expiresAt: string
  botUsername: string
}

export type TelegramUnlinkResponse = {
  success: true
  revokedCount: number
}

export const WORKSPACE_NOTIFICATION_PREFERENCES_QUERY_KEY = ['notifications', 'preferences', 'workspace'] as const
export const USER_NOTIFICATION_PREFERENCES_QUERY_KEY = ['notifications', 'preferences', 'me'] as const

export type WorkspaceNotificationPreference = {
  channel: 'TELEGRAM' | 'EMAIL' | 'WEBHOOK'
  eventType:
    | 'sales.daily_summary'
    | 'sales.weekly_summary'
    | 'inventory.low_stock'
    | 'cash.closed'
    | 'operations.alert'
    | 'operations.comanda.status_changed'
    | 'operations.kitchen_item.status_changed'
  enabled: boolean
  inherited: boolean
}

export type UserNotificationPreference = {
  channel: 'WEB_TOAST' | 'MOBILE_TOAST'
  eventType:
    | 'sales.daily_summary'
    | 'sales.weekly_summary'
    | 'inventory.low_stock'
    | 'cash.closed'
    | 'operations.alert'
    | 'operations.comanda.status_changed'
    | 'operations.kitchen_item.status_changed'
  enabled: boolean
  inherited: boolean
}

export type NotificationPreferencesResponse = {
  preferences: WorkspaceNotificationPreference[]
}

export type UserNotificationPreferencesResponse = {
  preferences: UserNotificationPreference[]
}

export async function fetchTelegramIntegrationStatus() {
  return apiFetch<TelegramIntegrationStatusResponse>('/notifications/telegram/status', {
    method: 'GET',
  })
}

export async function createTelegramLinkToken() {
  return apiFetch<TelegramLinkTokenResponse>('/notifications/telegram/link-token', {
    method: 'POST',
    body: {} as ApiBody,
  })
}

export async function unlinkTelegramIntegration() {
  return apiFetch<TelegramUnlinkResponse>('/notifications/telegram/link', {
    method: 'DELETE',
  })
}

export async function fetchWorkspaceNotificationPreferences() {
  return apiFetch<NotificationPreferencesResponse>('/notifications/preferences/workspace', {
    method: 'GET',
  })
}

export async function updateWorkspaceNotificationPreferences(preferences: WorkspaceNotificationPreference[]) {
  return apiFetch<NotificationPreferencesResponse>('/notifications/preferences/workspace', {
    method: 'POST',
    body: {
      preferences: preferences.map((preference) => ({
        channel: preference.channel,
        eventType: preference.eventType,
        enabled: preference.enabled,
      })),
    } as ApiBody,
  })
}

export async function fetchUserNotificationPreferences() {
  return apiFetch<UserNotificationPreferencesResponse>('/notifications/preferences/me', {
    method: 'GET',
  })
}

export async function updateUserNotificationPreferences(preferences: UserNotificationPreference[]) {
  return apiFetch<UserNotificationPreferencesResponse>('/notifications/preferences/me', {
    method: 'POST',
    body: {
      preferences: preferences.map((preference) => ({
        channel: preference.channel,
        eventType: preference.eventType,
        enabled: preference.enabled,
      })),
    } as ApiBody,
  })
}
