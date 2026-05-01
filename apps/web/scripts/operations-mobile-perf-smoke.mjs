import { chromium } from 'playwright'

const APP_BASE_URL = process.env.DESK_SMOKE_APP_BASE_URL ?? 'http://127.0.0.1:3100'
const API_BASE_URL = process.env.DESK_SMOKE_API_BASE_URL ?? 'https://api.deskimperial.online/api/v1'
const DEMO_STAFF_CODE = process.env.DESK_SMOKE_DEMO_STAFF_CODE ?? 'VD-001'
const PERF_STORE_KEY = '__DESK_IMPERIAL_OPERATIONS_PERF__'
const EVENT_TIMEOUT_MS = Number.parseInt(process.env.DESK_SMOKE_EVENT_TIMEOUT_MS ?? '15000', 10)

const CONSENT_STORAGE_KEY = 'partner-portal-cookie-consent'
const CONSENT_COOKIE_NAME = 'partner_portal_cookie_consent'
const CONSENT_VERSION = '2026.03.banner.v4'

class ApiSession {
  constructor(name) {
    this.name = name
    this.cookies = []
    this.csrfToken = ''
  }

  cookieHeader() {
    return this.cookies.join('; ')
  }

  captureCookies(response) {
    const setCookies = typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : []
    for (const setCookie of setCookies) {
      const keyValue = setCookie.split(';')[0]
      const separatorIndex = keyValue.indexOf('=')
      if (separatorIndex <= 0) {
        continue
      }

      const cookieName = keyValue.slice(0, separatorIndex)
      this.cookies = this.cookies.filter((entry) => !entry.startsWith(`${cookieName}=`))
      this.cookies.push(keyValue)
    }
  }

  async request(path, options = {}) {
    const headers = new Headers(options.headers ?? {})
    if (this.cookies.length > 0) {
      headers.set('cookie', this.cookieHeader())
    }
    if (options.body && !headers.has('content-type')) {
      headers.set('content-type', 'application/json')
    }
    if (options.method && options.method !== 'GET' && this.csrfToken) {
      headers.set('x-csrf-token', this.csrfToken)
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    })
    this.captureCookies(response)

    const contentType = response.headers.get('content-type') ?? ''
    const payload = contentType.includes('application/json') ? await response.json() : await response.text()
    if (
      payload &&
      typeof payload === 'object' &&
      payload !== null &&
      'csrfToken' in payload &&
      typeof payload.csrfToken === 'string'
    ) {
      this.csrfToken = payload.csrfToken
    }

    if (!response.ok) {
      const message =
        payload && typeof payload === 'object' && payload !== null && 'message' in payload
          ? JSON.stringify(payload.message)
          : JSON.stringify(payload)
      throw new Error(`${this.name} ${options.method ?? 'GET'} ${path} falhou (${response.status}): ${message}`)
    }

    return payload
  }

  async loginDemo(loginMode, employeeCode) {
    const payload = loginMode === 'STAFF' ? { loginMode, employeeCode } : { loginMode }
    return this.request('/auth/demo', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }
}

async function main() {
  const ownerApi = new ApiSession('owner')
  const staffApi = new ApiSession('staff')
  await ownerApi.loginDemo('OWNER')
  await staffApi.loginDemo('STAFF', DEMO_STAFF_CODE)

  const productsResponse = await ownerApi.request('/products?includeInactive=true')
  const anyActiveProduct = productsResponse.items.find((product) => product.active && product.stock > 0)
  const kitchenProduct = productsResponse.items.find(
    (product) => product.active && product.stock > 0 && product.requiresKitchen,
  )

  if (!anyActiveProduct) {
    throw new Error('Nenhum produto ativo com estoque disponivel para o smoke.')
  }

  if (!kitchenProduct) {
    throw new Error('Nenhum produto de cozinha disponivel para o smoke.')
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-web-security', '--disable-features=IsolateOrigins,site-per-process'],
  })
  const ownerContext = await browser.newContext()
  const staffContext = await browser.newContext()
  const ownerPage = await ownerContext.newPage()
  const staffPage = await staffContext.newPage()

  const summary = {
    appBaseUrl: APP_BASE_URL,
    apiBaseUrl: API_BASE_URL,
    smokeStartedAt: new Date().toISOString(),
    ownerFlow: null,
    staffFlow: null,
    smokeFinishedAt: null,
  }

  let ownerCreatedComandaId = null
  let staffCreatedComandaId = null

  try {
    await Promise.all([
      bootstrapAuthenticatedPage(ownerContext, ownerPage, ownerApi, '/app/owner', '[data-testid=\"owner-header\"]'),
      bootstrapAuthenticatedPage(staffContext, staffPage, staffApi, '/app/staff', '[data-testid=\"nav-mesas\"]'),
    ])
    await Promise.all([enterOperationsSurface(ownerPage, 'nav-pdv'), enterOperationsSurface(staffPage, 'nav-mesas')])

    await resetPerfEvents(ownerPage)
    ownerCreatedComandaId = await runOwnerFlow(ownerPage, ownerApi, anyActiveProduct.name)
    await waitForIdlePropagation()
    summary.ownerFlow = {
      ...ownerCreatedComandaId.metrics,
      createdComandaId: ownerCreatedComandaId.comandaId,
    }

    await ownerApi.request(`/operations/comandas/${ownerCreatedComandaId.comandaId}/close`, {
      method: 'POST',
      body: JSON.stringify({
        discountAmount: 0,
        serviceFeeAmount: 0,
        paymentMethod: 'PIX',
      }),
    })
    ownerCreatedComandaId = null
    await waitForIdlePropagation()

    await Promise.all([resetPerfEvents(ownerPage), resetPerfEvents(staffPage)])
    staffCreatedComandaId = await runStaffKitchenFlow({
      kitchenProductName: kitchenProduct.name,
      ownerApi,
      ownerPage,
      staffApi,
      staffPage,
    })
    summary.staffFlow = {
      ...staffCreatedComandaId.metrics,
      createdComandaId: staffCreatedComandaId.comandaId,
    }
    staffCreatedComandaId = null

    summary.smokeFinishedAt = new Date().toISOString()
    console.log(JSON.stringify(summary, null, 2))
  } finally {
    if (ownerCreatedComandaId?.comandaId) {
      await safeCloseComanda(ownerApi, ownerCreatedComandaId.comandaId)
    }
    if (staffCreatedComandaId?.comandaId) {
      await safeCloseComanda(ownerApi, staffCreatedComandaId.comandaId)
    }

    await Promise.allSettled([ownerContext.close(), staffContext.close()])
    await browser.close()
  }
}

async function runOwnerFlow(page, ownerApi, productName) {
  const product = await findProductByName(ownerApi, productName)
  const freeMesa = await waitForFreeMesa(ownerApi)
  const opened = await ownerApi.request('/operations/comandas?includeSnapshot=false', {
    method: 'POST',
    body: JSON.stringify({
      tableLabel: freeMesa.label,
      mesaId: freeMesa.id,
      items: [{ productId: product.id, quantity: 1 }],
    }),
  })
  await waitForIdlePropagation()
  const comanda = opened.comanda

  return {
    comandaId: comanda.id,
    metrics: {
      mesaLabel: freeMesa.label,
      pageMetrics: summarizePerfEvents(await readPerfEvents(page)),
    },
  }
}

async function runStaffKitchenFlow({ kitchenProductName, ownerApi, ownerPage, staffApi, staffPage }) {
  const product = await findProductByName(ownerApi, kitchenProductName)
  const freeMesa = await waitForFreeMesa(ownerApi)
  const opened = await ownerApi.request('/operations/comandas?includeSnapshot=false', {
    method: 'POST',
    body: JSON.stringify({
      tableLabel: freeMesa.label,
      mesaId: freeMesa.id,
      items: [{ productId: product.id, quantity: 1 }],
    }),
  })
  await waitForIdlePropagation()
  const comanda = opened.comanda
  const kitchenItem = await waitForKitchenItem(ownerApi, comanda.id)

  await staffApi.request(`/operations/kitchen-items/${kitchenItem.itemId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'IN_PREPARATION' }),
  })
  await waitForIdlePropagation()

  await staffApi.request(`/operations/kitchen-items/${kitchenItem.itemId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'READY' }),
  })
  await waitForIdlePropagation()

  await ownerApi.request(`/operations/comandas/${comanda.id}/close`, {
    method: 'POST',
    body: JSON.stringify({
      discountAmount: 0,
      serviceFeeAmount: 0,
      paymentMethod: 'PIX',
    }),
  })
  await waitForIdlePropagation()

  return {
    comandaId: comanda.id,
    metrics: {
      mesaLabel: freeMesa.label,
      ownerObserverMetrics: summarizePerfEvents(await readPerfEvents(ownerPage)),
      staffPageMetrics: summarizePerfEvents(await readPerfEvents(staffPage)),
      kitchenItemId: kitchenItem.itemId,
    },
  }
}

async function openComandaFromPage(page, productName, navTestId) {
  if (navTestId) {
    const navButton = page.getByTestId(navTestId)
    if (await navButton.isVisible().catch(() => false)) {
      await navButton.click()
    }
  }

  const mesaCard = page.locator('[data-testid^="mobile-mesa-"]').first()
  await mesaCard.waitFor({ state: 'visible', timeout: EVENT_TIMEOUT_MS })
  const mesaLabel = extractMesaLabel(await mesaCard.innerText())
  await mesaCard.click()

  const searchInput = page.getByPlaceholder('Buscar produto...')
  await searchInput.waitFor({ state: 'visible', timeout: EVENT_TIMEOUT_MS })
  await searchInput.fill(productName)

  const addButton = page.getByRole('button', { name: new RegExp(`Adicionar ${escapeRegex(productName)}`, 'i') }).first()
  await addButton.waitFor({ state: 'visible', timeout: EVENT_TIMEOUT_MS })
  await addButton.click()

  const submitButton = page.getByRole('button', { name: /Abrir comanda/i })
  await submitButton.waitFor({ state: 'visible', timeout: EVENT_TIMEOUT_MS })
  await submitButton.click()
  await submitButton.waitFor({ state: 'hidden', timeout: EVENT_TIMEOUT_MS })

  return mesaLabel
}

async function bootstrapAuthenticatedPage(context, page, session, path, readySelector) {
  await context.addCookies(
    session.cookies.map((entry) => {
      const separatorIndex = entry.indexOf('=')
      return {
        name: entry.slice(0, separatorIndex),
        value: entry.slice(separatorIndex + 1),
        url: 'https://api.deskimperial.online',
      }
    }),
  )

  await page.addInitScript(
    ({ csrfToken, consentCookieName, consentStorageKey, consentVersion }) => {
      window.localStorage.setItem(
        consentStorageKey,
        JSON.stringify({
          preferences: {
            analytics: true,
            marketing: true,
          },
          updatedAt: new Date().toISOString(),
          version: consentVersion,
        }),
      )
      document.cookie = `${consentCookieName}=accepted; Path=/; SameSite=Lax`
      window.sessionStorage.setItem('desk-imperial-csrf-token', csrfToken)
    },
    {
      csrfToken: session.csrfToken,
      consentCookieName: CONSENT_COOKIE_NAME,
      consentStorageKey: CONSENT_STORAGE_KEY,
      consentVersion: CONSENT_VERSION,
    },
  )
  await page.goto(`${APP_BASE_URL}${path}`, { waitUntil: 'networkidle' })
  try {
    await page.locator(readySelector).waitFor({ state: 'visible', timeout: EVENT_TIMEOUT_MS })
  } catch (error) {
    const text = await page
      .locator('body')
      .innerText()
      .catch(() => '')
    throw new Error(
      `Bootstrap da pagina ${path} falhou. url=${page.url()} selector=${readySelector} body=${JSON.stringify(text.slice(0, 600))} cause=${
        error instanceof Error ? error.message : String(error)
      }`,
    )
  }
}

async function enterOperationsSurface(page, navTestId) {
  const navButton = page.getByTestId(navTestId)
  if (await navButton.isVisible().catch(() => false)) {
    await navButton.click()
    await page.waitForLoadState('networkidle').catch(() => undefined)
  }
}

async function resetPerfEvents(page) {
  await page.evaluate((storeKey) => {
    const root = window
    if (!root[storeKey]) {
      root[storeKey] = { events: [] }
      return
    }
    root[storeKey].events = []
  }, PERF_STORE_KEY)
}

async function readPerfEvents(page) {
  return page.evaluate((storeKey) => {
    const root = window
    return Array.isArray(root[storeKey]?.events) ? root[storeKey].events : []
  }, PERF_STORE_KEY)
}

async function findProductByName(apiSession, productName) {
  const payload = await apiSession.request('/products?includeInactive=true')
  const product = (payload.items ?? []).find((entry) => entry.name === productName)
  if (!product) {
    throw new Error(`Produto nao encontrado para o smoke: ${productName}`)
  }
  return product
}

async function waitForFreeMesa(apiSession) {
  return waitFor(async () => {
    const mesas = await apiSession.request('/operations/mesas')
    const freeMesa = (mesas ?? []).find((entry) => entry.status === 'livre')
    if (!freeMesa) {
      throw new Error('Nenhuma mesa livre disponivel para o smoke.')
    }
    return freeMesa
  })
}

async function waitForKitchenItem(apiSession, comandaId) {
  return waitFor(async () => {
    const payload = await apiSession.request('/operations/kitchen')
    const item = (payload.items ?? []).find((entry) => entry.comandaId === comandaId)
    if (!item) {
      throw new Error(`Item de cozinha ainda nao encontrado para a comanda ${comandaId}.`)
    }
    return item
  })
}

async function waitFor(work, timeoutMs = EVENT_TIMEOUT_MS) {
  const startedAt = Date.now()
  let lastError = null

  while (Date.now() - startedAt < timeoutMs) {
    try {
      return await work()
    } catch (error) {
      lastError = error
      await waitForIdlePropagation(300)
    }
  }

  throw lastError ?? new Error('Tempo esgotado aguardando operacao assíncrona.')
}

async function safeCloseComanda(apiSession, comandaId) {
  try {
    await apiSession.request(`/operations/comandas/${comandaId}/close`, {
      method: 'POST',
      body: JSON.stringify({
        discountAmount: 0,
        serviceFeeAmount: 0,
        paymentMethod: 'PIX',
      }),
    })
  } catch (error) {
    console.error(`Falha no cleanup da comanda ${comandaId}:`, error instanceof Error ? error.message : error)
  }
}

function summarizePerfEvents(events) {
  const counts = {
    scheduled: 0,
    merged: 0,
    settled: 0,
    invalidations: 0,
    invalidationCalls: 0,
  }

  const mutations = []

  for (const event of events) {
    switch (event.type) {
      case 'reconcile-scheduled':
        counts.scheduled += 1
        break
      case 'reconcile-merged':
        counts.merged += 1
        break
      case 'reconcile-settled':
        counts.settled += 1
        break
      case 'workspace-invalidated':
        counts.invalidations += 1
        counts.invalidationCalls += event.invalidateCount ?? 0
        break
      case 'mutation-finished':
        mutations.push({
          action: event.action,
          surface: event.surface,
          status: event.status,
          durationMs: event.durationMs,
        })
        break
      default:
        break
    }
  }

  return {
    counts,
    events,
    mutations,
  }
}

function extractMesaLabel(text) {
  const inlineMatch = text.match(/Mesa\s+(\d+)/i)
  if (inlineMatch) {
    return inlineMatch[1]
  }

  const numericLine = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => /^\d+$/.test(line))

  if (!numericLine) {
    throw new Error(`Nao foi possivel identificar o label da mesa no card: ${text}`)
  }

  return numericLine
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function waitForIdlePropagation(delayMs = 1_600) {
  await new Promise((resolve) => setTimeout(resolve, delayMs))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
