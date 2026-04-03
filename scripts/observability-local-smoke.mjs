import { performance } from 'node:perf_hooks'
import { setTimeout as delay } from 'node:timers/promises'

const apiBaseUrl = normalizeBaseUrl(process.env.OBS_SMOKE_API_URL ?? 'http://localhost:4000/api')
const prometheusBaseUrl = normalizeBaseUrl(process.env.OBS_SMOKE_PROM_URL ?? 'http://localhost:9090')
const userAgent =
  process.env.OBS_SMOKE_USER_AGENT?.trim() || `desk-imperial-obs-smoke/1.0 (${new Date().toISOString()})`
const exportWaitMs = parsePositiveInteger(process.env.OBS_SMOKE_EXPORT_WAIT_MS, 18_000)
const cookieJar = new Map()

try {
  const login = await requestJson(`${apiBaseUrl}/auth/demo`, {
    method: 'POST',
    body: JSON.stringify({ loginMode: 'OWNER' }),
  })

  const requests = []
  requests.push(await measuredGet(`${apiBaseUrl}/finance/summary`, 'finance-first'))
  requests.push(await measuredGet(`${apiBaseUrl}/finance/summary`, 'finance-repeat'))
  requests.push(await measuredGet(resolveOperationsLiveUrl(), 'operations-live'))
  requests.push(await measuredGet(`${apiBaseUrl}/operations/kitchen?compactMode=true`, 'operations-kitchen'))

  console.log(`Aguardando ${Math.round(exportWaitMs / 1000)}s para o export de métricas...`)
  await delay(exportWaitMs)

  const metricNames = await fetchMetricNames()
  const summary = {
    generatedAt: new Date().toISOString(),
    apiBaseUrl,
    prometheusBaseUrl,
    userAgent,
    login: {
      status: login.status,
      requestId: login.requestId,
      role: login.body?.user?.role ?? null,
    },
    requests,
    metricNames,
  }

  console.log(JSON.stringify(summary, null, 2))

  if (metricNames.length === 0) {
    throw new Error('Nenhuma métrica desk_* foi encontrada no Prometheus após o smoke local.')
  }
} catch (error) {
  console.error(formatError(error))
  process.exitCode = 1
}

async function measuredGet(url, name) {
  const result = await requestJson(url, { method: 'GET' })
  return {
    name,
    status: result.status,
    durationMs: result.durationMs,
    requestId: result.requestId,
  }
}

async function requestJson(url, init) {
  const startedAt = performance.now()
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': userAgent,
      ...(cookieJar.size > 0 ? { Cookie: serializeCookies(cookieJar) } : {}),
      ...init.headers,
    },
  })

  storeCookies(response)
  const text = await response.text()
  const body = tryParseJson(text)
  const durationMs = Math.round(performance.now() - startedAt)

  if (!response.ok) {
    throw new Error(
      `Request ${url} falhou com ${response.status}: ${
        typeof body === 'object' && body && 'message' in body ? body.message : text
      }`,
    )
  }

  return {
    status: response.status,
    durationMs,
    requestId: response.headers.get('x-request-id'),
    body,
  }
}

async function fetchMetricNames() {
  const response = await fetch(`${prometheusBaseUrl}/api/v1/label/__name__/values`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': userAgent,
    },
  })

  if (!response.ok) {
    throw new Error(`Prometheus label API respondeu ${response.status}.`)
  }

  const payload = await response.json()
  if (payload.status !== 'success' || !Array.isArray(payload.data)) {
    throw new Error('Resposta inesperada do Prometheus ao listar métricas.')
  }

  return payload.data.filter((name) => /^desk_(finance|operations)_/i.test(name)).sort()
}

function storeCookies(response) {
  const cookies = typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : []
  for (const cookie of cookies) {
    const [pair] = cookie.split(';', 1)
    const separatorIndex = pair.indexOf('=')
    if (separatorIndex <= 0) continue
    cookieJar.set(pair.slice(0, separatorIndex), pair.slice(separatorIndex + 1))
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

function resolveOperationsLiveUrl() {
  return `${apiBaseUrl}/operations/live?compactMode=true`
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function formatError(error) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`
  }

  return String(error)
}
