export const CSRF_COOKIE_NAMES = ['__Host-partner_csrf', 'partner_csrf']
export const CSRF_STORAGE_KEY = 'desk-imperial-csrf-token'
export const ADMIN_PIN_HINT_KEY = 'desk_imperial_admin_pin_hint'
export const DEFAULT_API_TIMEOUT_MS = 20_000
export const AUTH_API_TIMEOUT_MS = 10_000
export const POSTAL_LOOKUP_TIMEOUT_MS = 6_000
export const BARCODE_LOOKUP_TIMEOUT_MS = 6_000
export const REQUEST_ID_HEADER = 'x-request-id'
export const REQUEST_ID_FORWARD_HEADER = 'X-Request-Id'

export type JsonBody = Record<string, unknown>
export type ApiBody = JsonBody | FormData

export type ApiFetchOptions = Omit<RequestInit, 'body'> & {
  body?: ApiBody
  skipCsrf?: boolean
  timeoutMs?: number
}

export type ApiRequestTelemetryContext = {
  path: string
  method: string
  requestId?: string | null
}
