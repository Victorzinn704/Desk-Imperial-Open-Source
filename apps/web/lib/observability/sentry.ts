const DEFAULT_DEV_TRACE_SAMPLE_RATE = 1
const DEFAULT_PROD_TRACE_SAMPLE_RATE = 0.1

type RuntimeKind = 'client' | 'server' | 'edge'

type SentryRuntimeConfig = {
  dsn?: string
  enabled: boolean
  environment: string
  release?: string
  tracesSampleRate: number
  sendDefaultPii: boolean
  enableLogs: boolean
}

let frontendSentryInitializationAttempted = false

export function initializeFrontendSentry(Sentry: typeof import('@sentry/nextjs')) {
  if (frontendSentryInitializationAttempted) {
    return Sentry.getClient()
  }

  frontendSentryInitializationAttempted = true
  const config = getSentryRuntimeConfig('client')

  Sentry.init({
    dsn: config.dsn,
    enabled: config.enabled,
    environment: config.environment,
    release: config.release,
    tracesSampleRate: config.tracesSampleRate,
    sendDefaultPii: config.sendDefaultPii,
    enableLogs: config.enableLogs,
    tracePropagationTargets: getSentryTracePropagationTargets(),
  })

  return Sentry.getClient()
}

export function getSentryServerConfig(): SentryRuntimeConfig {
  return getSentryRuntimeConfig('server')
}

export function getSentryEdgeConfig(): SentryRuntimeConfig {
  return getSentryRuntimeConfig('edge')
}

function getSentryRuntimeConfig(runtime: RuntimeKind): SentryRuntimeConfig {
  const dsn =
    runtime === 'client'
      ? normalizeString(process.env.NEXT_PUBLIC_SENTRY_DSN)
      : normalizeString(process.env.SENTRY_WEB_DSN) ?? normalizeString(process.env.NEXT_PUBLIC_SENTRY_DSN)

  const environment =
    normalizeString(runtime === 'client' ? process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT : process.env.SENTRY_WEB_ENVIRONMENT) ??
    normalizeString(process.env.SENTRY_ENVIRONMENT) ??
    normalizeString(process.env.NODE_ENV) ??
    'development'

  const release =
    normalizeString(runtime === 'client' ? process.env.NEXT_PUBLIC_SENTRY_RELEASE : process.env.SENTRY_WEB_RELEASE) ??
    normalizeString(process.env.SENTRY_RELEASE) ??
    normalizeString(process.env.npm_package_version)

  const isProduction = environment === 'production'
  const tracesSampleRate = parseSampleRate(
    runtime === 'client' ? process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE : process.env.SENTRY_WEB_TRACES_SAMPLE_RATE,
    isProduction ? DEFAULT_PROD_TRACE_SAMPLE_RATE : DEFAULT_DEV_TRACE_SAMPLE_RATE,
  )

  const sendDefaultPii = parseBoolean(
    runtime === 'client' ? process.env.NEXT_PUBLIC_SENTRY_SEND_DEFAULT_PII : process.env.SENTRY_WEB_SEND_DEFAULT_PII,
    false,
  )

  const enableLogs = parseBoolean(
    runtime === 'client' ? process.env.NEXT_PUBLIC_SENTRY_ENABLE_LOGS : process.env.SENTRY_WEB_ENABLE_LOGS,
    false,
  )

  const enabled =
    parseBoolean(
      runtime === 'client' ? process.env.NEXT_PUBLIC_SENTRY_ENABLED : process.env.SENTRY_WEB_ENABLED,
      true,
    ) && Boolean(dsn)

  return {
    dsn,
    enabled,
    environment,
    release,
    tracesSampleRate,
    sendDefaultPii,
    enableLogs,
  }
}

function getSentryTracePropagationTargets() {
  const targets = new Set<string>([
    'http://localhost:3000',
    'http://localhost:4000',
    'https://app.deskimperial.online',
    'https://api.deskimperial.online',
  ])

  const configuredApiUrl = normalizeUrlOrigin(process.env.NEXT_PUBLIC_API_URL)
  const configuredAppUrl = normalizeUrlOrigin(process.env.NEXT_PUBLIC_APP_URL)

  if (configuredApiUrl) {
    targets.add(configuredApiUrl)
  }

  if (configuredAppUrl) {
    targets.add(configuredAppUrl)
  }

  return [...targets]
}

function normalizeUrlOrigin(value: string | undefined) {
  const normalized = normalizeString(value)
  if (!normalized) {
    return undefined
  }

  try {
    return new URL(normalized).origin
  } catch {
    return undefined
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

  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    return fallback
  }

  return parsed
}
