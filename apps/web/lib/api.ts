import type {
  CashSessionRecord,
  ComandaRecord,
  ComandaStatus,
  CurrencyCode,
  FinanceSummaryResponse,
  MarketInsightResponse,
  MesaRecord,
  OperationsKitchenResponse,
  OperationsLiveResponse,
  OperationsSummaryResponse,
  OrderRecord,
  OrdersResponse,
  ProductImportResponse,
  ProductRecord,
  ProductsResponse,
} from '@contracts/contracts'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const CSRF_COOKIE_NAMES = ['__Host-partner_csrf', 'partner_csrf']
const CSRF_STORAGE_KEY = 'desk-imperial-csrf-token'
const ADMIN_PIN_HINT_KEY = 'desk_imperial_admin_pin_hint'
const DEFAULT_API_TIMEOUT_MS = 20_000
const AUTH_API_TIMEOUT_MS = 10_000
const POSTAL_LOOKUP_TIMEOUT_MS = 6_000

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
  role: 'OWNER' | 'STAFF'
  workspaceOwnerUserId: string
  companyOwnerUserId: string | null
  employeeId: string | null
  employeeCode: string | null
  fullName: string
  companyName: string | null
  companyLocation: {
    streetLine1: string | null
    streetNumber: string | null
    addressComplement: string | null
    district: string | null
    city: string | null
    state: string | null
    postalCode: string | null
    country: string | null
    latitude: number | null
    longitude: number | null
    precision: 'city' | 'address'
  }
  workforce: {
    hasEmployees: boolean
    employeeCount: number
  }
  email: string
  emailVerified: boolean
  preferredCurrency: CurrencyCode
  status: string
  evaluationAccess: EvaluationAccess | null
  cookiePreferences: CookiePreferences
}

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
  isCombo?: boolean
  comboDescription?: string
  comboItems?: Array<{
    productId: string
    quantityPackages: number
    quantityUnits: number
  }>
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
  hasLogin: boolean
  salarioBase?: number
  percentualVendas?: number
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
  temporaryPassword: string
}

export type ProfilePayload = {
  fullName: string
  companyName?: string
  preferredCurrency: CurrencyCode
}

export type LoginPayload = {
  loginMode: 'OWNER' | 'STAFF'
  email?: string
  companyEmail?: string
  employeeCode?: string
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
  companyStreetLine1: string
  companyStreetNumber: string
  companyAddressComplement?: string
  companyDistrict: string
  companyCity: string
  companyState: string
  companyPostalCode: string
  companyCountry: string
  hasEmployees: boolean
  employeeCount: number
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

class ApiTimeoutError extends Error {
  constructor(
    public readonly timeoutMs: number,
    public readonly requestPath: string,
  ) {
    super(`Request timed out after ${timeoutMs}ms`)
    this.name = 'ApiTimeoutError'
  }
}

export async function login(payload: LoginPayload, maxRetries = 2) {
  clearPersistedAdminPinHint()
  const normalizedPayload = normalizeLoginPayload(payload)

  let attempt = 0
  while (attempt <= maxRetries) {
    try {
      return await apiFetch<AuthResponse>('/auth/login', {
        method: 'POST',
        body: normalizedPayload,
        skipCsrf: true,
        timeoutMs: AUTH_API_TIMEOUT_MS,
      })
    } catch (error) {
      if (payload.loginMode === 'OWNER' && error instanceof ApiError && isLegacyOwnerLoginContractError(error)) {
        return apiFetch<AuthResponse>('/auth/login', {
          method: 'POST',
          body: {
            email: normalizedPayload.email,
            password: normalizedPayload.password,
          },
          skipCsrf: true,
          timeoutMs: AUTH_API_TIMEOUT_MS,
        })
      }

      const isNetworkError = error instanceof ApiError && error.status === 0
      const isTimeoutError = error instanceof ApiError && error.status === 504
      if ((isNetworkError || isTimeoutError) && attempt < maxRetries) {
        attempt++
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
        continue
      }

      throw error
    }
  }

  throw new ApiError('Nao foi possivel conectar com o servidor apos varias tentativas.', 0)
}

export type DemoLoginPayload = {
  loginMode: 'OWNER' | 'STAFF'
  employeeCode?: string
}

export async function loginDemo(payload: DemoLoginPayload) {
  clearPersistedAdminPinHint()
  return apiFetch<AuthResponse>('/auth/demo', {
    method: 'POST',
    body: payload,
    skipCsrf: true,
    timeoutMs: AUTH_API_TIMEOUT_MS,
  })
}

export async function register(payload: RegisterPayload) {
  return apiFetch<VerificationChallengeResponse>('/auth/register', {
    method: 'POST',
    body: payload,
    timeoutMs: AUTH_API_TIMEOUT_MS,
  })
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
    if (error instanceof ApiTimeoutError) {
      throw new ApiError('Consulta de CEP demorou demais. Tente novamente em instantes.', 504)
    }
    throw new ApiError('Nao foi possivel consultar o CEP agora.', 0)
  }

  if (!response.ok) {
    throw await toApiError(response)
  }

  return (await response.json()) as PostalCodeLookupResponse
}

export async function logout() {
  const response = await apiFetch<{ success: boolean }>('/auth/logout', {
    method: 'POST',
  })
  clearPersistedCsrfToken()
  clearPersistedAdminPinHint()
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
    weeklyRevenue: {
      label: string
      value: number
      currency: string
      previousValue: number
      changePercent: number
      trend: number[]
    }
    monthlyRevenue: {
      label: string
      value: number
      currency: string
      previousValue: number
      changePercent: number
      trend: number[]
    }
    profit: {
      label: string
      value: number
      currency: string
      previousValue: number
      changePercent: number
      trend: number[]
    }
    eventRevenue: {
      label: string
      value: number
      currency: string
      previousValue: number
      changePercent: number
      trend: number[]
    }
    normalRevenue: {
      label: string
      value: number
      currency: string
      previousValue: number
      changePercent: number
      trend: number[]
    }
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

export type FetchOrdersOptions = {
  includeCancelled?: boolean
  includeItems?: boolean
  limit?: number
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

export async function fetchEmployees() {
  return apiFetch<EmployeesResponse>('/employees', {
    method: 'GET',
  })
}

export type OperationsLiveOptions = {
  businessDate?: string
  includeCashMovements?: boolean
  compactMode?: boolean
}

function buildOperationsLiveParams(input?: string | OperationsLiveOptions) {
  const params = new URLSearchParams()
  const options =
    typeof input === 'string'
      ? {
          businessDate: input,
        }
      : input

  if (options?.businessDate?.trim()) {
    params.set('businessDate', options.businessDate.trim())
  }

  if (options?.includeCashMovements !== undefined) {
    params.set('includeCashMovements', String(options.includeCashMovements))
  }

  if (options?.compactMode !== undefined) {
    params.set('compactMode', String(options.compactMode))
  }

  return params
}

export async function fetchOperationsLive(input?: string | OperationsLiveOptions) {
  const params = buildOperationsLiveParams(input)
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return apiFetch<OperationsLiveResponse>(`/operations/live${suffix}`, {
    method: 'GET',
  })
}

export async function fetchOperationsKitchen(input?: string | OperationsLiveOptions) {
  const params = buildOperationsLiveParams(input)
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return apiFetch<OperationsKitchenResponse>(`/operations/kitchen${suffix}`, {
    method: 'GET',
  })
}

export async function fetchOperationsSummary(input?: string | OperationsLiveOptions) {
  const params = buildOperationsLiveParams(input)
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return apiFetch<OperationsSummaryResponse>(`/operations/summary${suffix}`, {
    method: 'GET',
  })
}

export async function fetchComandaDetails(comandaId: string) {
  return apiFetch<{ comanda: ComandaRecord }>(`/operations/comandas/${comandaId}/details`, {
    method: 'GET',
  })
}

export type CreateMesaInput = {
  label: string
  capacity?: number
  section?: string
  positionX?: number
  positionY?: number
}

export type UpdateMesaInput = {
  label?: string
  capacity?: number
  section?: string
  positionX?: number
  positionY?: number
  active?: boolean
  reservedUntil?: string | null
}

export async function fetchMesas() {
  return apiFetch<MesaRecord[]>('/operations/mesas', { method: 'GET' })
}

export async function createMesa(body: CreateMesaInput) {
  return apiFetch<MesaRecord>('/operations/mesas', { method: 'POST', body })
}

export async function updateMesa(mesaId: string, body: UpdateMesaInput) {
  return apiFetch<MesaRecord>(`/operations/mesas/${mesaId}`, { method: 'PATCH', body })
}

export type LastLoginEntry = {
  id: string
  browser: string
  os: string
  ipAddress: string | null
  createdAt: string
}

export async function fetchLastLogins() {
  return apiFetch<LastLoginEntry[]>('/auth/activity', { method: 'GET' })
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

export async function fetchActivityFeed() {
  return apiFetch<ActivityFeedEntry[]>('/auth/activity-feed', { method: 'GET' })
}

export type ComandaDraftItemPayload = {
  productId?: string
  productName?: string
  quantity: number
  unitPrice?: number
  notes?: string
}

export type OpenComandaPayload = {
  tableLabel: string
  mesaId?: string
  customerName?: string
  customerDocument?: string
  participantCount?: number
  notes?: string
  cashSessionId?: string
  employeeId?: string
  items?: ComandaDraftItemPayload[]
  discountAmount?: number
  serviceFeeAmount?: number
}

export type ReplaceComandaPayload = {
  tableLabel: string
  mesaId?: string
  customerName?: string
  customerDocument?: string
  participantCount?: number
  notes?: string
  items: ComandaDraftItemPayload[]
  discountAmount?: number
  serviceFeeAmount?: number
}

export type CloseComandaPayload = {
  notes?: string
  discountAmount?: number
  serviceFeeAmount?: number
}

type OperationsRequestOptions = {
  includeSnapshot?: boolean
}

export async function openComanda(payload: OpenComandaPayload, options?: OperationsRequestOptions) {
  const resolvedOptions: OperationsRequestOptions = { includeSnapshot: false, ...options }
  return apiFetch<{ comanda: ComandaRecord; snapshot?: OperationsLiveResponse }>(
    withOperationsOptions('/operations/comandas', resolvedOptions),
    {
      method: 'POST',
      body: payload,
    },
  )
}

export type AddComandaItemPayload = {
  productId?: string
  productName?: string
  quantity: number
  unitPrice?: number
  notes?: string
}

export async function addComandaItem(
  comandaId: string,
  payload: AddComandaItemPayload,
  options?: OperationsRequestOptions,
) {
  const resolvedOptions: OperationsRequestOptions = { includeSnapshot: false, ...options }
  return apiFetch<{ comanda: ComandaRecord; snapshot?: OperationsLiveResponse }>(
    withOperationsOptions(`/operations/comandas/${comandaId}/items`, resolvedOptions),
    {
      method: 'POST',
      body: payload as JsonBody,
    },
  )
}

export async function addComandaItems(
  comandaId: string,
  items: AddComandaItemPayload[],
  options?: OperationsRequestOptions,
) {
  const resolvedOptions: OperationsRequestOptions = { includeSnapshot: false, ...options }
  return apiFetch<{ comanda: ComandaRecord; snapshot?: OperationsLiveResponse }>(
    withOperationsOptions(`/operations/comandas/${comandaId}/items/batch`, resolvedOptions),
    {
      method: 'POST',
      body: { items } as JsonBody,
    },
  )
}

export async function replaceComanda(
  comandaId: string,
  payload: ReplaceComandaPayload,
  options?: OperationsRequestOptions,
) {
  const resolvedOptions: OperationsRequestOptions = { includeSnapshot: false, ...options }
  return apiFetch<{ comanda: ComandaRecord; snapshot?: OperationsLiveResponse }>(
    withOperationsOptions(`/operations/comandas/${comandaId}`, resolvedOptions),
    {
      method: 'PATCH',
      body: payload,
    },
  )
}

export async function assignComanda(comandaId: string, employeeId?: string, options?: OperationsRequestOptions) {
  const resolvedOptions: OperationsRequestOptions = { includeSnapshot: false, ...options }
  return apiFetch<{ comanda: ComandaRecord; snapshot?: OperationsLiveResponse }>(
    withOperationsOptions(`/operations/comandas/${comandaId}/assign`, resolvedOptions),
    {
      method: 'POST',
      body: employeeId ? { employeeId } : {},
    },
  )
}

export async function updateComandaStatus(
  comandaId: string,
  status: Extract<ComandaStatus, 'OPEN' | 'IN_PREPARATION' | 'READY'>,
  options?: OperationsRequestOptions,
) {
  const resolvedOptions: OperationsRequestOptions = { includeSnapshot: false, ...options }
  return apiFetch<{ comanda: ComandaRecord; snapshot?: OperationsLiveResponse }>(
    withOperationsOptions(`/operations/comandas/${comandaId}/status`, resolvedOptions),
    {
      method: 'POST',
      body: { status },
    },
  )
}

export async function cancelComanda(comandaId: string, options?: OperationsRequestOptions) {
  const resolvedOptions: OperationsRequestOptions = { includeSnapshot: false, ...options }
  return apiFetch<{ comanda: ComandaRecord; snapshot?: OperationsLiveResponse }>(
    withOperationsOptions(`/operations/comandas/${comandaId}/status`, resolvedOptions),
    {
      method: 'POST',
      body: { status: 'CANCELLED' },
    },
  )
}

export async function closeComanda(
  comandaId: string,
  payload: CloseComandaPayload,
  options?: OperationsRequestOptions,
) {
  const resolvedOptions: OperationsRequestOptions = { includeSnapshot: false, ...options }
  return apiFetch<{ comanda: ComandaRecord; snapshot?: OperationsLiveResponse }>(
    withOperationsOptions(`/operations/comandas/${comandaId}/close`, resolvedOptions),
    {
      method: 'POST',
      body: payload,
    },
  )
}

export type OpenCashSessionPayload = {
  openingCashAmount: number
  notes?: string
}

export type CloseCashClosurePayload = {
  countedCashAmount: number
  forceClose?: boolean
  notes?: string
}

export async function openCashSession(payload: OpenCashSessionPayload, options?: OperationsRequestOptions) {
  const resolvedOptions: OperationsRequestOptions = { includeSnapshot: false, ...options }
  return apiFetch<{ cashSession: CashSessionRecord; snapshot?: OperationsLiveResponse }>(
    withOperationsOptions('/operations/cash-sessions', resolvedOptions),
    {
      method: 'POST',
      body: payload as JsonBody,
    },
  )
}

export async function closeCashClosure(payload: CloseCashClosurePayload, options?: OperationsRequestOptions) {
  const resolvedOptions: OperationsRequestOptions = { includeSnapshot: false, ...options }
  return apiFetch<{ snapshot?: OperationsLiveResponse }>(
    withOperationsOptions('/operations/closures/close', resolvedOptions),
    {
      method: 'POST',
      body: payload as JsonBody,
    },
  )
}

export type CreateCashMovementPayload = {
  type: string
  amount: number
  note?: string
}

export async function createCashMovement(
  cashSessionId: string,
  payload: CreateCashMovementPayload,
  options?: OperationsRequestOptions,
) {
  const resolvedOptions: OperationsRequestOptions = { includeSnapshot: false, ...options }
  return apiFetch<{ cashSession: CashSessionRecord; snapshot?: OperationsLiveResponse }>(
    withOperationsOptions(`/operations/cash-sessions/${cashSessionId}/movements`, resolvedOptions),
    {
      method: 'POST',
      body: payload as JsonBody,
    },
  )
}

export type CloseCashSessionPayload = {
  countedCashAmount: number
  notes?: string
}

export async function closeCashSession(
  cashSessionId: string,
  payload: CloseCashSessionPayload,
  options?: OperationsRequestOptions,
) {
  const resolvedOptions: OperationsRequestOptions = { includeSnapshot: false, ...options }
  return apiFetch<{ cashSession: CashSessionRecord; snapshot?: OperationsLiveResponse }>(
    withOperationsOptions(`/operations/cash-sessions/${cashSessionId}/close`, resolvedOptions),
    {
      method: 'POST',
      body: payload as JsonBody,
    },
  )
}

export async function updateKitchenItemStatus(itemId: string, status: 'IN_PREPARATION' | 'READY' | 'DELIVERED') {
  return apiFetch<{ itemId: string; status: string }>(`/operations/kitchen-items/${itemId}/status`, {
    method: 'PATCH',
    body: { status },
  })
}

export type UpdateEmployeePayload = {
  employeeCode?: string
  displayName?: string
  active?: boolean
  temporaryPassword?: string
  salarioBase?: number
  percentualVendas?: number
}

export async function createEmployee(payload: EmployeePayload) {
  return apiFetch<{ employee: EmployeeRecord }>('/employees', {
    method: 'POST',
    body: payload,
  })
}

export async function updateEmployee(employeeId: string, payload: UpdateEmployeePayload) {
  return apiFetch<{ employee: EmployeeRecord }>(`/employees/${employeeId}`, {
    method: 'PATCH',
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
    skipCsrf?: boolean
    timeoutMs?: number
  },
) {
  const headers = new Headers(options.headers)
  const body = options.body

  if (body && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  headers.set('Accept', 'application/json')

  if (!options.skipCsrf && shouldAttachCsrfToken(options.method)) {
    // Try multiple CSRF token sources with priority:
    // 1. Token from cookie (always fresh across multiple tabs)
    // 2. Persisted token from sessionStorage (fallback)
    const csrfToken = readCsrfToken() || readPersistedCsrfToken()

    if (csrfToken) {
      headers.set('X-CSRF-Token', csrfToken)
    } else {
      // If no token found, log warning (helps debug CSRF issues)
      console.warn('[CSRF] No token found for request:', path, 'method:', options.method)
    }
  }

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
    if (error instanceof ApiTimeoutError) {
      throw new ApiError(`A requisicao demorou demais (${Math.ceil(error.timeoutMs / 1000)}s). Tente novamente.`, 504)
    }

    throw new ApiError(
      `Nao foi possivel conectar com a API em ${API_BASE_URL}. Verifique se o backend local esta ativo.`,
      0,
    )
  }

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

function withOperationsOptions(path: string, options?: OperationsRequestOptions) {
  if (options?.includeSnapshot === undefined) {
    return path
  }

  const [basePath, existingQuery = ''] = path.split('?')
  const params = new URLSearchParams(existingQuery)
  params.set('includeSnapshot', String(options.includeSnapshot))
  const query = params.toString()

  return query ? `${basePath}?${query}` : basePath
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

  return cookie ? (cookie.split('=')[1] ?? null) : null
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

function clearPersistedAdminPinHint() {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.removeItem(ADMIN_PIN_HINT_KEY)
}

function hasCsrfToken(value: unknown): value is { csrfToken: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'csrfToken' in value &&
    typeof (value as { csrfToken?: unknown }).csrfToken === 'string'
  )
}

function normalizeLoginPayload(payload: LoginPayload) {
  const password = payload.password

  if (payload.loginMode === 'STAFF') {
    return {
      loginMode: 'STAFF' as const,
      companyEmail: payload.companyEmail?.trim(),
      employeeCode: payload.employeeCode?.trim().toUpperCase(),
      password,
    }
  }

  return {
    loginMode: 'OWNER' as const,
    email: payload.email?.trim(),
    password,
  }
}

function isLegacyOwnerLoginContractError(error: ApiError) {
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

function resolveApiTimeoutMs(path: string) {
  if (path.startsWith('/auth/')) {
    return AUTH_API_TIMEOUT_MS
  }

  return DEFAULT_API_TIMEOUT_MS
}

async function fetchWithTimeout(
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
