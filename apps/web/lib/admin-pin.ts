/**
 * Admin PIN — API client functions.
 * PIN verification and management are handled server-side.
 * The resulting adminPinToken is stored in sessionStorage (not localStorage)
 * so it expires automatically when the browser tab/session is closed.
 */

import { ApiError } from '@/lib/api'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const ADMIN_TOKEN_KEY = 'desk_imperial_admin_token'
const CSRF_STORAGE_KEY = 'desk-imperial-csrf-token'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}/api${normalizedPath}`
}

function getCsrfToken(): string | null {
  if (typeof window === 'undefined') return null

  // 1. Persisted token from sessionStorage (same strategy as api.ts)
  const persisted = window.sessionStorage.getItem(CSRF_STORAGE_KEY)
  if (persisted) return persisted

  // 2. Fallback: cookie
  const CSRF_COOKIE_NAMES = ['__Host-partner_csrf', 'partner_csrf']
  const cookie = document.cookie
    .split('; ')
    .find((entry) => CSRF_COOKIE_NAMES.some((name) => entry.startsWith(`${name}=`)))
  return cookie ? (cookie.split('=')[1] ?? null) : null
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

  const response = await fetch(buildUrl(path), {
    method,
    credentials: 'include',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const contentType = response.headers.get('content-type') ?? ''
    const fallback =
      response.status >= 500
        ? 'O servidor encontrou um erro inesperado.'
        : 'Não foi possível concluir a requisição.'

    if (!contentType.includes('application/json')) {
      throw new ApiError(fallback, response.status)
    }

    const payload = (await response.json()) as { message?: string | string[] }
    const message = Array.isArray(payload.message)
      ? payload.message.join(' ')
      : payload.message
    throw new ApiError(message || fallback, response.status)
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
 * Returns an adminPinToken (JWT, valid for 10 minutes) on success.
 * Throws ApiError with status 401 (wrong PIN), 423 (rate-limited), or 404
 * (PIN not configured).
 */
export async function verifyAdminPin(pin: string): Promise<{ adminPinToken: string }> {
  return adminApiFetch<{ adminPinToken: string }>('/admin/verify-pin', 'POST', { pin })
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
}

/**
 * Remove the admin PIN.
 * The current PIN must be provided to confirm the operation.
 */
export async function removeAdminPin(pin: string): Promise<void> {
  await adminApiFetch<void>('/admin/pin', 'DELETE', { pin })
}

// ---------------------------------------------------------------------------
// adminPinToken — sessionStorage helpers
// ---------------------------------------------------------------------------

/**
 * Decode the expiration claim from a JWT without verifying the signature.
 * Returns the `exp` timestamp in milliseconds, or null if not present.
 */
function getJwtExp(token: string): number | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    // Base64url decode the payload
    const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
    const payload = JSON.parse(payloadJson) as { exp?: number }
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

/**
 * Returns the stored adminPinToken if it exists and has not expired.
 * Returns null if absent or expired.
 */
export function getStoredAdminPinToken(): string | null {
  if (typeof window === 'undefined') return null

  const token = window.sessionStorage.getItem(ADMIN_TOKEN_KEY)
  if (!token) return null

  const exp = getJwtExp(token)
  if (exp !== null && Date.now() >= exp) {
    // Token expired — clean up eagerly
    window.sessionStorage.removeItem(ADMIN_TOKEN_KEY)
    return null
  }

  return token
}

/**
 * Persist the adminPinToken in sessionStorage.
 * sessionStorage is scoped to the browser tab and cleared when the session ends —
 * safer than localStorage for short-lived security tokens.
 */
export function storeAdminPinToken(token: string): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(ADMIN_TOKEN_KEY, token)
}

/**
 * Remove the adminPinToken from sessionStorage.
 */
export function clearAdminPinToken(): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(ADMIN_TOKEN_KEY)
}
