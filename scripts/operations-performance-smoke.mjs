import { extname, resolve } from 'node:path'
import {
  classifyPerformanceSample,
  formatBytes,
  writePerformanceReportIfRequested,
} from './operations-performance-report.mjs'

const DEFAULT_BASE_URL = 'http://127.0.0.1:4000/api/v1'
const cliOptions = parseCliOptions(process.argv.slice(2))

const strictMode = cliOptions.strict || process.env.DESK_OPERATION_SMOKE_STRICT === 'true'
const API_BASE_URL = trimTrailingSlash(process.env.DESK_API_BASE_URL ?? DEFAULT_BASE_URL)
const ITERATIONS = parsePositiveInteger(process.env.DESK_OPERATION_SMOKE_ITERATIONS, 12)
const WARMUP_ITERATIONS = parseNonNegativeInteger(process.env.DESK_OPERATION_SMOKE_WARMUP_ITERATIONS, 2)
const LIVE_P95_THRESHOLD_MS = parsePositiveInteger(process.env.DESK_OPERATION_SMOKE_LIVE_P95_MS, 1200)
const KITCHEN_P95_THRESHOLD_MS = parsePositiveInteger(process.env.DESK_OPERATION_SMOKE_KITCHEN_P95_MS, 1000)
const REPORT_PATH = resolveReportPath(cliOptions.reportPath)
const REPORT_FORMAT = resolveReportFormat(cliOptions.reportFormat, REPORT_PATH)

const checks = [
  {
    name: 'health',
    path: '/health',
    auth: false,
    targetP95Ms: 300,
  },
  {
    name: 'operations-live-compact',
    path: '/operations/live?compactMode=true',
    auth: true,
    p95ThresholdMs: LIVE_P95_THRESHOLD_MS,
    targetP95Ms: 600,
  },
  {
    name: 'operations-live-full',
    path: '/operations/live?includeCashMovements=true',
    auth: true,
    p95ThresholdMs: LIVE_P95_THRESHOLD_MS,
    targetP95Ms: 900,
  },
  {
    name: 'operations-kitchen',
    path: '/operations/kitchen',
    auth: true,
    p95ThresholdMs: KITCHEN_P95_THRESHOLD_MS,
    targetP95Ms: 600,
  },
  {
    name: 'operations-summary',
    path: '/operations/summary',
    auth: true,
    targetP95Ms: 800,
  },
]

async function main() {
  printExecutionHeader()

  const cookie = await resolveSessionCookie()
  const results = []

  for (const check of checks) {
    const sample = await measureEndpoint(check, cookie)
    results.push(sample)
    printSample(sample)
  }

  const failing = collectStrictFailures(results)
  await writePerformanceReportIfRequested({
    failing,
    format: REPORT_FORMAT,
    reportPath: REPORT_PATH,
    results,
    run: buildRunContext(),
  })
  assertStrictBudget(failing)
}

function printExecutionHeader() {
  console.log(`[perf] base=${API_BASE_URL}`)
  console.log(`[perf] iterations=${ITERATIONS} warmup=${WARMUP_ITERATIONS} strict=${strictMode}`)
  if (REPORT_PATH) {
    console.log(`[perf] report=${REPORT_PATH} format=${REPORT_FORMAT}`)
  }
}

async function resolveSessionCookie() {
  const existingCookie = process.env.DESK_SESSION_COOKIE?.trim()
  return existingCookie || (await loginDemo())
}

async function measureEndpoint(check, cookie) {
  const samples = []

  for (let index = 0; index < WARMUP_ITERATIONS + ITERATIONS; index += 1) {
    const sample = await timedFetch(check, cookie)
    if (index >= WARMUP_ITERATIONS) {
      samples.push(sample)
    }
  }

  return summarizeEndpointSamples(check, samples)
}

async function timedFetch(check, cookie) {
  const startedAt = performance.now()
  const response = await fetch(`${API_BASE_URL}${check.path}`, {
    headers: check.auth ? { cookie } : undefined,
  })
  const body = await response.text()
  const durationMs = Math.round(performance.now() - startedAt)

  if (!response.ok) {
    throw new Error(`${check.name} failed with HTTP ${response.status}`)
  }

  return {
    durationMs,
    payloadBytes: byteLength(body),
    shape: summarizeShape(parseJsonPayload(body)),
    status: response.status,
  }
}

function summarizeEndpointSamples(check, samples) {
  const durations = samples.map((sample) => sample.durationMs).sort((left, right) => left - right)
  const payloadBytes = samples.map((sample) => sample.payloadBytes).sort((left, right) => left - right)
  const lastSample = samples.at(-1) ?? { payloadBytes: 0, shape: 'empty', status: 0 }

  return {
    name: check.name,
    path: check.path,
    status: lastSample.status,
    shape: lastSample.shape,
    minMs: percentile(durations, 0),
    p50Ms: percentile(durations, 0.5),
    p95Ms: percentile(durations, 0.95),
    p99Ms: percentile(durations, 0.99),
    maxMs: percentile(durations, 1),
    payloadBytes: lastSample.payloadBytes,
    payloadP95Bytes: percentile(payloadBytes, 0.95),
    p95ThresholdMs: check.p95ThresholdMs,
    targetP95Ms: check.targetP95Ms,
  }
}

async function loginDemo() {
  const loginMode = process.env.DESK_OPERATION_SMOKE_LOGIN_MODE?.trim() || 'OWNER'
  const payload =
    loginMode === 'STAFF'
      ? {
          employeeCode: process.env.DESK_OPERATION_SMOKE_EMPLOYEE_CODE?.trim() || 'VD-001',
          loginMode,
        }
      : { loginMode }

  const response = await fetch(`${API_BASE_URL}/auth/demo`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(
      `Demo login failed with HTTP ${response.status}. Set DESK_SESSION_COOKIE to reuse an existing session.`,
    )
  }

  const cookie = extractCookieHeader(response)
  if (!cookie) {
    throw new Error('Demo login did not return a session cookie. Set DESK_SESSION_COOKIE to reuse an existing session.')
  }

  return cookie
}

function extractCookieHeader(response) {
  const entries =
    typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : [response.headers.get('set-cookie')].filter(Boolean)

  return entries.map((entry) => entry.split(';', 1)[0]).join('; ')
}

function summarizeShape(payload) {
  if (!payload || typeof payload !== 'object') {
    return 'empty'
  }

  const record = payload
  if (Array.isArray(record.items)) {
    return `items=${record.items.length}`
  }
  if (Array.isArray(record.mesas) || Array.isArray(record.employees)) {
    const employees = Array.isArray(record.employees) ? record.employees.length : 0
    const mesas = Array.isArray(record.mesas) ? record.mesas.length : 0
    return `employees=${employees} mesas=${mesas}`
  }
  if (record.kpis && typeof record.kpis === 'object') {
    return 'kpis=1'
  }
  if (record.checks && typeof record.checks === 'object') {
    return `checks=${Object.keys(record.checks).join(',')}`
  }

  return `keys=${Object.keys(record).slice(0, 4).join(',')}`
}

function parseJsonPayload(body) {
  if (!body) {
    return null
  }

  try {
    return JSON.parse(body)
  } catch {
    return null
  }
}

function percentile(values, percentileValue) {
  if (values.length === 0) {
    return 0
  }

  const index = Math.min(values.length - 1, Math.ceil(values.length * percentileValue) - 1)
  return values[Math.max(0, index)]
}

function printSample(sample) {
  const status = classifyPerformanceSample(sample)
  const strictThreshold = sample.p95ThresholdMs == null ? '' : ` threshold=${sample.p95ThresholdMs}ms`
  const target = sample.targetP95Ms == null ? '' : ` target=${sample.targetP95Ms}ms`

  console.log(
    `[perf] ${status} ${sample.name} status=${sample.status} min=${sample.minMs}ms p50=${sample.p50Ms}ms p95=${sample.p95Ms}ms p99=${sample.p99Ms}ms max=${sample.maxMs}ms${target}${strictThreshold} payload_p95=${formatBytes(sample.payloadP95Bytes)} shape=${sample.shape}`,
  )
}

function collectStrictFailures(results) {
  return results.filter((sample) => sample.p95ThresholdMs != null && sample.p95Ms > sample.p95ThresholdMs)
}

function assertStrictBudget(failing) {
  if (!strictMode || failing.length === 0) {
    return
  }

  throw new Error(
    `Performance smoke failed: ${failing
      .map((sample) => `${sample.name} p95=${sample.p95Ms}ms > ${sample.p95ThresholdMs}ms`)
      .join('; ')}`,
  )
}

function buildRunContext() {
  return {
    baseUrl: API_BASE_URL,
    iterations: ITERATIONS,
    strictMode,
    warmupIterations: WARMUP_ITERATIONS,
  }
}

function parseCliOptions(argv) {
  const options = { reportFormat: '', reportPath: '', strict: false }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--strict') {
      options.strict = true
      continue
    }
    if (arg === '--report') {
      options.reportPath = argv[index + 1] ?? ''
      index += 1
      continue
    }
    if (arg.startsWith('--report=')) {
      options.reportPath = arg.slice('--report='.length)
      continue
    }
    if (arg.startsWith('--report-format=')) {
      options.reportFormat = arg.slice('--report-format='.length)
    }
  }

  return options
}

function resolveReportPath(cliReportPath) {
  const rawPath = cliReportPath || process.env.DESK_OPERATION_SMOKE_REPORT_PATH?.trim() || ''
  return rawPath ? resolve(rawPath) : ''
}

function resolveReportFormat(cliReportFormat, reportPath) {
  const requested = cliReportFormat || process.env.DESK_OPERATION_SMOKE_REPORT_FORMAT?.trim() || ''
  if (requested === 'json' || requested === 'markdown') {
    return requested
  }

  return extname(reportPath).toLowerCase() === '.json' ? 'json' : 'markdown'
}

function byteLength(value) {
  return new TextEncoder().encode(value).length
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function parseNonNegativeInteger(value, fallback) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback
}

function trimTrailingSlash(value) {
  return value.endsWith('/') ? value.slice(0, -1) : value
}

main().catch((error) => {
  console.error(`[perf] ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
