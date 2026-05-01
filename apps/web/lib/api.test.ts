import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./observability/faro', () => ({
  reportApiErrorToFaro: vi.fn(),
  reportApiRequestMeasurementToFaro: vi.fn(),
}))

import * as api from './api'
import { reportApiRequestMeasurementToFaro } from './observability/faro'

const CSRF_STORAGE_KEY = 'desk-imperial-csrf-token'
const ADMIN_PIN_HINT_KEY = 'desk_imperial_admin_pin_hint'

function jsonResponse(payload: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
  })
}

function textResponse(body: string, status: number) {
  return new Response(body, {
    status,
    headers: {
      'content-type': 'text/plain',
    },
  })
}

function clearCsrfCookies() {
  document.cookie = '__Host-partner_csrf=; Max-Age=0; path=/'
  document.cookie = 'partner_csrf=; Max-Age=0; path=/'
}

function getLastRequest(fetchMock: ReturnType<typeof vi.fn>) {
  const call = fetchMock.mock.calls.at(-1)
  if (!call) {
    throw new Error('Expected a fetch call but there were none.')
  }

  const [url, init] = call
  const requestInit = (init ?? {}) as RequestInit
  const headers = new Headers(requestInit.headers)

  return {
    url: String(url),
    init: requestInit,
    headers,
  }
}

function readJsonBody(init: RequestInit) {
  if (!init.body) {
    return undefined
  }

  return JSON.parse(String(init.body)) as Record<string, unknown>
}

describe('api client', () => {
  const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
    window.sessionStorage.clear()
    window.sessionStorage.setItem(CSRF_STORAGE_KEY, 'test-csrf-token')
    clearCsrfCookies()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('normalizes owner login payload and clears admin pin hint', async () => {
    window.sessionStorage.setItem(ADMIN_PIN_HINT_KEY, 'stale-pin')
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        user: { userId: 'u-1' },
        session: { expiresAt: '2026-04-03T01:00:00.000Z' },
      }),
    )

    await api.login(
      {
        loginMode: 'OWNER',
        email: ' owner@deskimperial.com ',
        password: '123456',
      },
      0,
    )

    const request = getLastRequest(fetchMock)
    const body = readJsonBody(request.init)

    expect(request.url).toBe('http://localhost:4000/api/v1/auth/login')
    expect(request.init.method).toBe('POST')
    expect(body).toEqual({
      loginMode: 'OWNER',
      email: 'owner@deskimperial.com',
      password: '123456',
    })
    expect(window.sessionStorage.getItem(ADMIN_PIN_HINT_KEY)).toBeNull()
  })

  it('falls back to legacy owner login contract when backend rejects loginMode payload', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ message: 'property loginMode should not exist' }, 400))
      .mockResolvedValueOnce(
        jsonResponse({
          user: { userId: 'u-2' },
          session: { expiresAt: '2026-04-03T01:00:00.000Z' },
        }),
      )

    await api.login(
      {
        loginMode: 'OWNER',
        email: 'legacy@deskimperial.com',
        password: 'fallback',
      },
      0,
    )

    expect(fetchMock).toHaveBeenCalledTimes(2)

    const first = fetchMock.mock.calls[0]?.[1] as RequestInit
    const second = fetchMock.mock.calls[1]?.[1] as RequestInit

    expect(readJsonBody(first)).toEqual({
      loginMode: 'OWNER',
      email: 'legacy@deskimperial.com',
      password: 'fallback',
    })

    expect(readJsonBody(second)).toEqual({
      email: 'legacy@deskimperial.com',
      password: 'fallback',
    })
  })

  it('normalizes staff login payload with trimmed company email and uppercase employee code', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        user: { userId: 'u-staff' },
        session: { expiresAt: '2026-04-03T01:00:00.000Z' },
      }),
    )

    await api.login(
      {
        loginMode: 'STAFF',
        companyEmail: ' empresa@deskimperial.com ',
        employeeCode: ' ab12 ',
        password: '123456',
      },
      0,
    )

    const request = getLastRequest(fetchMock)
    const body = readJsonBody(request.init)

    expect(body).toEqual({
      loginMode: 'STAFF',
      companyEmail: 'empresa@deskimperial.com',
      employeeCode: 'AB12',
      password: '123456',
    })
  })

  it('retries owner login on transient network error', async () => {
    vi.useFakeTimers()

    fetchMock.mockRejectedValueOnce(new Error('network unavailable')).mockResolvedValueOnce(
      jsonResponse({
        user: { userId: 'u-3' },
        session: { expiresAt: '2026-04-03T01:00:00.000Z' },
      }),
    )

    const promise = api.login(
      {
        loginMode: 'OWNER',
        email: 'retry@deskimperial.com',
        password: '123456',
      },
      1,
    )

    await vi.advanceTimersByTimeAsync(1_000)
    await promise

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('throws timeout error for lookupPostalCode when request aborts', async () => {
    fetchMock.mockRejectedValueOnce(new DOMException('aborted', 'AbortError'))

    await expect(api.lookupPostalCode('89239000')).rejects.toMatchObject({
      status: 504,
      message: 'Consulta de CEP demorou demais. Tente novamente em instantes.',
    })
  })

  it('uses Date/Math fallback id generation and timeout abort path when crypto/performance are unavailable', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('crypto', {} as Crypto)
    vi.stubGlobal('performance', {} as Performance)

    fetchMock.mockImplementationOnce(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          const signal = init?.signal
          if (signal instanceof AbortSignal) {
            signal.addEventListener('abort', () => {
              reject(new DOMException('aborted', 'AbortError'))
            })
          }
        }),
    )

    const request = api.fetchProducts()
    const assertion = expect(request).rejects.toMatchObject({ status: 504 })
    await vi.advanceTimersByTimeAsync(20_000)
    await assertion
  })

  it('throws fallback message for non-json backend errors', async () => {
    fetchMock.mockResolvedValueOnce(textResponse('upstream failed', 502))

    await expect(api.fetchProducts()).rejects.toMatchObject({
      status: 502,
      message: 'O servidor encontrou um erro inesperado.',
    })
  })

  it('attaches csrf token from cookie to mutating requests', async () => {
    document.cookie = 'partner_csrf=cookie-csrf-token; path=/'
    fetchMock.mockResolvedValueOnce(jsonResponse({ order: { id: 'o-1' } }))

    await api.createOrder({
      items: [{ productId: 'p-1', quantity: 1 }],
      customerName: 'Cliente',
      buyerType: 'PERSON',
      buyerDocument: '00000000000',
      buyerCity: 'Joinville',
      buyerCountry: 'BR',
    })

    const request = getLastRequest(fetchMock)

    expect(request.headers.get('X-CSRF-Token')).toBe('cookie-csrf-token')
    expect(request.headers.get('Accept')).toBe('application/json')
    expect(request.headers.get('X-Request-Id')).toBeTruthy()
  })

  it('falls back to persisted csrf token from sessionStorage', async () => {
    window.sessionStorage.setItem(CSRF_STORAGE_KEY, 'storage-csrf-token')
    fetchMock.mockResolvedValueOnce(jsonResponse({ product: { id: 'p-1' } }))

    await api.createProduct({
      name: 'Cafe',
      category: 'bebidas',
      packagingClass: 'unit',
      measurementUnit: 'ml',
      measurementValue: 300,
      unitsPerPackage: 1,
      unitCost: 5,
      unitPrice: 10,
      currency: 'BRL',
      stock: 10,
    })

    const request = getLastRequest(fetchMock)
    expect(request.headers.get('X-CSRF-Token')).toBe('storage-csrf-token')
    expect(readJsonBody(request.init)).toEqual(
      expect.objectContaining({
        name: 'Cafe',
      }),
    )
  })

  it('sends barcode when creating product from quick register flow', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ product: { id: 'p-2' } }))

    await api.createProduct({
      name: 'Guarana Lata',
      barcode: '7894900011517',
      category: 'Bebidas',
      packagingClass: 'Lata 350ml',
      measurementUnit: 'UN',
      measurementValue: 1,
      unitsPerPackage: 1,
      quantityLabel: '350ml',
      servingSize: '269ml',
      imageUrl: 'https://images.example/guarana.jpg',
      catalogSource: 'open_food_facts',
      unitCost: 3,
      unitPrice: 5.5,
      currency: 'BRL',
      stock: 24,
    })

    const request = getLastRequest(fetchMock)
    expect(readJsonBody(request.init)).toEqual(
      expect.objectContaining({
        barcode: '7894900011517',
        name: 'Guarana Lata',
        quantityLabel: '350ml',
        servingSize: '269ml',
        imageUrl: 'https://images.example/guarana.jpg',
        catalogSource: 'open_food_facts',
      }),
    )
  })

  it('does not attach csrf token to GET requests', async () => {
    document.cookie = '__Host-partner_csrf=should-not-be-used; path=/'
    fetchMock.mockResolvedValueOnce(jsonResponse({ items: [], totals: {} }))

    await api.fetchProducts()

    const request = getLastRequest(fetchMock)
    expect(request.init.method).toBe('GET')
    expect(request.headers.get('X-CSRF-Token')).toBeNull()
  })

  it('persists csrf token from response payload and clears it on logout', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          user: { userId: 'u-5' },
          csrfToken: 'fresh-csrf-token',
          session: { expiresAt: '2026-04-03T01:00:00.000Z' },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ success: true }))

    await api.fetchCurrentUser()
    expect(window.sessionStorage.getItem(CSRF_STORAGE_KEY)).toBe('fresh-csrf-token')

    window.sessionStorage.setItem(ADMIN_PIN_HINT_KEY, 'temp-pin')
    await api.logout()

    expect(window.sessionStorage.getItem(CSRF_STORAGE_KEY)).toBeNull()
    expect(window.sessionStorage.getItem(ADMIN_PIN_HINT_KEY)).toBeNull()
  })

  it('normalizes response request id before sending telemetry', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          displayCurrency: 'BRL',
          items: [],
          totals: {},
        },
        200,
        {
          'x-request-id': ' req-telemetry-1 ',
        },
      ),
    )

    await api.fetchProducts()

    expect(reportApiRequestMeasurementToFaro).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'req-telemetry-1',
      }),
    )
  })

  it('handles forms, query params and snapshot options for operation endpoints', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ success: true }))
      .mockResolvedValueOnce(jsonResponse({ items: [] }))
      .mockResolvedValueOnce(jsonResponse({ items: [] }))
      .mockResolvedValueOnce(jsonResponse({ comanda: { id: 'c-1' } }))
      .mockResolvedValueOnce(jsonResponse({ comanda: { id: 'c-1' } }))

    const upload = new File(['id,name\n1,cafe'], 'products.csv', { type: 'text/csv' })

    await api.importProducts(upload)
    let request = getLastRequest(fetchMock)
    expect(request.url).toBe('http://localhost:4000/api/v1/products/import')
    expect(request.init.method).toBe('POST')
    expect(request.init.body).toBeInstanceOf(FormData)

    await api.fetchOrders({ includeCancelled: true, includeItems: false, limit: 50 })
    request = getLastRequest(fetchMock)
    expect(request.url).toContain('/api/v1/orders?includeCancelled=true&includeItems=false&limit=50')

    await api.fetchOperationsKitchen({
      businessDate: ' 2026-04-03 ',
      includeCashMovements: true,
      compactMode: false,
    })
    request = getLastRequest(fetchMock)
    expect(request.url).toContain(
      '/api/v1/operations/kitchen?businessDate=2026-04-03&includeCashMovements=true&compactMode=false',
    )

    await api.openComanda(
      {
        tableLabel: '7',
        items: [{ productName: 'Cafe', quantity: 1, unitPrice: 9 }],
      },
      { includeSnapshot: true },
    )
    request = getLastRequest(fetchMock)
    expect(request.url).toContain('/api/v1/operations/comandas?includeSnapshot=true')

    await api.addComandaItems('comanda-1', [{ productName: 'Pao', quantity: 2, unitPrice: 7 }])
    request = getLastRequest(fetchMock)
    expect(request.url).toContain('/api/v1/operations/comandas/comanda-1/items/batch?includeSnapshot=false')
    expect(readJsonBody(request.init)).toEqual({
      items: [{ productName: 'Pao', quantity: 2, unitPrice: 7 }],
    })
  })

  it('covers standard endpoint wrappers with expected path and method', async () => {
    const wrappers: Array<{
      run: () => Promise<unknown>
      expectedPath: string
      expectedMethod: 'GET' | 'POST' | 'PATCH' | 'DELETE'
    }> = [
      {
        run: () => api.loginDemo({ loginMode: 'STAFF', employeeCode: 'E01' }),
        expectedPath: '/auth/demo',
        expectedMethod: 'POST',
      },
      {
        run: () =>
          api.register({
            fullName: 'Joao',
            email: 'joao@deskimperial.com',
            companyStreetLine1: 'Rua A',
            companyStreetNumber: '10',
            companyDistrict: 'Centro',
            companyCity: 'Joinville',
            companyState: 'SC',
            companyPostalCode: '89239000',
            companyCountry: 'BR',
            hasEmployees: true,
            employeeCount: 5,
            password: '123456',
            acceptTerms: true,
            acceptPrivacy: true,
          }),
        expectedPath: '/auth/register',
        expectedMethod: 'POST',
      },
      {
        run: () => api.forgotPassword({ email: 'a@b.com' }),
        expectedPath: '/auth/forgot-password',
        expectedMethod: 'POST',
      },
      {
        run: () => api.requestEmailVerification({ email: 'a@b.com' }),
        expectedPath: '/auth/verify-email/request',
        expectedMethod: 'POST',
      },
      {
        run: () => api.verifyEmail({ email: 'a@b.com', code: '123456' }),
        expectedPath: '/auth/verify-email/confirm',
        expectedMethod: 'POST',
      },
      {
        run: () => api.resetPassword({ email: 'a@b.com', code: '123456', password: 'new-pass' }),
        expectedPath: '/auth/reset-password',
        expectedMethod: 'POST',
      },
      {
        run: () => api.updateProfile({ fullName: 'Joao', preferredCurrency: 'BRL' }),
        expectedPath: '/auth/profile',
        expectedMethod: 'PATCH',
      },
      {
        run: () => api.fetchConsentDocuments(),
        expectedPath: '/consent/documents',
        expectedMethod: 'GET',
      },
      {
        run: () => api.fetchConsentOverview(),
        expectedPath: '/consent/me',
        expectedMethod: 'GET',
      },
      {
        run: () => api.fetchFinanceSummary(),
        expectedPath: '/finance/summary',
        expectedMethod: 'GET',
      },
      {
        run: () => api.fetchPillars(),
        expectedPath: '/finance/pillars',
        expectedMethod: 'GET',
      },
      {
        run: () => api.fetchMarketInsight(' sell more combos '),
        expectedPath: '/market-intelligence/insights',
        expectedMethod: 'POST',
      },
      {
        run: () => api.fetchEmployees(),
        expectedPath: '/employees',
        expectedMethod: 'GET',
      },
      {
        run: () => api.fetchOperationsSummary('2026-04-03'),
        expectedPath: '/operations/summary?businessDate=2026-04-03',
        expectedMethod: 'GET',
      },
      {
        run: () => api.fetchComandaDetails('c-99'),
        expectedPath: '/operations/comandas/c-99/details',
        expectedMethod: 'GET',
      },
      {
        run: () => api.fetchMesas(),
        expectedPath: '/operations/mesas',
        expectedMethod: 'GET',
      },
      {
        run: () => api.createMesa({ label: 'Mesa 10', capacity: 4 }),
        expectedPath: '/operations/mesas',
        expectedMethod: 'POST',
      },
      {
        run: () => api.updateMesa('mesa-10', { section: 'Varanda' }),
        expectedPath: '/operations/mesas/mesa-10',
        expectedMethod: 'PATCH',
      },
      {
        run: () => api.fetchLastLogins(),
        expectedPath: '/auth/activity',
        expectedMethod: 'GET',
      },
      {
        run: () => api.fetchActivityFeed(),
        expectedPath: '/auth/activity-feed',
        expectedMethod: 'GET',
      },
      {
        run: () => api.assignComanda('c-9', 'emp-1'),
        expectedPath: '/operations/comandas/c-9/assign?includeSnapshot=false',
        expectedMethod: 'POST',
      },
      {
        run: () => api.updateComandaStatus('c-9', 'READY'),
        expectedPath: '/operations/comandas/c-9/status?includeSnapshot=false',
        expectedMethod: 'POST',
      },
      {
        run: () => api.cancelComanda('c-9'),
        expectedPath: '/operations/comandas/c-9/status?includeSnapshot=false',
        expectedMethod: 'POST',
      },
      {
        run: () => api.closeComanda('c-9', { notes: 'fechado' }),
        expectedPath: '/operations/comandas/c-9/close?includeSnapshot=false',
        expectedMethod: 'POST',
      },
      {
        run: () => api.openCashSession({ openingCashAmount: 100 }),
        expectedPath: '/operations/cash-sessions?includeSnapshot=false',
        expectedMethod: 'POST',
      },
      {
        run: () => api.closeCashClosure({ countedCashAmount: 100 }),
        expectedPath: '/operations/closures/close?includeSnapshot=false',
        expectedMethod: 'POST',
      },
      {
        run: () => api.createCashMovement('cash-1', { type: 'SUPPLY', amount: 50 }),
        expectedPath: '/operations/cash-sessions/cash-1/movements?includeSnapshot=false',
        expectedMethod: 'POST',
      },
      {
        run: () => api.closeCashSession('cash-1', { countedCashAmount: 100 }),
        expectedPath: '/operations/cash-sessions/cash-1/close?includeSnapshot=false',
        expectedMethod: 'POST',
      },
      {
        run: () => api.updateKitchenItemStatus('item-1', 'READY'),
        expectedPath: '/operations/kitchen-items/item-1/status',
        expectedMethod: 'PATCH',
      },
      {
        run: () => api.createEmployee({ displayName: 'Maria' }),
        expectedPath: '/employees',
        expectedMethod: 'POST',
      },
      {
        run: () => api.updateEmployee('emp-10', { displayName: 'Maria A.' }),
        expectedPath: '/employees/emp-10',
        expectedMethod: 'PATCH',
      },
      {
        run: () => api.archiveEmployee('emp-10'),
        expectedPath: '/employees/emp-10',
        expectedMethod: 'DELETE',
      },
      {
        run: () => api.rotateEmployeePassword('emp-10'),
        expectedPath: '/employees/emp-10/access/password',
        expectedMethod: 'PATCH',
      },
      {
        run: () => api.restoreEmployee('emp-10'),
        expectedPath: '/employees/emp-10/restore',
        expectedMethod: 'POST',
      },
      {
        run: () => api.cancelOrder('order-1'),
        expectedPath: '/orders/order-1/cancel',
        expectedMethod: 'POST',
      },
      {
        run: () => api.updateCookiePreferences({ analytics: true, marketing: false }),
        expectedPath: '/consent/preferences',
        expectedMethod: 'POST',
      },
      {
        run: () =>
          api.updateProduct('product-1', {
            active: true,
          }),
        expectedPath: '/products/product-1',
        expectedMethod: 'PATCH',
      },
      {
        run: () => api.archiveProduct('product-1'),
        expectedPath: '/products/product-1',
        expectedMethod: 'DELETE',
      },
      {
        run: () => api.restoreProduct('product-1'),
        expectedPath: '/products/product-1/restore',
        expectedMethod: 'POST',
      },
      {
        run: () => api.deleteProductPermanently('product-1'),
        expectedPath: '/products/product-1/permanent',
        expectedMethod: 'DELETE',
      },
    ]

    for (const wrapper of wrappers) {
      fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }))
      await wrapper.run()
      const request = getLastRequest(fetchMock)

      expect(request.url).toBe(`http://localhost:4000/api/v1${wrapper.expectedPath}`)
      expect((request.init.method ?? 'GET').toUpperCase()).toBe(wrapper.expectedMethod)
    }
  })
})
