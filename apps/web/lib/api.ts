import type {
  CurrencyCode,
  FinanceSummaryResponse,
  MarketInsightResponse,
  OrderRecord,
  OrdersResponse,
  ProductImportResponse,
  ProductRecord,
  ProductsResponse,
} from '@contracts/contracts'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const CSRF_COOKIE_NAMES = ['__Host-partner_csrf', 'partner_csrf']
const CSRF_STORAGE_KEY = 'desk-imperial-csrf-token'

type JsonBody = Record<string, unknown>
type ApiBody = JsonBody | FormData

export type CookiePreferences = {
  necessary: boolean
  analytics: boolean
  marketing: boolean
}

export type EvaluationAccess = {
  dailyLimitMinutes: number
  remainingSeconds: number
  sessionExpiresAt: string
}

export type AuthUser = {
  userId: string
  sessionId: string
  fullName: string
  companyName: string | null
  email: string
  emailVerified: boolean
  preferredCurrency: CurrencyCode
  status: string
  evaluationAccess: EvaluationAccess | null
  cookiePreferences: CookiePreferences
}

export type AuthResponse = {
  user: AuthUser
  csrfToken?: string
  session: {
    expiresAt: string
  }
}

export type SimpleMessageResponse = {
  success: boolean
  message: string
  email?: string
  deliveryMode?: 'email' | 'preview'
  previewCode?: string
  previewExpiresAt?: string
}

export type VerificationChallengeResponse = {
  success: boolean
  requiresEmailVerification?: boolean
  email: string
  message: string
  deliveryMode?: 'email' | 'preview'
  previewCode?: string
  previewExpiresAt?: string
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
  brand?: string
  category: string
  packagingClass: string
  measurementUnit: string
  measurementValue: number
  unitsPerPackage: number
  description?: string
  unitCost: number
  unitPrice: number
  currency: CurrencyCode
  stock: number
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
  currency?: CurrencyCode
  channel?: string
  notes?: string
}

export type EmployeeRecord = {
  id: string
  employeeCode: string
  displayName: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export type EmployeesResponse = {
  items: EmployeeRecord[]
  totals: {
    totalEmployees: number
    activeEmployees: number
  }
}

export type EmployeePayload = {
  employeeCode: string
  displayName: string
}

export type ProfilePayload = {
  fullName: string
  companyName?: string
  preferredCurrency: CurrencyCode
}

export type LoginPayload = {
  email: string
  password: string
}

export type ForgotPasswordPayload = {
  email: string
}

export type ResetPasswordPayload = {
  email: string
  code: string
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
  return apiFetch<VerificationChallengeResponse>('/auth/register', {
    method: 'POST',
    body: payload,
  })
}

export async function logout() {
  const response = await apiFetch<{ success: boolean }>('/auth/logout', {
    method: 'POST',
  })
  clearPersistedCsrfToken()
  return response
}

export async function forgotPassword(payload: ForgotPasswordPayload) {
  return apiFetch<SimpleMessageResponse>('/auth/forgot-password', {
    method: 'POST',
    body: payload,
  })
}

export async function requestEmailVerification(payload: ForgotPasswordPayload) {
  return apiFetch<SimpleMessageResponse>('/auth/verify-email/request', {
    method: 'POST',
    body: payload,
  })
}

export async function verifyEmail(payload: { email: string; code: string }) {
  return apiFetch<SimpleMessageResponse>('/auth/verify-email/confirm', {
    method: 'POST',
    body: payload,
  })
}

export async function resetPassword(payload: ResetPasswordPayload) {
  return apiFetch<SimpleMessageResponse>('/auth/reset-password', {
    method: 'POST',
    body: payload,
  })
}

export async function fetchCurrentUser() {
  return apiFetch<{ user: AuthUser; csrfToken?: string }>('/auth/me', {
    method: 'GET',
  })
}

export async function updateProfile(payload: ProfilePayload) {
  return apiFetch<{ user: AuthUser; csrfToken?: string }>('/auth/profile', {
    method: 'PATCH',
    body: payload,
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
  return apiFetch<ProductsResponse>('/products?includeInactive=true', {
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

export async function importProducts(file: File) {
  const formData = new FormData()
  formData.set('file', file)

  return apiFetch<ProductImportResponse>('/products/import', {
    method: 'POST',
    body: formData,
  })
}

export async function fetchFinanceSummary() {
  return apiFetch<FinanceSummaryResponse>('/finance/summary', {
    method: 'GET',
  })
}

export async function fetchPillars() {
  return apiFetch<{
    weeklyRevenue: { label: string; value: number; currency: string; previousValue: number; changePercent: number; trend: number[] }
    monthlyRevenue: { label: string; value: number; currency: string; previousValue: number; changePercent: number; trend: number[] }
    profit: { label: string; value: number; currency: string; previousValue: number; changePercent: number; trend: number[] }
    eventRevenue: { label: string; value: number; currency: string; previousValue: number; changePercent: number; trend: number[] }
    normalRevenue: { label: string; value: number; currency: string; previousValue: number; changePercent: number; trend: number[] }
  }>('/finance/pillars', {
    method: 'GET',
  })
}

export async function fetchMarketInsight(focus?: string) {
  const params = new URLSearchParams()
  if (focus?.trim()) {
    params.set('focus', focus.trim())
  }

  const suffix = params.toString() ? `?${params.toString()}` : ''
  return apiFetch<MarketInsightResponse>(`/market-intelligence/insights${suffix}`, {
    method: 'GET',
  })
}

export async function fetchOrders() {
  return apiFetch<OrdersResponse>('/orders?includeCancelled=true', {
    method: 'GET',
  })
}

export async function fetchEmployees() {
  return apiFetch<EmployeesResponse>('/employees', {
    method: 'GET',
  })
}

export async function createEmployee(payload: EmployeePayload) {
  return apiFetch<{ employee: EmployeeRecord }>('/employees', {
    method: 'POST',
    body: payload,
  })
}

export async function archiveEmployee(employeeId: string) {
  return apiFetch<{ employee: EmployeeRecord }>(`/employees/${employeeId}`, {
    method: 'DELETE',
  })
}

export async function restoreEmployee(employeeId: string) {
  return apiFetch<{ employee: EmployeeRecord }>(`/employees/${employeeId}/restore`, {
    method: 'POST',
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
    body?: ApiBody
  },
) {
  const headers = new Headers(options.headers)
  const body = options.body

  if (body && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  headers.set('Accept', 'application/json')

  if (shouldAttachCsrfToken(options.method)) {
    const csrfToken = readPersistedCsrfToken() ?? readCsrfToken()
    if (csrfToken) {
      headers.set('X-CSRF-Token', csrfToken)
    }
  }

  const response = await fetch(buildApiUrl(path), {
    ...options,
    credentials: 'include',
    headers,
    body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
  })

  if (!response.ok) {
    throw await toApiError(response)
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

function shouldAttachCsrfToken(method: string | undefined) {
  const normalized = (method ?? 'GET').toUpperCase()
  return normalized !== 'GET' && normalized !== 'HEAD' && normalized !== 'OPTIONS'
}

function readCsrfToken() {
  if (typeof document === 'undefined') {
    return null
  }

  const cookie = document.cookie
    .split('; ')
    .find((entry) => CSRF_COOKIE_NAMES.some((cookieName) => entry.startsWith(`${cookieName}=`)))

  return cookie ? cookie.split('=')[1] ?? null : null
}

function persistCsrfToken(value: string) {
  if (typeof window === 'undefined' || !value) {
    return
  }

  // sessionStorage: escopo de aba, limpo ao fechar — menos exposto a XSS persistente que localStorage
  window.sessionStorage.setItem(CSRF_STORAGE_KEY, value)
}

function readPersistedCsrfToken() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.sessionStorage.getItem(CSRF_STORAGE_KEY)
}

function clearPersistedCsrfToken() {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.removeItem(CSRF_STORAGE_KEY)
}

function hasCsrfToken(value: unknown): value is { csrfToken: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'csrfToken' in value &&
    typeof (value as { csrfToken?: unknown }).csrfToken === 'string'
  )
}
