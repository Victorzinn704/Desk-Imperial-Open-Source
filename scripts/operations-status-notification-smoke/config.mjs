export const SMOKE_CONFIG = Object.freeze({
  apiBaseUrl: process.env.DESK_SMOKE_API_BASE_URL ?? 'https://api.deskimperial.online/api/v1',
  demoStaffCode: process.env.DESK_SMOKE_DEMO_STAFF_CODE ?? 'VD-001',
  eventTimeoutMs: Number.parseInt(process.env.DESK_SMOKE_EVENT_TIMEOUT_MS ?? '15000', 10),
  socketBaseUrl: process.env.DESK_SMOKE_SOCKET_BASE_URL ?? 'https://api.deskimperial.online',
  socketOrigin: process.env.DESK_SMOKE_SOCKET_ORIGIN ?? 'https://app.deskimperial.online',
})

export const NOTIFICATION_EVENTS = Object.freeze({
  comandaStatus: 'operations.comanda.status_changed',
  kitchenStatus: 'operations.kitchen_item.status_changed',
})

export const REALTIME_EVENTS = Object.freeze({
  comandaClosed: 'comanda.closed',
  comandaOpened: 'comanda.opened',
  comandaUpdated: 'comanda.updated',
  kitchenItemQueued: 'kitchen.item.queued',
  kitchenItemUpdated: 'kitchen.item.updated',
})
