#!/usr/bin/env node

const baseUrl = normalizeBaseUrl(process.env.DESK_SUPPORT_BASE_URL)
const expectOpenApi = process.env.DESK_SUPPORT_EXPECT_OPENAPI !== 'false'

if (!baseUrl) {
  fail('Defina DESK_SUPPORT_BASE_URL, por exemplo https://api.seudominio.com/api/v1.')
}

const results = []

await runReadinessStep('Health', `${baseUrl}/health`, [200], assertHealth)
await runReadinessStep('OpenAPI JSON', `${baseUrl}/openapi.json`, expectOpenApi ? [200] : [200, 404], assertOpenApi)

console.log('[PASS] Developer Support readiness smoke concluído.')

async function runReadinessStep(name, url, expectedStatuses, assertion) {
  const startedAt = performance.now()
  const response = await fetch(url, { method: 'GET' })
  const elapsedMs = Math.round(performance.now() - startedAt)
  const body = await parseBody(response)

  results.push({
    elapsedMs,
    name,
    requestId: response.headers.get('x-request-id'),
    status: response.status,
  })

  if (!expectedStatuses.includes(response.status)) {
    fail(`${name}: status ${response.status}, esperado ${expectedStatuses.join('/')}`)
  }

  assertion({ body, response })
  console.log(`${name}: ${response.status} (${elapsedMs}ms)`)
}

function normalizeBaseUrl(value) {
  const rawValue = value?.trim()
  if (!rawValue) {
    return null
  }
  return rawValue.replace(/\/+$/u, '')
}

async function parseBody(response) {
  const text = await response.text()
  if (!text) {
    return null
  }
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function assertHealth({ body }) {
  if (body?.status !== 'ok') {
    fail('Health não retornou status ok.')
  }
}

function assertOpenApi({ body, response }) {
  if (response.status === 404 && !expectOpenApi) {
    return
  }

  if (body?.openapi !== '3.1.0' || !body.paths) {
    fail('OpenAPI não retornou documento 3.1.0 válido.')
  }
}

function fail(message) {
  console.error(`[FAIL] ${message}`)
  if (results.length > 0) {
    console.error(JSON.stringify({ results }, null, 2))
  }
  process.exit(1)
}
