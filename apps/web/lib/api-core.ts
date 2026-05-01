import { reportApiErrorToFaro, reportApiRequestMeasurementToFaro } from './observability/faro'
import { resolveApiBaseUrl } from './api-base-url'

const CSRF_COOKIE_NAMES = ['__Host-partner_csrf', 'partner_csrf']
const CSRF_STORAGE_KEY = 'desk-imperial-csrf-token'
const ADMIN_PIN_HINT_KEY = 'desk_imperial_admin_pin_hint'
const DEFAULT_API_TIMEOUT_MS = 20_000
const AUTH_API_TIMEOUT_MS = 10_000
const POSTAL_LOOKUP_TIMEOUT_MS = 6_000
const BARCODE_LOOKUP_TIMEOUT_MS = 6_000
const REQUEST_ID_HEADER = 'x-request-id'
const REQUEST_ID_FORWARD_HEADER = 'X-Request-Id'

export type JsonBody = Record<string, unknown>
export type ApiBody = JsonBody | FormData

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly requestId: string | null = null,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

class ApiTimeoutError extends Error {
  constructor(
    public readonly timeoutMs: number,
    public readonly requestPath: string,
  ) {
    super(`Request timed out after ${timeoutMs}ms`)
    this.name = 'ApiTimeoutError'
  }
}

export async function apiFetch<T>(
  path: string,
  options: Omit<RequestInit, 'body'> & {
    body?: ApiBody
    skipCsrf?: boolean
    timeoutMs?: number
  },
) {
  const method = (options.method ?? 'GET').toUpperCase()
  const headers = new Headers(options.headers)
  const body = options.body

  if (body && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  headers.set('Accept', 'application/json')

  if (!options.skipCsrf && shouldAttachCsrfToken(options.method)) {
    attachCsrfHeader(headers, path, options.method)
  }

  const clientRequestId = ensureRequestId(headers)
  const requestStartedAt = getCurrentTimeMs()

  let response: Response

  try {
    response = await fetchWithTimeout(
      buildApiUrl(path),
      {
        ...options,
        credentials: 'include',
        headers,
        body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
      },
      options.timeoutMs ?? resolveApiTimeoutMs(path),
      path,
    )
  } catch (error) {
    const elapsedMs = Math.max(0, getCurrentTimeMs() - requestStartedAt)
    throw buildFetchError(error, elapsedMs, path, method, clientRequestId)
  }

  const requestDurationMs = Math.max(0, getCurrentTimeMs() - requestStartedAt)
  const responseRequestId = readResponseRequestId(response) ?? clientRequestId

  reportApiRequestMeasurementToFaro({
    path,
    method,
    status: response.status,
    durationMs: requestDurationMs,
    requestId: responseRequestId,
  })

  if (!response.ok) {
    const apiError = await toApiError(response, responseRequestId)
    if (apiError.status >= 500) {
      reportApiErrorTelemetry(apiError, {
        path,
        method,
        requestId: responseRequestId,
      })
    }
    throw apiError
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return undefined as T
  }

  const payload = (await response.json()) as T

  if (hasCsrfToken(payload)) {
    persistCsrfToken(payload.csrfToken)
  }

  return payload
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

export {
  AUTH_API_TIMEOUT_MS,
  CSRF_COOKIE_NAMES,
  CSRF_STORAGE_KEY,
  ADMIN_PIN_HINT_KEY,
  DEFAULT_API_TIMEOUT_MS,
  POSTAL_LOOKUP_TIMEOUT_MS,
  BARCODE_LOOKUP_TIMEOUT_MS,
  REQUEST_ID_HEADER,
  REQUEST_ID_FORWARD_HEADER,
}

function buildFetchError(
  error: unknown,
  elapsedMs: number,
  path: string,
  method: string,
  clientRequestId: string,
): ApiError {
  const telemetryCtx = { path, method, requestId: clientRequestId }

  if (error instanceof ApiTimeoutError) {
    const timeoutApiError = new ApiError(
      `A requisicao demorou demais (${Math.ceil(error.timeoutMs / 1000)}s). Tente novamente.`,
      504,
      clientRequestId,
    )
    reportApiErrorTelemetry(timeoutApiError, telemetryCtx)
    reportApiRequestMeasurementToFaro({
      ...telemetryCtx,
      status: 504,
      durationMs: Math.max(elapsedMs, error.timeoutMs),
    })
    return timeoutApiError
  }

  const connectionApiError = new ApiError(
    `Nao foi possivel conectar com a API em ${resolveApiBaseUrl()}. Verifique se o backend esta ativo.`,
    0,
    clientRequestId,
  )
  reportApiErrorTelemetry(connectionApiError, telemetryCtx)
  reportApiRequestMeasurementToFaro({
    ...telemetryCtx,
    status: 0,
    durationMs: elapsedMs,
  })
  return connectionApiError
}

function buildApiUrl(path: string) {
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

async function toApiError(response: Response, requestId: string | null) {
  const fallbackMessage =
    response.status >= 500 ? 'O servidor encontrou um erro inesperado.' : 'Nao foi possivel concluir a requisicao.'
  const contentType = response.headers.get('content-type') ?? ''

  if (!contentType.includes('application/json')) {
    return new ApiError(fallbackMessage, response.status, requestId)
  }

  const payload = (await response.json()) as {
    message?: string | string[]
  }

  const message = Array.isArray(payload.message) ? payload.message.join(' ') : payload.message
  return new ApiError(message || fallbackMessage, response.status, requestId)
}

function shouldAttachCsrfToken(method: string | undefined) {
  const normalized = (method ?? 'GET').toUpperCase()
  return normalized !== 'GET' && normalized !== 'HEAD' && normalized !== 'OPTIONS'
}

function attachCsrfHeader(headers: Headers, path: string, method?: string) {
  const csrfToken = readCsrfToken() || readPersistedCsrfToken()
  if (csrfToken) {
    headers.set('X-CSRF-Token', csrfToken)
  } else {
    console.warn('[CSRF] No token found for request:', path, 'method:', method)
  }
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

function persistCsrfToken(value: string) {
  if (typeof globalThis.window === 'undefined' || !value) {
    return
  }

  globalThis.sessionStorage.setItem(CSRF_STORAGE_KEY, value)
}

function readPersistedCsrfToken() {
  if (typeof globalThis.window === 'undefined') {
    return null
  }

  return globalThis.sessionStorage.getItem(CSRF_STORAGE_KEY)
}

function hasCsrfToken(value: unknown): value is { csrfToken: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'csrfToken' in value &&
    typeof (value as { csrfToken?: unknown }).csrfToken === 'string'
  )
}

let fallbackRequestIdCounter = 0

export function isLegacyOwnerLoginContractError(error: ApiError) {
  if (error.status !== 400) {
    return false
  }

  const normalizedMessage = error.message.toLowerCase()
  return (
    normalizedMessage.includes('property loginmode should not exist') ||
    normalizedMessage.includes('property companyemail should not exist') ||
    normalizedMessage.includes('property employeecode should not exist')
  )
}

function readResponseRequestId(response: Response) {
  const requestId = response.headers.get(REQUEST_ID_HEADER)
  if (!requestId?.trim()) {
    return null
  }

  return requestId.trim()
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

function getCurrentTimeMs() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now()
  }

  return Date.now()
}

function reportApiErrorTelemetry(
  error: ApiError,
  context: {
    path: string
    method: string
    requestId?: string | null
  },
) {
  reportApiErrorToFaro(error, {
    path: context.path,
    method: context.method,
    status: error.status,
    requestId: context.requestId ?? error.requestId,
  })
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs: number, requestPath: string) {
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
