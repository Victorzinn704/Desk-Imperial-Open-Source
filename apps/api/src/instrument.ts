import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import * as Sentry from '@sentry/nestjs'
import { nodeProfilingIntegration } from '@sentry/profiling-node'

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

loadEnvironmentFiles()

const dsn = normalizeString(process.env.SENTRY_DSN)
const environment = normalizeString(process.env.SENTRY_ENVIRONMENT) ?? normalizeString(process.env.NODE_ENV) ?? 'development'
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
  integrations: [Sentry.httpIntegration({ spans: false }), nodeProfilingIntegration()],
  enableLogs,
  tracesSampleRate,
  profileSessionSampleRate,
  profileLifecycle,
  sendDefaultPii,
})

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
