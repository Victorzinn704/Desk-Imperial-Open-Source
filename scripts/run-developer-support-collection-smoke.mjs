#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'

const collectionPath = path.resolve('docs/api/desk-imperial-support.postman_collection.json')
const reportPath = path.resolve('.cache/support-api-smoke-report.json')

const state = {
  variables: new Map([
    ['baseUrl', process.env.DESK_SUPPORT_BASE_URL || 'http://127.0.0.1:4000/api/v1'],
    ['ownerEmail', process.env.DESK_SUPPORT_OWNER_EMAIL || 'demo@deskimperial.online'],
    ['ownerPassword', process.env.DESK_SUPPORT_OWNER_PASSWORD || ''],
    ['staffCompanyEmail', process.env.DESK_SUPPORT_STAFF_COMPANY_EMAIL || 'demo@deskimperial.online'],
    ['staffEmployeeCode', process.env.DESK_SUPPORT_STAFF_EMPLOYEE_CODE || 'VD-001'],
    ['staffPassword', process.env.DESK_SUPPORT_STAFF_PASSWORD || ''],
    ['supportTableLabel', process.env.DESK_SUPPORT_TABLE_LABEL || `Mesa Support ${Date.now()}`],
    ['csrfToken', ''],
    ['productId', ''],
    ['comandaId', ''],
  ]),
  cookies: new Map(),
  results: [],
}

if (!state.variables.get('ownerPassword')) {
  fail('Defina DESK_SUPPORT_OWNER_PASSWORD para rodar o smoke local da coleção.')
}

if (!state.variables.get('staffPassword')) {
  fail('Defina DESK_SUPPORT_STAFF_PASSWORD para rodar o smoke local de autorização staff.')
}

const collection = JSON.parse(await fs.readFile(collectionPath, 'utf8'))
const itemsByName = new Map(flattenItems(collection.item ?? []).map((item) => [item.name, item]))

await runStep('Health', [200], assertJsonHealth)
await runStep('OpenAPI JSON', [200], assertOpenApiDocument)
await runStep('Auth - Login Owner', [200, 201], captureAuthState)
await runStep('Auth - Me', [200], assertJsonObject)
await runStep('Products - List', [200], captureFirstProduct)
await runStep('Operations - Live Snapshot', [200], assertJsonObject)
await runStep('Operations - Kitchen', [200], assertJsonObject)
await runStep('Comanda - Open', [200, 201], captureComanda)
await runStep('Comanda - Add Item', [200, 201], assertJsonObject)
await runStep('Comanda - Point Payment Intent', [200, 201, 202, 400, 409, 422, 503], assertNoForbidden)
await runStep('Auth - Login Staff', [200, 201], captureAuthState)
await runStep('Employees As Staff', [403], assertJsonObject)

await fs.mkdir(path.dirname(reportPath), { recursive: true })
await fs.writeFile(
  reportPath,
  `${JSON.stringify({ generatedAt: new Date().toISOString(), results: state.results }, null, 2)}\n`,
)

console.log(`[PASS] Developer Support collection smoke concluído: ${reportPath}`)

function flattenItems(items) {
  const result = []
  for (const item of items) {
    if (Array.isArray(item.item)) {
      result.push(...flattenItems(item.item))
      continue
    }
    result.push(item)
  }
  return result
}

async function runStep(name, expectedStatuses, assertion) {
  const item = itemsByName.get(name)
  if (!item) {
    fail(`Item ausente na coleção: ${name}`)
  }

  const startedAt = performance.now()
  const response = await sendPostmanItem(item)
  const elapsedMs = Math.round(performance.now() - startedAt)
  const body = await parseResponseBody(response)
  const result = { name, status: response.status, elapsedMs, requestId: response.headers.get('x-request-id') }
  state.results.push(result)

  if (!expectedStatuses.includes(response.status)) {
    fail(`${name}: status ${response.status}, esperado ${expectedStatuses.join('/')}`)
  }

  assertion({ body, response, result })
  console.log(`${name}: ${response.status} (${elapsedMs}ms)`)
}

async function sendPostmanItem(item) {
  const request = item.request
  const headers = buildHeaders(request.header ?? [])
  const body = buildBody(request.body)
  const url = replaceVariables(request.url.raw)

  const cookieHeader = buildCookieHeader()
  if (cookieHeader) {
    headers.set('Cookie', cookieHeader)
  }

  const response = await fetch(url, {
    method: request.method,
    headers,
    body,
  })

  captureCookies(response)
  return response
}

function buildHeaders(headerEntries) {
  const headers = new Headers()
  for (const entry of headerEntries) {
    const value = replaceVariables(entry.value ?? '')
    if (entry.key && value) {
      headers.set(entry.key, value)
    }
  }
  return headers
}

function buildBody(body) {
  if (!body || body.mode !== 'raw') {
    return undefined
  }
  return replaceVariables(body.raw ?? '')
}

function replaceVariables(value) {
  return String(value).replace(/\{\{([^}]+)\}\}/gu, (_match, key) => state.variables.get(key) ?? '')
}

function buildCookieHeader() {
  return [...state.cookies.entries()].map(([name, value]) => `${name}=${value}`).join('; ')
}

function captureCookies(response) {
  const setCookieHeaders = getSetCookieHeaders(response.headers)
  for (const header of setCookieHeaders) {
    const [pair] = header.split(';')
    const separatorIndex = pair.indexOf('=')
    if (separatorIndex <= 0) {
      continue
    }
    state.cookies.set(pair.slice(0, separatorIndex), pair.slice(separatorIndex + 1))
  }
}

function getSetCookieHeaders(headers) {
  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie()
  }
  const value = headers.get('set-cookie')
  return value ? [value] : []
}

async function parseResponseBody(response) {
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

function assertJsonHealth({ body }) {
  if (body?.status !== 'ok') {
    fail('Health não retornou status ok.')
  }
}

function assertOpenApiDocument({ body }) {
  if (body?.openapi !== '3.1.0' || !body.paths) {
    fail('OpenAPI local não retornou documento 3.1.0 válido.')
  }
}

function captureAuthState() {
  const csrfToken = state.cookies.get('partner_csrf') ?? state.cookies.get('__Host-partner_csrf')
  const session = state.cookies.get('partner_session') ?? state.cookies.get('__Host-partner_session')
  if (!csrfToken || !session) {
    fail('Login não retornou cookies de sessão e CSRF.')
  }
  state.variables.set('csrfToken', decodeURIComponent(csrfToken))
}

function assertJsonObject({ body }) {
  if (body === null || typeof body !== 'object') {
    fail('Resposta JSON esperada não foi objeto.')
  }
}

function captureFirstProduct({ body }) {
  assertJsonObject({ body })
  const productId = body.items?.[0]?.id
  if (!productId) {
    fail('Lista de produtos não retornou item para usar no smoke.')
  }
  state.variables.set('productId', productId)
}

function captureComanda({ body }) {
  assertJsonObject({ body })
  const comandaId = body.comanda?.id
  if (!comandaId) {
    fail('Abertura de comanda não retornou comanda.id.')
  }
  state.variables.set('comandaId', comandaId)
}

function assertNoForbidden({ response }) {
  if (response.status === 403) {
    fail('Fluxo com sessão e CSRF válidos retornou 403.')
  }
}

function fail(message) {
  console.error(`[FAIL] ${message}`)
  process.exit(1)
}
