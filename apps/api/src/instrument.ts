import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import process from 'node:process'
import * as Sentry from '@sentry/nestjs'

const ENV_FILE_CANDIDATES = Array.from(
  new Set([
    resolve(process.cwd(), 'apps/api/.env'),
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '../../.env'),
  ]),
)

const DEFAULT_DEV_TRACE_SAMPLE_RATE = 1
const DEFAULT_PROD_TRACE_SAMPLE_RATE = 0.1
const DEFAULT_DEV_PROFILE_SAMPLE_RATE = 0.25
const DEFAULT_PROD_PROFILE_SAMPLE_RATE = 0.02
const SENSITIVE_EVENT_KEY_PATTERN =
  /authorization|cookie|password|token|secret|csrf|pin|email|cpf|cnpj|session|jwt|api[-_]?key/i
const SENTRY_PROFILING_NODE_LTS_MAJORS = new Set([16, 18, 20, 22, 24])
const moduleRequire = createRequire(resolve(process.cwd(), 'package.json'))

type SentryEventShape = {
  request?: {
    headers?: Record<string, unknown>
    cookies?: unknown
    data?: unknown
    query_string?: unknown
  }
  breadcrumbs?: Array<{ data?: Record<string, unknown> }>
  contexts?: Record<string, unknown>
  extra?: Record<string, unknown>
}

loadEnvironmentFiles()

const dsn = normalizeString(process.env.SENTRY_DSN)
const environment =
  normalizeString(process.env.SENTRY_ENVIRONMENT) ?? normalizeString(process.env.NODE_ENV) ?? 'development'
const isProduction = environment === 'production'
const tracesSampleRate = parseSampleRate(
  process.env.SENTRY_TRACES_SAMPLE_RATE,
  isProduction ? DEFAULT_PROD_TRACE_SAMPLE_RATE : DEFAULT_DEV_TRACE_SAMPLE_RATE,
)
const profileSessionSampleRate = parseSampleRate(
  process.env.SENTRY_PROFILE_SESSION_SAMPLE_RATE,
  isProduction ? DEFAULT_PROD_PROFILE_SAMPLE_RATE : DEFAULT_DEV_PROFILE_SAMPLE_RATE,
)
const enableLogs = parseBoolean(process.env.SENTRY_ENABLE_LOGS, false)
const sendDefaultPii = parseBoolean(process.env.SENTRY_SEND_DEFAULT_PII, false)
const enabled = parseBoolean(process.env.SENTRY_ENABLED, true) && Boolean(dsn)
const release = normalizeString(process.env.SENTRY_RELEASE) ?? normalizeString(process.env.npm_package_version)
const profileLifecycle = process.env.SENTRY_PROFILE_LIFECYCLE === 'manual' ? 'manual' : 'trace'

Sentry.init({
  dsn,
  enabled,
  environment,
  release,
  skipOpenTelemetrySetup: true,
  integrations: buildSentryIntegrations(enabled, profileSessionSampleRate),
  enableLogs,
  tracesSampleRate,
  profileSessionSampleRate,
  profileLifecycle,
  sendDefaultPii,
  beforeSend: scrubSentryEvent,
})

function buildSentryIntegrations(enabled: boolean, profileSampleRate: number) {
  const integrations = [Sentry.httpIntegration({ spans: false })]
  if (!shouldEnableNodeProfiling(enabled, profileSampleRate)) {
    return integrations
  }

  const profilingIntegration = loadNodeProfilingIntegration()
  if (profilingIntegration) {
    integrations.push(profilingIntegration)
  }

  return integrations
}

function shouldEnableNodeProfiling(enabled: boolean, profileSampleRate: number) {
  return enabled && profileSampleRate > 0 && isSentryProfilingSupportedRuntime()
}

function loadNodeProfilingIntegration() {
  try {
    const profilingModule = moduleRequire('@sentry/profiling-node') as {
      nodeProfilingIntegration: () => ReturnType<typeof Sentry.httpIntegration>
    }
    return profilingModule.nodeProfilingIntegration()
  } catch {
    // Profiling is optional; Sentry events continue without the native addon.
    return null
  }
}

function isSentryProfilingSupportedRuntime() {
  const majorVersion = Number(process.versions.node.split('.')[0])
  return SENTRY_PROFILING_NODE_LTS_MAJORS.has(majorVersion)
}

function loadEnvironmentFiles() {
  if (typeof process.loadEnvFile !== 'function') {
    return
  }

  for (const candidate of ENV_FILE_CANDIDATES) {
    if (!existsSync(candidate)) {
      continue
    }

    try {
      process.loadEnvFile(candidate)
    } catch {
      // O ConfigModule continua sendo a fonte oficial de falha; aqui so
      // carregamos cedo o minimo para o Sentry inicializar antes do Nest.
    }
  }
}

function normalizeString(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) {
    return fallback
  }

  const normalized = value.trim().toLowerCase()
  if (normalized === 'true') {
    return true
  }
  if (normalized === 'false') {
    return false
  }

  return fallback
}

function parseSampleRate(value: string | undefined, fallback: number) {
  if (value === undefined) {
    return fallback
  }

  const numericValue = Number(value)
  if (!Number.isFinite(numericValue) || numericValue < 0 || numericValue > 1) {
    return fallback
  }

  return numericValue
}

function scrubSentryEvent<T>(event: T) {
  const mutableEvent = event as SentryEventShape
  scrubSentryRequest(mutableEvent.request)
  scrubRecord(mutableEvent.extra)

  for (const breadcrumb of mutableEvent.breadcrumbs ?? []) {
    scrubRecord(breadcrumb.data)
  }

  return event
}

function scrubSentryRequest(request: SentryEventShape['request']) {
  if (!request) {
    return
  }

  scrubRecord(request.headers)
  request.cookies = undefined
  request.data = redactUnknown(request.data)
  request.query_string = redactUnknown(request.query_string)
}

function scrubRecord(record: Record<string, unknown> | undefined) {
  if (!record) {
    return
  }

  for (const key of Object.keys(record)) {
    record[key] = shouldRedactEventKey(key) ? '[REDACTED]' : redactUnknown(record[key])
  }
}

function redactUnknown(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactUnknown)
  }

  if (!value || typeof value !== 'object') {
    return value
  }

  const copy = { ...(value as Record<string, unknown>) }
  scrubRecord(copy)
  return copy
}

function shouldRedactEventKey(key: string) {
  return SENSITIVE_EVENT_KEY_PATTERN.test(key)
}
