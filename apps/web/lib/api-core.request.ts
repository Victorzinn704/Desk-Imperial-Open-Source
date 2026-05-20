import { resolveApiBaseUrl } from './api-base-url'
import { ApiTimeoutError } from './api-core.errors'
import {
  ADMIN_PIN_HINT_KEY,
  type ApiBody,
  type ApiFetchOptions,
  AUTH_API_TIMEOUT_MS,
  CSRF_COOKIE_NAMES,
  CSRF_STORAGE_KEY,
  DEFAULT_API_TIMEOUT_MS,
  REQUEST_ID_FORWARD_HEADER,
  REQUEST_ID_HEADER,
} from './api-core.types'

let fallbackRequestIdCounter = 0

type PreparedApiRequest = {
  clientRequestId: string
  init: RequestInit
  method: string
  timeoutMs: number
  url: string
}

export function prepareApiRequest(path: string, options: ApiFetchOptions): PreparedApiRequest {
  const method = (options.method ?? 'GET').toUpperCase()
  const headers = new Headers(options.headers)
  const body = options.body

  configureJsonHeaders(headers, body)
  maybeAttachCsrfHeader({ headers, path, method, skipCsrf: options.skipCsrf })

  return {
    clientRequestId: ensureRequestId(headers),
    init: {
      ...options,
      credentials: 'include',
      headers,
      body: serializeApiBody(body),
    },
    method,
    timeoutMs: options.timeoutMs ?? resolveApiTimeoutMs(path),
    url: buildApiUrl(path),
  }
}

export function clearPersistedCsrfToken() {
  if (typeof globalThis.window === 'undefined') {
    return
  }

  globalThis.sessionStorage.removeItem(CSRF_STORAGE_KEY)
}

export function clearPersistedAdminPinHint() {
  if (typeof globalThis.window === 'undefined') {
    return
  }

  globalThis.sessionStorage.removeItem(ADMIN_PIN_HINT_KEY)
}

export function resolveApiTimeoutMs(path: string) {
  if (path.startsWith('/auth/')) {
    return AUTH_API_TIMEOUT_MS
  }

  return DEFAULT_API_TIMEOUT_MS
}

export function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${resolveApiBaseUrl()}/api/v1${normalizedPath}`
}

export function withOperationsOptions(path: string, options?: { includeSnapshot?: boolean }) {
  if (options?.includeSnapshot === undefined) {
    return path
  }

  const [basePath, existingQuery = ''] = path.split('?')
  const params = new URLSearchParams(existingQuery)
  params.set('includeSnapshot', String(options.includeSnapshot))
  const query = params.toString()

  return query ? `${basePath}?${query}` : basePath
}

export function hasCsrfToken(value: unknown): value is { csrfToken: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'csrfToken' in value &&
    typeof (value as { csrfToken?: unknown }).csrfToken === 'string'
  )
}

export function persistCsrfToken(value: string) {
  if (typeof globalThis.window === 'undefined' || !value) {
    return
  }

  globalThis.sessionStorage.setItem(CSRF_STORAGE_KEY, value)
}

export function readResponseRequestId(response: Response) {
  const requestId = response.headers.get(REQUEST_ID_HEADER)
  if (!requestId?.trim()) {
    return null
  }

  return requestId.trim()
}

export function getCurrentTimeMs() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now()
  }

  return Date.now()
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
  requestPath: string,
) {
  const controller = new AbortController()
  const timeoutHandle = setTimeout(() => {
    controller.abort()
  }, timeoutMs)

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiTimeoutError(timeoutMs, requestPath)
    }

    throw error
  } finally {
    clearTimeout(timeoutHandle)
  }
}

function configureJsonHeaders(headers: Headers, body: ApiBody | undefined) {
  if (body && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  headers.set('Accept', 'application/json')
}

function maybeAttachCsrfHeader(input: { headers: Headers; method: string; path: string; skipCsrf?: boolean }) {
  if (!input.skipCsrf && shouldAttachCsrfToken(input.method)) {
    attachCsrfHeader(input.headers, input.path, input.method)
  }
}

function shouldAttachCsrfToken(method: string) {
  return method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS'
}

function attachCsrfHeader(headers: Headers, path: string, method: string) {
  const csrfToken = readCsrfToken() || readPersistedCsrfToken()
  if (csrfToken) {
    headers.set('X-CSRF-Token', csrfToken)
    return
  }

  console.warn('[CSRF] No token found for request:', path, 'method:', method)
}

function readCsrfToken() {
  if (typeof document === 'undefined') {
    return null
  }

  const cookie = document.cookie
    .split('; ')
    .find((entry) => CSRF_COOKIE_NAMES.some((cookieName) => entry.startsWith(`${cookieName}=`)))

  return cookie ? (cookie.split('=')[1] ?? null) : null
}

function readPersistedCsrfToken() {
  if (typeof globalThis.window === 'undefined') {
    return null
  }

  return globalThis.sessionStorage.getItem(CSRF_STORAGE_KEY)
}

function ensureRequestId(headers: Headers) {
  const existingRequestId = headers.get(REQUEST_ID_HEADER)?.trim()
  if (existingRequestId) {
    headers.set(REQUEST_ID_FORWARD_HEADER, existingRequestId)
    return existingRequestId
  }

  const generatedRequestId = generateRequestId()
  headers.set(REQUEST_ID_FORWARD_HEADER, generatedRequestId)
  return generatedRequestId
}

function generateRequestId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  fallbackRequestIdCounter += 1
  return `${Date.now().toString(36)}-${fallbackRequestIdCounter.toString(36).padStart(4, '0')}`
}

function serializeApiBody(body: ApiBody | undefined) {
  if (!body) {
    return undefined
  }

  return body instanceof FormData ? body : JSON.stringify(body)
}
