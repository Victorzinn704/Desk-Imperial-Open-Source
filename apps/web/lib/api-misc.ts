import type { OrderRecord, OrdersResponse } from '@contracts/contracts'

import { apiFetch, POSTAL_LOOKUP_TIMEOUT_MS } from './api-core'
import type { ApiBody } from './api-core'
import { ApiError } from './api-core'

export type PostalCodeLookupResponse = {
  postalCode: string
  streetLine1: string | null
  addressComplement: string | null
  district: string | null
  city: string | null
  state: string | null
  stateName: string | null
  country: string
  source: 'viacep'
}

export type ConsentDocument = {
  id: string
  key: string
  title: string
  description?: string
  kind: string
  required: boolean
  active: boolean
}

export type ConsentOverview = {
  documents: ConsentDocument[]
  legalAcceptances: Array<{
    key: string
    acceptedAt: string
  }>
  cookiePreferences: {
    necessary: boolean
    analytics: boolean
    marketing: boolean
  }
}

export type LastLoginEntry = {
  id: string
  browser: string
  os: string
  ipAddress: string | null
  createdAt: string
}

export type ActivityFeedEntry = {
  id: string
  event: string
  resource: string
  resourceId: string | null
  severity: 'INFO' | 'WARN' | 'ERROR'
  actorUserId: string | null
  actorName: string | null
  actorRole: 'OWNER' | 'STAFF' | null
  ipAddress: string | null
  createdAt: string
  metadata: Record<string, unknown> | null
}

export type OrderPayload = {
  items: Array<{
    productId: string
    quantity: number
    unitPrice?: number
  }>
  customerName: string
  buyerType: 'PERSON' | 'COMPANY'
  buyerDocument: string
  buyerDistrict?: string
  buyerCity: string
  buyerState?: string
  buyerCountry: string
  sellerEmployeeId?: string
  currency?: string
  channel?: string
  notes?: string
}

export type CookiePreferencePayload = {
  analytics: boolean
  marketing: boolean
}

export type FetchOrdersOptions = {
  includeCancelled?: boolean
  includeItems?: boolean
  limit?: number
}

export async function lookupPostalCode(postalCode: string) {
  let response: Response

  try {
    response = await fetchWithTimeout(
      '/api/postal-code/lookup',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ postalCode }),
      },
      POSTAL_LOOKUP_TIMEOUT_MS,
      '/api/postal-code/lookup',
    )
  } catch (error) {
    if (error instanceof ApiError && error.name === 'ApiTimeoutError') {
      throw new ApiError('Consulta de CEP demorou demais. Tente novamente em instantes.', 504)
    }
    throw new ApiError('Nao foi possivel consultar o CEP agora.', 0)
  }

  if (!response.ok) {
    throw await toApiError(response, readResponseRequestId(response))
  }

  return (await response.json()) as PostalCodeLookupResponse
}

export async function fetchConsentDocuments() {
  return apiFetch<ConsentDocument[]>('/consent/documents', {
    method: 'GET',
  })
}

export async function fetchConsentOverview() {
  return apiFetch<ConsentOverview>('/consent/me', {
    method: 'GET',
  })
}

export async function fetchOrders(options?: FetchOrdersOptions) {
  const params = new URLSearchParams()

  if (options?.includeCancelled !== undefined) {
    params.set('includeCancelled', String(options.includeCancelled))
  }

  if (options?.includeItems !== undefined) {
    params.set('includeItems', String(options.includeItems))
  }

  if (options?.limit !== undefined) {
    params.set('limit', String(options.limit))
  }

  const suffix = params.toString() ? `?${params.toString()}` : ''
  return apiFetch<OrdersResponse>(`/orders${suffix}`, {
    method: 'GET',
  })
}

export async function fetchLastLogins() {
  return apiFetch<LastLoginEntry[]>('/auth/activity', { method: 'GET' })
}

export async function fetchActivityFeed() {
  return apiFetch<ActivityFeedEntry[]>('/auth/activity-feed', { method: 'GET' })
}

export async function createOrder(payload: OrderPayload) {
  return apiFetch<{ order: OrderRecord }>('/orders', {
    method: 'POST',
    body: payload as ApiBody,
  })
}

export async function cancelOrder(orderId: string) {
  return apiFetch<{ order: OrderRecord }>(`/orders/${orderId}/cancel`, {
    method: 'POST',
  })
}

export async function updateCookiePreferences(payload: CookiePreferencePayload) {
  return apiFetch<CookiePreferencePayload>('/consent/preferences', {
    method: 'POST',
    body: payload as ApiBody,
  })
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

function readResponseRequestId(response: Response) {
  const requestId = response.headers.get('x-request-id')
  if (!requestId?.trim()) {
    return null
  }
  return requestId.trim()
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
