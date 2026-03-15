import type {
  FinanceSummaryResponse,
  OrderRecord,
  OrdersResponse,
  ProductRecord,
  ProductsResponse,
} from '@contracts/contracts'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

type JsonBody = Record<string, unknown>

export type CookiePreferences = {
  necessary: boolean
  analytics: boolean
  marketing: boolean
}

export type AuthUser = {
  userId: string
  sessionId: string
  fullName: string
  companyName: string | null
  email: string
  status: string
  cookiePreferences: CookiePreferences
}

export type AuthResponse = {
  user: AuthUser
  session: {
    expiresAt: string
  }
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
  cookiePreferences: CookiePreferences
}

export type ProductPayload = {
  name: string
  category: string
  description?: string
  unitCost: number
  unitPrice: number
  stock: number
}

export type OrderPayload = {
  productId: string
  quantity: number
  customerName?: string
  channel?: string
  notes?: string
}

export type LoginPayload = {
  email: string
  password: string
}

export type RegisterPayload = {
  fullName: string
  companyName?: string
  email: string
  password: string
  acceptTerms: boolean
  acceptPrivacy: boolean
  analyticsCookies?: boolean
  marketingCookies?: boolean
}

export type CookiePreferencePayload = {
  analytics: boolean
  marketing: boolean
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function login(payload: LoginPayload) {
  return apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: payload,
  })
}

export async function register(payload: RegisterPayload) {
  return apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: payload,
  })
}

export async function logout() {
  return apiFetch<{ success: boolean }>('/auth/logout', {
    method: 'POST',
  })
}

export async function fetchCurrentUser() {
  return apiFetch<{ user: AuthUser }>('/auth/me', {
    method: 'GET',
  })
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

export async function fetchProducts() {
  return apiFetch<ProductsResponse>('/products', {
    method: 'GET',
  })
}

export async function createProduct(payload: ProductPayload) {
  return apiFetch<{ product: ProductRecord }>('/products', {
    method: 'POST',
    body: payload,
  })
}

export async function updateProduct(productId: string, payload: Partial<ProductPayload> & { active?: boolean }) {
  return apiFetch<{ product: ProductRecord }>(`/products/${productId}`, {
    method: 'PATCH',
    body: payload,
  })
}

export async function archiveProduct(productId: string) {
  return apiFetch<{ product: ProductRecord }>(`/products/${productId}`, {
    method: 'DELETE',
  })
}

export async function restoreProduct(productId: string) {
  return apiFetch<{ product: ProductRecord }>(`/products/${productId}/restore`, {
    method: 'POST',
  })
}

export async function fetchFinanceSummary() {
  return apiFetch<FinanceSummaryResponse>('/finance/summary', {
    method: 'GET',
  })
}

export async function fetchOrders() {
  return apiFetch<OrdersResponse>('/orders?includeCancelled=true', {
    method: 'GET',
  })
}

export async function createOrder(payload: OrderPayload) {
  return apiFetch<{ order: OrderRecord }>('/orders', {
    method: 'POST',
    body: payload,
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
    body: payload,
  })
}

async function apiFetch<T>(
  path: string,
  options: Omit<RequestInit, 'body'> & {
    body?: JsonBody
  },
) {
  const headers = new Headers(options.headers)
  const body = options.body

  if (body) {
    headers.set('Content-Type', 'application/json')
  }

  headers.set('Accept', 'application/json')

  const response = await fetch(buildApiUrl(path), {
    ...options,
    credentials: 'include',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    throw await toApiError(response)
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return undefined as T
  }

  return (await response.json()) as T
}

function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}/api${normalizedPath}`
}

async function toApiError(response: Response) {
  const fallbackMessage =
    response.status >= 500 ? 'O servidor encontrou um erro inesperado.' : 'Nao foi possivel concluir a requisicao.'
  const contentType = response.headers.get('content-type') ?? ''

  if (!contentType.includes('application/json')) {
    return new ApiError(fallbackMessage, response.status)
  }

  const payload = (await response.json()) as {
    message?: string | string[]
  }

  const message = Array.isArray(payload.message) ? payload.message.join(' ') : payload.message
  return new ApiError(message || fallbackMessage, response.status)
}
