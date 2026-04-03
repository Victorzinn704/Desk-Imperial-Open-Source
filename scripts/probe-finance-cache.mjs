import { performance } from 'node:perf_hooks'
import { setTimeout as delay } from 'node:timers/promises'

const baseUrl = normalizeBaseUrl(process.env.PROBE_BASE_URL ?? 'https://api.deskimperial.online/api')
const authMode = (process.env.PROBE_AUTH_MODE ?? 'demo').trim().toLowerCase()
const loginMode = (process.env.PROBE_LOGIN_MODE ?? 'OWNER').trim().toUpperCase()
const freshWindowWaitMs = parsePositiveInteger(process.env.PROBE_FRESH_WINDOW_WAIT_MS, 125_000)
const postRefreshWaitMs = parsePositiveInteger(process.env.PROBE_POST_REFRESH_WAIT_MS, 5_000)
const staleExpiryWaitMs = parsePositiveInteger(process.env.PROBE_STALE_EXPIRY_WAIT_MS, 305_000)
const requestTimeoutMs = parsePositiveInteger(process.env.PROBE_REQUEST_TIMEOUT_MS, 30_000)
const outputFile = process.env.PROBE_OUTPUT_FILE?.trim() || null
const userAgent =
  process.env.PROBE_USER_AGENT?.trim() || `desk-imperial-finance-probe/1.0 (${new Date().toISOString()})`

const cookieJar = new Map()

const steps = [
  { name: 'baseline', waitMs: 0 },
  { name: 'warm-repeat', waitMs: 2_000 },
  { name: 'after-fresh-window', waitMs: freshWindowWaitMs },
  { name: 'post-background-refresh', waitMs: postRefreshWaitMs },
  { name: 'after-stale-expiry', waitMs: staleExpiryWaitMs },
]

const loginPayload =
  authMode === 'demo'
    ? {
        loginMode,
        ...(loginMode === 'STAFF' && process.env.PROBE_EMPLOYEE_CODE
          ? { employeeCode: process.env.PROBE_EMPLOYEE_CODE.trim() }
          : {}),
      }
    : {
        loginMode,
        email: requiredEnv('PROBE_EMAIL'),
        password: requiredEnv('PROBE_PASSWORD'),
      }

const loginPath = authMode === 'demo' ? '/auth/demo' : '/auth/login'

const runStartedAt = new Date().toISOString()

try {
  const loginResult = await requestJson(loginPath, {
    method: 'POST',
    body: JSON.stringify(loginPayload),
  })

  const measurements = []

  for (const step of steps) {
    if (step.waitMs > 0) {
      console.log(`Aguardando ${Math.round(step.waitMs / 1000)}s para ${step.name}...`)
      await delay(step.waitMs)
    }

    const result = await requestJson('/finance/summary', { method: 'GET' })
    measurements.push({
      step: step.name,
      requestedAt: new Date().toISOString(),
      status: result.status,
      durationMs: result.durationMs,
      requestId: result.requestId,
      bodySizeBytes: result.bodySizeBytes,
      summaryShape: summarizeFinancePayload(result.body),
      notes: inferStepNote(step.name, result.durationMs),
    })

    console.log(
      `${step.name}: ${result.status} em ${result.durationMs}ms` +
        (result.requestId ? ` (requestId ${result.requestId})` : ''),
    )
  }

  const report = {
    generatedAt: new Date().toISOString(),
    runStartedAt,
    baseUrl,
    authMode,
    loginMode,
    userAgent,
    waitsMs: {
      freshWindow: freshWindowWaitMs,
      postRefresh: postRefreshWaitMs,
      staleExpiry: staleExpiryWaitMs,
    },
    caveats: [
      authMode === 'demo'
        ? 'Probe usa o workspace demo compartilhado; tráfego externo pode aquecer ou invalidar o cache entre as medições.'
        : 'Probe usa credenciais dedicadas; interferência externa deve ser menor.',
      'O estado fresh/stale não é exposto na resposta HTTP hoje; a inferência aqui usa janela temporal + padrão de latência.',
    ],
    login: {
      status: loginResult.status,
      durationMs: loginResult.durationMs,
      requestId: loginResult.requestId,
      user: summarizeAuthUser(loginResult.body),
    },
    measurements,
  }

  if (outputFile) {
    const { writeFile } = await import('node:fs/promises')
    await writeFile(outputFile, JSON.stringify(report, null, 2))
    console.log(`Relatório salvo em ${outputFile}`)
  }

  console.log(JSON.stringify(report, null, 2))
} catch (error) {
  console.error(formatError(error))
  process.exitCode = 1
}

async function requestJson(path, init) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs)
  const startedAt = performance.now()

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        'User-Agent': userAgent,
        ...(cookieJar.size > 0 ? { Cookie: serializeCookies(cookieJar) } : {}),
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
      signal: controller.signal,
    })

    storeCookies(response)

    const text = await response.text()
    const durationMs = Math.round(performance.now() - startedAt)
    const body = tryParseJson(text)

    if (!response.ok) {
      throw new Error(
        `Request ${path} falhou com ${response.status}: ${
          typeof body === 'object' && body && 'message' in body ? body.message : text
        }`,
      )
    }

    return {
      status: response.status,
      durationMs,
      requestId: response.headers.get('x-request-id'),
      body,
      bodySizeBytes: Buffer.byteLength(text, 'utf8'),
    }
  } finally {
    clearTimeout(timeout)
  }
}

function storeCookies(response) {
  const cookies = typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : []

  for (const cookie of cookies) {
    const [pair] = cookie.split(';', 1)
    const separatorIndex = pair.indexOf('=')
    if (separatorIndex <= 0) continue
    const name = pair.slice(0, separatorIndex)
    const value = pair.slice(separatorIndex + 1)
    cookieJar.set(name, value)
  }
}

function serializeCookies(jar) {
  return Array.from(jar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join('; ')
}

function tryParseJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function normalizeBaseUrl(value) {
  return value.replace(/\/+$/, '')
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function requiredEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Defina ${name} para usar PROBE_AUTH_MODE=login.`)
  }
  return value
}

function summarizeAuthUser(body) {
  if (!body || typeof body !== 'object' || !('user' in body) || typeof body.user !== 'object' || !body.user) {
    return null
  }

  return {
    role: body.user.role,
    workspaceOwnerUserId: body.user.workspaceOwnerUserId,
    preferredCurrency: body.user.preferredCurrency,
    evaluationAccess: body.user.evaluationAccess ?? null,
  }
}

function summarizeFinancePayload(body) {
  if (!body || typeof body !== 'object') {
    return null
  }

  return {
    activeProducts: body.totals?.activeProducts ?? null,
    revenueTimelinePoints: Array.isArray(body.revenueTimeline) ? body.revenueTimeline.length : null,
    salesMapRegions: Array.isArray(body.salesMap) ? body.salesMap.length : null,
    topProducts: Array.isArray(body.topProducts) ? body.topProducts.length : null,
    topCustomers: Array.isArray(body.topCustomers) ? body.topCustomers.length : null,
    topEmployees: Array.isArray(body.topEmployees) ? body.topEmployees.length : null,
    recentOrders: Array.isArray(body.recentOrders) ? body.recentOrders.length : null,
    displayCurrency: body.displayCurrency ?? null,
    ratesSource: body.ratesSource ?? null,
  }
}

function inferStepNote(stepName, durationMs) {
  switch (stepName) {
    case 'baseline':
      return durationMs > 1000
        ? 'Primeira leitura ainda parece fria ou parcialmente fria.'
        : 'Primeira leitura já chegou aquecida.'
    case 'warm-repeat':
      return durationMs < 900
        ? 'Repetição curta confirmou comportamento quente.'
        : 'Repetição curta ainda ficou pesada; vale investigar ruído externo ou cold path residual.'
    case 'after-fresh-window':
      return durationMs < 1000
        ? 'Passou da janela fresh sem voltar ao custo frio — bom sinal para stale-while-revalidate.'
        : 'Depois da janela fresh o request ainda ficou caro; refresh-ahead pode não ter protegido o suficiente.'
    case 'post-background-refresh':
      return durationMs < 900
        ? 'Leitura após o refresh em background permaneceu quente.'
        : 'Refresh em background não estabilizou como esperado.'
    case 'after-stale-expiry':
      return durationMs > 1000
        ? 'Após expirar a janela stale houve custo perceptível de rebuild.'
        : 'Mesmo após a janela stale a rota continuou quente; pode haver tráfego compartilhado ou aquecimento externo.'
    default:
      return null
  }
}

function formatError(error) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`
  }

  return String(error)
}
