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

export type TelegramHealthResponse = {
  status: 'ok' | 'degraded' | 'disabled'
  expectedWebhookUrl: string | null
  actualWebhookUrl: string | null
  pendingUpdateCount: number | null
  lastErrorMessage: string | null
  lastErrorAt: string | null
  reason?: string
  runtime?: {
    enabled: boolean
    queueDepth: { inbound: number; outbound: number; delayed: number }
    lastMinute: {
      received: number
      sent: number
      errors: number
      rate_429: number
      drops_inbound: number
      drops_outbound: number
      retries_outbound: number
    }
  }
}
