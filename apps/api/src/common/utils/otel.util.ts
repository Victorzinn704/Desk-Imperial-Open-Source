import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs'
import { NodeSDK, type NodeSDKConfiguration } from '@opentelemetry/sdk-node'
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { BatchSpanProcessor, ParentBasedSampler, TraceIdRatioBasedSampler, type SpanProcessor } from '@opentelemetry/sdk-trace-base'
import {
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions'
import * as Sentry from '@sentry/nestjs'
import { SentryPropagator, SentrySampler, SentrySpanProcessor } from '@sentry/opentelemetry'

type InitializeApiOpenTelemetryOptions = {
  endpoint?: string | undefined
  tracesEndpoint?: string | undefined
  metricsEndpoint?: string | undefined
  logsEndpoint?: string | undefined
  headers?: string | undefined
  serviceName?: string | undefined
  serviceVersion?: string | undefined
  environment?: string | undefined
  tracesSampleRate?: string | number | undefined
  metricsExportIntervalMs?: string | number | undefined
  diagnosticsEnabled?: boolean | undefined
}

export type InitializeApiOpenTelemetryResult = {
  enabled: boolean
  otlpTracesEnabled: boolean
  otlpMetricsEnabled: boolean
  otlpLogsEnabled: boolean
  sentryBridgeEnabled: boolean
}

let apiOtelSdk: NodeSDK | null = null
let apiOtelStarted = false
let apiOtelStatus: InitializeApiOpenTelemetryResult = {
  enabled: false,
  otlpTracesEnabled: false,
  otlpMetricsEnabled: false,
  otlpLogsEnabled: false,
  sentryBridgeEnabled: false,
}

export async function initializeApiOpenTelemetry(
  options: InitializeApiOpenTelemetryOptions,
): Promise<InitializeApiOpenTelemetryResult> {
  if (apiOtelStarted) {
    return apiOtelStatus
  }

  const traceEndpoint = normalizeSignalEndpoint(options.tracesEndpoint ?? options.endpoint, 'traces')
  const metricsEndpoint = normalizeSignalEndpoint(options.metricsEndpoint ?? options.endpoint, 'metrics')
  const logsEndpoint = normalizeSignalEndpoint(options.logsEndpoint ?? options.endpoint, 'logs')
  const sentryClient = getActiveSentryClient()
  const sentryBridgeEnabled = Boolean(sentryClient)

  if (!traceEndpoint && !metricsEndpoint && !logsEndpoint && !sentryBridgeEnabled) {
    return apiOtelStatus
  }

  if (options.diagnosticsEnabled) {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO)
  }

  const parsedHeaders = parseOtlpHeaders(options.headers)
  const tracesSampleRate = parseSampleRate(options.tracesSampleRate, 0.03)
  const metricsExportIntervalMs = parsePositiveInteger(options.metricsExportIntervalMs, 15_000)
  const spanProcessors: SpanProcessor[] = []

  const sdkConfiguration: Partial<NodeSDKConfiguration> = {
    resource: resourceFromAttributes({
      [SEMRESATTRS_SERVICE_NAME]: options.serviceName?.trim() || 'desk-imperial-api',
      [SEMRESATTRS_SERVICE_VERSION]: options.serviceVersion?.trim() || '0.1.0',
      [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: options.environment?.trim() || process.env.NODE_ENV || 'development',
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-dns': {
          enabled: false,
        },
        '@opentelemetry/instrumentation-fs': {
          enabled: false,
        },
      }),
    ],
  }

  if (sentryClient) {
    sdkConfiguration.contextManager = new Sentry.SentryContextManager()
    sdkConfiguration.textMapPropagator = new SentryPropagator()
    sdkConfiguration.sampler = new SentrySampler(sentryClient)
    spanProcessors.push(new SentrySpanProcessor())
  } else if (traceEndpoint) {
    sdkConfiguration.sampler = new ParentBasedSampler({
      root: new TraceIdRatioBasedSampler(tracesSampleRate),
    })
  }

  if (traceEndpoint) {
    const traceExporter = new OTLPTraceExporter(buildOtlpExporterConfig(traceEndpoint, parsedHeaders))
    spanProcessors.push(new BatchSpanProcessor(traceExporter))
  }

  if (spanProcessors.length > 0) {
    sdkConfiguration.spanProcessors = spanProcessors
  }

  if (metricsEndpoint) {
    const metricReader = new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter(buildOtlpExporterConfig(metricsEndpoint, parsedHeaders)),
      exportIntervalMillis: metricsExportIntervalMs,
      exportTimeoutMillis: 3_000,
    })

    sdkConfiguration.metricReaders = [metricReader]
  }

  if (logsEndpoint) {
    const logRecordProcessor = new BatchLogRecordProcessor(
      new OTLPLogExporter(buildOtlpExporterConfig(logsEndpoint, parsedHeaders)),
    )

    sdkConfiguration.logRecordProcessors = [logRecordProcessor]
  }

  apiOtelSdk = new NodeSDK(sdkConfiguration)

  apiOtelSdk.start()
  apiOtelStarted = true
  apiOtelStatus = {
    enabled: true,
    otlpTracesEnabled: Boolean(traceEndpoint),
    otlpMetricsEnabled: Boolean(metricsEndpoint),
    otlpLogsEnabled: Boolean(logsEndpoint),
    sentryBridgeEnabled,
  }

  if (sentryBridgeEnabled) {
    Sentry.validateOpenTelemetrySetup()
  }

  return apiOtelStatus
}

export async function shutdownApiOpenTelemetry() {
  if (!apiOtelSdk || !apiOtelStarted) {
    return
  }

  try {
    await apiOtelSdk.shutdown()
  } finally {
    apiOtelSdk = null
    apiOtelStarted = false
    apiOtelStatus = {
      enabled: false,
      otlpTracesEnabled: false,
      otlpMetricsEnabled: false,
      otlpLogsEnabled: false,
      sentryBridgeEnabled: false,
    }
  }
}

function getActiveSentryClient() {
  const client = Sentry.getClient()
  if (!client) {
    return null
  }

  const options = client.getOptions()
  const dsn =
    typeof options.dsn === 'string'
      ? options.dsn.trim()
      : options.dsn && typeof options.dsn === 'object'
        ? String(options.dsn).trim()
        : ''

  if (!dsn || options.enabled === false) {
    return null
  }

  return client
}

function normalizeSignalEndpoint(endpoint: string | undefined, signal: 'traces' | 'metrics' | 'logs') {
  const raw = endpoint?.trim()
  if (!raw) {
    return ''
  }

  const trimmed = trimTrailingSlashes(raw)
  const suffix = `/v1/${signal}`

  if (trimmed.endsWith(suffix)) {
    return trimmed
  }

  return `${trimmed}${suffix}`
}

function trimTrailingSlashes(value: string) {
  let end = value.length
  while (end > 0 && value[end - 1] === '/') {
    end -= 1
  }

  return end === value.length ? value : value.slice(0, end)
}

function parseOtlpHeaders(headers: string | undefined) {
  if (!headers) {
    return undefined
  }

  const entries = headers
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const separatorIndex = entry.indexOf('=')
      if (separatorIndex <= 0 || separatorIndex >= entry.length - 1) {
        return null
      }

      const key = entry.slice(0, separatorIndex).trim()
      const value = entry.slice(separatorIndex + 1).trim()
      if (!key || !value) {
        return null
      }

      return [key, value] as const
    })
    .filter((entry): entry is readonly [string, string] => Boolean(entry))

  if (entries.length === 0) {
    return undefined
  }

  return Object.fromEntries(entries)
}

function buildOtlpExporterConfig(url: string, headers: Record<string, string> | undefined) {
  return {
    url,
    timeoutMillis: 3_000,
    ...(headers ? { headers } : {}),
  }
}

function parseSampleRate(value: string | number | undefined, fallback: number) {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    return fallback
  }

  return parsed
}

function parsePositiveInteger(value: string | number | undefined, fallback: number) {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }

  return Math.floor(parsed)
}
