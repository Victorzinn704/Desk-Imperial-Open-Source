import { type Faro, FetchTransport, getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk'

type ApiClientErrorTelemetryContext = {
  path: string
  method: string
  status: number
  requestId?: string | null
}

type ApiRequestMeasurementTelemetryContext = {
  path: string
  method: string
  status: number
  durationMs: number
  requestId?: string | null
}

type FrontendExceptionTelemetryContext = {
  component?: string
  digest?: string
}

const DEFAULT_EVENT_DOMAIN = 'desk-imperial-web'
const SIGNAL_WINDOW_MS = 60_000
const DEFAULT_MAX_SIGNALS_PER_WINDOW = 120
const DEFAULT_BATCH_SEND_TIMEOUT_MS = 5_000
const DEFAULT_BATCH_ITEM_LIMIT = 30
const DEFAULT_TRANSPORT_CONCURRENCY = 4
const DEFAULT_TRANSPORT_BACKOFF_MS = 30_000
const DEFAULT_ERROR_DEDUPE_WINDOW_MS = 30_000
const DEFAULT_SLOW_API_THRESHOLD_MS = 1_200
const DEFAULT_SLOW_API_SAMPLE_RATE = 0.1

const UUID_SEGMENT_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi
const NUMERIC_SEGMENT_PATTERN = /\/\d{2,}(?=\/|$)/g
const LONG_TOKEN_SEGMENT_PATTERN = /\/[A-Za-z0-9_-]{20,}(?=\/|$)/g

let faroInstance: Faro | null = null
let faroInitializationAttempted = false
let maxSignalsPerWindow = DEFAULT_MAX_SIGNALS_PER_WINDOW
let errorDedupeWindowMs = DEFAULT_ERROR_DEDUPE_WINDOW_MS
let slowApiThresholdMs = DEFAULT_SLOW_API_THRESHOLD_MS
let slowApiSampleRate = DEFAULT_SLOW_API_SAMPLE_RATE

let signalWindowStartedAt = 0
let signalCountInWindow = 0
const recentErrorFingerprints = new Map<string, number>()
let fallbackSamplingCounter = 0

export function initializeFrontendFaro() {
  if (faroInitializationAttempted) {
    return faroInstance
  }

  faroInitializationAttempted = true

  if (typeof window === 'undefined') {
    return null
  }

  const collectorUrl = resolveCollectorUrl({
    rawUrl: process.env.NEXT_PUBLIC_FARO_COLLECTOR_URL,
    allowInsecureCollector: parseBoolean(process.env.NEXT_PUBLIC_FARO_ALLOW_INSECURE_COLLECTOR, false),
    nodeEnv: process.env.NODE_ENV,
  })

  if (!collectorUrl) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[Faro] Collector desabilitado: URL ausente/invalida para o ambiente atual.')
    }
    return null
  }

  maxSignalsPerWindow = parsePositiveInteger(
    process.env.NEXT_PUBLIC_FARO_MAX_SIGNALS_PER_MINUTE,
    DEFAULT_MAX_SIGNALS_PER_WINDOW,
  )
  errorDedupeWindowMs = parsePositiveInteger(
    process.env.NEXT_PUBLIC_FARO_ERROR_DEDUPE_WINDOW_MS,
    DEFAULT_ERROR_DEDUPE_WINDOW_MS,
  )
  slowApiThresholdMs = parsePositiveInteger(
    process.env.NEXT_PUBLIC_FARO_SLOW_API_THRESHOLD_MS,
    DEFAULT_SLOW_API_THRESHOLD_MS,
  )
  slowApiSampleRate = parseSampleRate(process.env.NEXT_PUBLIC_FARO_SLOW_API_SAMPLE_RATE, DEFAULT_SLOW_API_SAMPLE_RATE)

  const batchSendTimeout = parsePositiveInteger(
    process.env.NEXT_PUBLIC_FARO_BATCH_SEND_TIMEOUT_MS,
    DEFAULT_BATCH_SEND_TIMEOUT_MS,
  )
  const batchItemLimit = parsePositiveInteger(process.env.NEXT_PUBLIC_FARO_BATCH_ITEM_LIMIT, DEFAULT_BATCH_ITEM_LIMIT)
  const transportConcurrency = parsePositiveInteger(
    process.env.NEXT_PUBLIC_FARO_TRANSPORT_CONCURRENCY,
    DEFAULT_TRANSPORT_CONCURRENCY,
  )
  const transportBackoffMs = parsePositiveInteger(
    process.env.NEXT_PUBLIC_FARO_TRANSPORT_BACKOFF_MS,
    DEFAULT_TRANSPORT_BACKOFF_MS,
  )

  faroInstance = initializeFaro({
    url: collectorUrl,
    app: {
      name: process.env.NEXT_PUBLIC_FARO_APP_NAME?.trim() || 'desk-imperial-web',
      version: process.env.NEXT_PUBLIC_FARO_APP_VERSION?.trim() || '0.1.0',
      environment: process.env.NEXT_PUBLIC_FARO_ENVIRONMENT?.trim() || process.env.NODE_ENV || 'development',
    },
    eventDomain: process.env.NEXT_PUBLIC_FARO_EVENT_DOMAIN?.trim() || DEFAULT_EVENT_DOMAIN,
    transports: [
      new FetchTransport({
        url: collectorUrl,
        bufferSize: batchItemLimit,
        concurrency: transportConcurrency,
        defaultRateLimitBackoffMs: transportBackoffMs,
        requestOptions: {
          keepalive: true,
          headers: {
            'x-observability-source': 'desk-imperial-web',
          },
        },
      }),
    ],
    instrumentations: getWebInstrumentations({
      captureConsole: parseBoolean(process.env.NEXT_PUBLIC_FARO_CAPTURE_CONSOLE, false),
      enablePerformanceInstrumentation: true,
      enableContentSecurityPolicyInstrumentation: true,
    }),
    batching: {
      enabled: true,
      sendTimeout: batchSendTimeout,
      itemLimit: batchItemLimit,
    },
    dedupe: true,
    trackResources: false,
    ignoreUrls: [/\/api\/health$/i, /\/_next\//i, /\/favicon\.ico$/i],
    beforeSend: (item) => {
      sanitizeTransportItemInPlace(item)
      return item
    },
    sessionTracking: {
      enabled: true,
      samplingRate: parseSampleRate(process.env.NEXT_PUBLIC_FARO_SAMPLE_RATE, 0.03),
    },
  })

  return faroInstance
}

export function reportApiErrorToFaro(error: Error, context: ApiClientErrorTelemetryContext) {
  const faro = initializeFrontendFaro()
  if (!faro) {
    return
  }

  const path = sanitizePath(context.path)
  const requestId = normalizeRequestId(context.requestId)
  const errorFingerprint = buildErrorFingerprint([
    'api_client_error',
    context.method,
    String(context.status),
    path,
    error.name,
    error.message,
  ])

  if (!consumeSignalBudget() || isRecentlyEmitted(errorFingerprint)) {
    return
  }

  const attributes = {
    method: context.method.toUpperCase(),
    path,
    requestId,
    status: String(context.status),
  }

  faro.api.pushError(error, {
    context: attributes,
  })
  faro.api.pushEvent('api_client_error', attributes, 'desk-imperial-web')
}

export function reportFrontendExceptionToFaro(error: Error, context: FrontendExceptionTelemetryContext = {}) {
  const faro = initializeFrontendFaro()
  if (!faro) {
    return
  }

  const errorFingerprint = buildErrorFingerprint([
    'frontend_exception',
    context.component ?? 'unknown',
    context.digest ?? 'n/a',
    error.name,
    error.message,
  ])

  if (!consumeSignalBudget() || isRecentlyEmitted(errorFingerprint)) {
    return
  }

  const attributes: Record<string, string> = {
    component: context.component ?? 'unknown',
    digest: context.digest ?? 'n/a',
  }

  faro.api.pushError(error, {
    context: attributes,
  })
  faro.api.pushEvent('frontend_exception', attributes, 'desk-imperial-web')
}

export function reportApiRequestMeasurementToFaro(context: ApiRequestMeasurementTelemetryContext) {
  const faro = initializeFrontendFaro()
  if (!faro) {
    return
  }

  const durationMs = Math.max(0, Math.round(context.durationMs))
  const path = sanitizePath(context.path)
  const method = context.method.toUpperCase()
  const status = context.status
  const requestId = normalizeRequestId(context.requestId)

  const isSlowRequest = durationMs >= slowApiThresholdMs
  const isServerError = status >= 500
  const sampledHealthyRequest = !(isSlowRequest || isServerError) && sampleUnit() <= slowApiSampleRate

  if (!(isSlowRequest || isServerError || sampledHealthyRequest)) {
    return
  }

  if (!consumeSignalBudget()) {
    return
  }

  faro.api.pushMeasurement(
    {
      type: 'api_request_duration_ms',
      values: {
        duration_ms: durationMs,
      },
      context: {
        method,
        path,
        status: String(status),
        requestId,
      },
    },
    {
      context: {
        method,
        path,
        status: String(status),
        requestId,
      },
    },
  )

  if (isSlowRequest) {
    faro.api.pushEvent(
      'api_slow_request',
      {
        method,
        path,
        requestId,
        status: String(status),
        durationMs: String(durationMs),
      },
      'desk-imperial-web',
    )
  }
}

function sampleUnit() {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const values = new Uint32Array(1)
    crypto.getRandomValues(values)
    return values[0] / 0xffffffff
  }

  fallbackSamplingCounter = (fallbackSamplingCounter + 1) % 10_000
  return ((Date.now() + fallbackSamplingCounter) % 10_000) / 10_000
}

function parseSampleRate(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    return fallback
  }

  return parsed
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
    return fallback
  }

  return parsed
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) {
    return fallback
  }

  return value === 'true'
}

function resolveCollectorUrl(options: {
  rawUrl: string | undefined
  allowInsecureCollector: boolean
  nodeEnv: string | undefined
}) {
  const collectorUrl = options.rawUrl?.trim()
  if (!collectorUrl) {
    return null
  }

  try {
    const parsed = new URL(collectorUrl)
    const isSecureTransport = parsed.protocol === 'https:'
    const isLocalDevelopmentCollector =
      parsed.protocol === 'http:' &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '::1')

    const productionMode = options.nodeEnv === 'production'
    if (productionMode && !isSecureTransport) {
      return null
    }

    if (!(productionMode || isSecureTransport || isLocalDevelopmentCollector || options.allowInsecureCollector)) {
      return null
    }

    return parsed.toString()
  } catch {
    return null
  }
}

function consumeSignalBudget() {
  const now = Date.now()

  if (signalWindowStartedAt === 0 || now - signalWindowStartedAt >= SIGNAL_WINDOW_MS) {
    signalWindowStartedAt = now
    signalCountInWindow = 0
  }

  if (signalCountInWindow >= maxSignalsPerWindow) {
    return false
  }

  signalCountInWindow += 1
  return true
}

function isRecentlyEmitted(fingerprint: string) {
  const now = Date.now()
  const previousTimestamp = recentErrorFingerprints.get(fingerprint)
  if (previousTimestamp && now - previousTimestamp < errorDedupeWindowMs) {
    return true
  }

  recentErrorFingerprints.set(fingerprint, now)

  // Keep map compact and bounded.
  if (recentErrorFingerprints.size > 400) {
    for (const [key, timestamp] of recentErrorFingerprints) {
      if (now - timestamp > errorDedupeWindowMs) {
        recentErrorFingerprints.delete(key)
      }
    }
  }

  return false
}

function buildErrorFingerprint(parts: string[]) {
  return parts.join('|').toLowerCase().slice(0, 512)
}

function sanitizePath(path: string) {
  const rawPath = path.split('?')[0] ?? '/'
  const normalizedPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`

  return normalizedPath
    .replace(UUID_SEGMENT_PATTERN, ':uuid')
    .replace(NUMERIC_SEGMENT_PATTERN, '/:id')
    .replace(LONG_TOKEN_SEGMENT_PATTERN, '/:token')
}

function sanitizeTransportItemInPlace(item: unknown) {
  if (!item || typeof item !== 'object') {
    return
  }

  const transportItem = item as {
    payload?: Record<string, unknown>
  }
  if (!transportItem.payload || typeof transportItem.payload !== 'object') {
    return
  }

  sanitizeRecordObject(transportItem.payload.context)
  sanitizeRecordObject(transportItem.payload.attributes)
}

function sanitizeRecordObject(value: unknown) {
  if (!value || typeof value !== 'object') {
    return
  }

  const record = value as Record<string, unknown>
  for (const [key, rawValue] of Object.entries(record)) {
    if (typeof rawValue !== 'string') {
      continue
    }

    record[key] = sanitizeContextString(key, rawValue)
  }
}

function sanitizeContextString(key: string, rawValue: string) {
  const normalizedKey = key.toLowerCase()
  if (
    normalizedKey.includes('password') ||
    normalizedKey.includes('token') ||
    normalizedKey.includes('authorization') ||
    normalizedKey.includes('cookie') ||
    normalizedKey.includes('secret') ||
    normalizedKey.includes('email') ||
    normalizedKey.includes('cpf') ||
    normalizedKey.includes('cnpj')
  ) {
    return '[redacted]'
  }

  if (normalizedKey.includes('path') || normalizedKey.includes('url')) {
    return sanitizePath(rawValue)
  }

  if (rawValue.length > 256) {
    return `${rawValue.slice(0, 253)}...`
  }

  return rawValue
}

export const __faroInternals = {
  sanitizePath,
  resolveCollectorUrl,
  parseSampleRate,
  parsePositiveInteger,
  sanitizeTransportItemInPlace,
}

function normalizeRequestId(value: string | null | undefined) {
  const normalized = value?.trim()
  if (!normalized) {
    return 'missing'
  }

  return normalized
}
