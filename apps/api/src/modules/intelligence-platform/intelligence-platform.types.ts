import type { NotificationChannelCapability } from '../notifications/notifications.types'

export type IntelligenceChannel = 'WEB' | 'PWA' | 'TELEGRAM'

export type IntelligenceToolId =
  | 'sales.summary.today'
  | 'finance.summary.period'
  | 'inventory.low-stock.list'
  | 'operations.comandas.open'
  | 'employees.performance.ranking'
  | 'cash.close.request'

export type IntelligenceToolDefinition = {
  id: IntelligenceToolId
  title: string
  ownerModule: 'finance' | 'products' | 'operations' | 'employees'
  kind: 'read' | 'action'
  description: string
  allowedRoles: Array<'OWNER' | 'STAFF'>
  channels: IntelligenceChannel[]
  requiresStepUp: boolean
}

export type IntelligenceCapabilityResponse = {
  generatedAt: string
  actorRole: 'OWNER' | 'STAFF'
  ragMode: 'internal-docs-only'
  freeTextChatEnabled: false
  mutationPolicy: {
    stepUpRequired: boolean
    idempotencyRequired: true
  }
  deliveryChannels: NotificationChannelCapability[]
  tools: IntelligenceToolDefinition[]
}
