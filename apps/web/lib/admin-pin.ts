import { ApiError } from '@/lib/api'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const ADMIN_PIN_HINT_KEY = 'desk_imperial_admin_pin_hint'
const DEFAULT_ADMIN_PIN_HINT_TTL_MS = 10 * 60 * 1000
const CSRF_STORAGE_KEY = 'desk-imperial-csrf-token'
const ADMIN_PIN_REQUEST_TIMEOUT_MS = 10_000

export type AdminPinVerificationResponse = {
  valid?: boolean
  verifiedAt?: string
  verifiedUntil?: string
  message?: string
}

type AdminPinHint = {
  verifiedAt: string
  verifiedUntil: string
}

let __storageLock = false

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}/api${normalizedPath}`
}

function getCsrfToken(): string | null {
  if (typeof window === 'undefined') return null

  const CSRF_COOKIE_NAMES = ['__Host-partner_csrf', 'partner_csrf']
  const cookie = document.cookie
    .split('; ')
    .find((entry) => CSRF_COOKIE_NAMES.some((name) => entry.startsWith(`${name}=`)))

  const cookieToken = cookie ? (cookie.split('=')[1] ?? null) : null
  if (cookieToken) return cookieToken

  const persisted = window.sessionStorage.getItem(CSRF_STORAGE_KEY)
  if (persisted) return persisted

  return null
}

async function buildAdminApiError(response: Response): Promise<ApiError> {
  const contentType = response.headers.get('content-type') ?? ''
  const fallback =
    response.status >= 500 ? 'O servidor encontrou um erro inesperado.' : 'Não foi possível concluir a requisição.'

  if (!contentType.includes('application/json')) {
    return new ApiError(fallback, response.status)
  }

  const payload = (await response.json()) as { message?: string | string[] }
  const message = Array.isArray(payload.message) ? payload.message.join(' ') : payload.message
  return new ApiError(message || fallback, response.status)
}

async function adminApiFetch<T>(
  path: string,
  method: 'POST' | 'DELETE' | 'GET',
  body?: Record<string, unknown>,
): Promise<T> {
  const headers = new Headers()
  headers.set('Accept', 'application/json')

  if (body) {
    headers.set('Content-Type', 'application/json')
  }

  // Attach CSRF token for state-mutating requests
  if (method !== 'GET') {
    const csrfToken = getCsrfToken()
    if (csrfToken) {
      headers.set('X-CSRF-Token', csrfToken)
    } else {
      console.warn('[CSRF] No token found for admin-pin request:', path, 'method:', method)
    }
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), ADMIN_PIN_REQUEST_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(buildUrl(path), {
      method,
      credentials: 'include',
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('A verificacao de PIN demorou demais. Tente novamente.', 504)
    }

    throw error
  } finally {
    clearTimeout(timeoutId)
  }

  if (!response.ok) {
    throw await buildAdminApiError(response)
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

// ---------------------------------------------------------------------------
// PIN API functions
// ---------------------------------------------------------------------------

/**
 * Verify the admin PIN with the server.
 * The server is expected to set the short-lived proof via HttpOnly cookie.
 */
export async function verifyAdminPin(pin: string): Promise<AdminPinVerificationResponse> {
  return adminApiFetch<AdminPinVerificationResponse>('/admin/verify-pin', 'POST', { pin })
}

/**
 * Setup or change the admin PIN.
 * Pass `currentPin` when changing an existing PIN.
 */
export async function setupAdminPin(pin: string, currentPin?: string): Promise<void> {
  const body: Record<string, unknown> = { pin }
  if (currentPin !== undefined) {
    body.currentPin = currentPin
  }
  await adminApiFetch<void>('/admin/pin', 'POST', body)
  clearAdminPinVerification()
}

/**
 * Remove the admin PIN.
 * The current PIN must be provided to confirm the operation.
 */
export async function removeAdminPin(pin: string): Promise<void> {
  await adminApiFetch<void>('/admin/pin', 'DELETE', { pin })
  clearAdminPinVerification()
}

/**
 * Store a non-sensitive hint that the PIN was recently verified.
 * This is UX only and does not carry authorization.
 */
function resolveExpiryDate(verifiedUntil: string | Date | null | undefined): Date {
  if (verifiedUntil instanceof Date) return verifiedUntil
  if (typeof verifiedUntil === 'string') {
    const parsed = new Date(verifiedUntil)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return new Date(Date.now() + DEFAULT_ADMIN_PIN_HINT_TTL_MS)
}

export function rememberAdminPinVerification(verifiedUntil?: string | Date | null): void {
  if (typeof window === 'undefined') return
  if (__storageLock) return

  try {
    __storageLock = true
    const hint: AdminPinHint = {
      verifiedAt: new Date().toISOString(),
      verifiedUntil: resolveExpiryDate(verifiedUntil).toISOString(),
    }

    window.sessionStorage.setItem(ADMIN_PIN_HINT_KEY, JSON.stringify(hint))
  } finally {
    __storageLock = false
  }
}

export function clearAdminPinVerification(): void {
  if (typeof window === 'undefined') return
  if (__storageLock) return

  try {
    __storageLock = true
    window.sessionStorage.removeItem(ADMIN_PIN_HINT_KEY)
  } finally {
    __storageLock = false
  }
}

function isValidTimestamp(value: string | undefined): number | null {
  if (!value) return null
  const ts = new Date(value).getTime()
  return Number.isNaN(ts) ? null : ts
}

export function hasRecentAdminPinVerification(ttlMs = DEFAULT_ADMIN_PIN_HINT_TTL_MS): boolean {
  if (typeof window === 'undefined') return false

  const rawHint = globalThis.sessionStorage.getItem(ADMIN_PIN_HINT_KEY)
  if (!rawHint) return false

  try {
    const hint = JSON.parse(rawHint) as Partial<AdminPinHint>
    const now = Date.now()
    const verifiedUntil = isValidTimestamp(hint.verifiedUntil)
    if (verifiedUntil !== null && now < verifiedUntil) return true

    const verifiedAt = isValidTimestamp(hint.verifiedAt)
    if (verifiedAt !== null && now - verifiedAt < ttlMs) return true
  } catch {
    window.sessionStorage.removeItem(ADMIN_PIN_HINT_KEY)
  }

  return false
}
