const DEFAULT_BASE_URL = 'http://127.0.0.1:4000/api/v1'

const args = new Set(process.argv.slice(2))
const strictMode = args.has('--strict') || process.env.DESK_OPERATION_SMOKE_STRICT === 'true'
const API_BASE_URL = trimTrailingSlash(process.env.DESK_API_BASE_URL ?? DEFAULT_BASE_URL)
const ITERATIONS = parsePositiveInteger(process.env.DESK_OPERATION_SMOKE_ITERATIONS, 12)
const WARMUP_ITERATIONS = parsePositiveInteger(process.env.DESK_OPERATION_SMOKE_WARMUP_ITERATIONS, 2)
const LIVE_P95_THRESHOLD_MS = parsePositiveInteger(process.env.DESK_OPERATION_SMOKE_LIVE_P95_MS, 1200)
const KITCHEN_P95_THRESHOLD_MS = parsePositiveInteger(process.env.DESK_OPERATION_SMOKE_KITCHEN_P95_MS, 1000)

const checks = [
  {
    name: 'health',
    path: '/health',
    auth: false,
  },
  {
    name: 'operations-live-compact',
    path: '/operations/live?compactMode=true',
    auth: true,
    p95ThresholdMs: LIVE_P95_THRESHOLD_MS,
  },
  {
    name: 'operations-live-full',
    path: '/operations/live?includeCashMovements=true',
    auth: true,
    p95ThresholdMs: LIVE_P95_THRESHOLD_MS,
  },
  {
    name: 'operations-kitchen',
    path: '/operations/kitchen',
    auth: true,
    p95ThresholdMs: KITCHEN_P95_THRESHOLD_MS,
  },
  {
    name: 'operations-summary',
    path: '/operations/summary',
    auth: true,
  },
]

async function main() {
  const cookie = process.env.DESK_SESSION_COOKIE?.trim() || (await loginDemo())
  const results = []

  console.log(`[perf] base=${API_BASE_URL}`)
  console.log(`[perf] iterations=${ITERATIONS} warmup=${WARMUP_ITERATIONS} strict=${strictMode}`)

  for (const check of checks) {
    const sample = await measureEndpoint(check, cookie)
    results.push(sample)
    printSample(sample)
  }

  const failing = results.filter((sample) => sample.p95ThresholdMs != null && sample.p95Ms > sample.p95ThresholdMs)

  if (strictMode && failing.length > 0) {
    throw new Error(
      `Performance smoke failed: ${failing
        .map((sample) => `${sample.name} p95=${sample.p95Ms}ms > ${sample.p95ThresholdMs}ms`)
        .join('; ')}`,
    )
  }
}

async function measureEndpoint(check, cookie) {
  const durations = []
  let lastStatus = 0
  let lastShape = ''

  for (let index = 0; index < WARMUP_ITERATIONS + ITERATIONS; index += 1) {
    const sample = await timedFetch(check, cookie)
    lastStatus = sample.status
    lastShape = sample.shape
    if (index >= WARMUP_ITERATIONS) {
      durations.push(sample.durationMs)
    }
  }

  durations.sort((left, right) => left - right)
  return {
    name: check.name,
    path: check.path,
    status: lastStatus,
    shape: lastShape,
    minMs: percentile(durations, 0),
    p50Ms: percentile(durations, 0.5),
    p95Ms: percentile(durations, 0.95),
    p99Ms: percentile(durations, 0.99),
    maxMs: percentile(durations, 1),
    p95ThresholdMs: check.p95ThresholdMs,
  }
}

async function timedFetch(check, cookie) {
  const startedAt = performance.now()
  const response = await fetch(`${API_BASE_URL}${check.path}`, {
    headers: check.auth ? { cookie } : undefined,
  })
  const durationMs = Math.round(performance.now() - startedAt)
  let payload = null

  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    throw new Error(`${check.name} failed with HTTP ${response.status}`)
  }

  return {
    durationMs,
    status: response.status,
    shape: summarizeShape(payload),
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

function percentile(values, percentileValue) {
  if (values.length === 0) {
    return 0
  }

  const index = Math.min(values.length - 1, Math.ceil(values.length * percentileValue) - 1)
  return values[Math.max(0, index)]
}

function printSample(sample) {
  const threshold = sample.p95ThresholdMs == null ? '' : ` threshold=${sample.p95ThresholdMs}ms`
  const status = sample.p95ThresholdMs != null && sample.p95Ms > sample.p95ThresholdMs ? 'SLOW' : 'OK'
  console.log(
    `[perf] ${status} ${sample.name} status=${sample.status} min=${sample.minMs}ms p50=${sample.p50Ms}ms p95=${sample.p95Ms}ms p99=${sample.p99Ms}ms max=${sample.maxMs}ms${threshold} shape=${sample.shape}`,
  )
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function trimTrailingSlash(value) {
  return value.endsWith('/') ? value.slice(0, -1) : value
}

main().catch((error) => {
  console.error(`[perf] ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
