import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs'
import { NodeSDK, type NodeSDKConfiguration } from '@opentelemetry/sdk-node'
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { ParentBasedSampler, TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base'
import {
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions'

type InitializeApiOpenTelemetryOptions = {
  endpoint?: string
  tracesEndpoint?: string
  metricsEndpoint?: string
  logsEndpoint?: string
  headers?: string
  serviceName?: string
  serviceVersion?: string
  environment?: string
  tracesSampleRate?: string | number
  metricsExportIntervalMs?: string | number
  diagnosticsEnabled?: boolean
}

let apiOtelSdk: NodeSDK | null = null
let apiOtelStarted = false

export async function initializeApiOpenTelemetry(options: InitializeApiOpenTelemetryOptions) {
  if (apiOtelStarted) {
    return true
  }

  const traceEndpoint = normalizeSignalEndpoint(options.tracesEndpoint ?? options.endpoint, 'traces')
  const metricsEndpoint = normalizeSignalEndpoint(options.metricsEndpoint ?? options.endpoint, 'metrics')
  const logsEndpoint = normalizeSignalEndpoint(options.logsEndpoint ?? options.endpoint, 'logs')

  if (!traceEndpoint && !metricsEndpoint && !logsEndpoint) {
    return false
  }

  if (options.diagnosticsEnabled) {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO)
  }

  const parsedHeaders = parseOtlpHeaders(options.headers)
  const tracesSampleRate = parseSampleRate(options.tracesSampleRate, 0.03)
  const metricsExportIntervalMs = parsePositiveInteger(options.metricsExportIntervalMs, 15_000)

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

  if (traceEndpoint) {
    sdkConfiguration.traceExporter = new OTLPTraceExporter({
      url: traceEndpoint,
      headers: parsedHeaders,
      timeoutMillis: 3_000,
    })
    sdkConfiguration.sampler = new ParentBasedSampler({
      root: new TraceIdRatioBasedSampler(tracesSampleRate),
    })
  }

  if (metricsEndpoint) {
    const metricReader = new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: metricsEndpoint,
        headers: parsedHeaders,
        timeoutMillis: 3_000,
      }),
      exportIntervalMillis: metricsExportIntervalMs,
      exportTimeoutMillis: 3_000,
    })

    sdkConfiguration.metricReaders = [metricReader]
  }

  if (logsEndpoint) {
    const logRecordProcessor = new BatchLogRecordProcessor(
      new OTLPLogExporter({
        url: logsEndpoint,
        headers: parsedHeaders,
        timeoutMillis: 3_000,
      }),
    )

    sdkConfiguration.logRecordProcessors = [logRecordProcessor]
  }

  apiOtelSdk = new NodeSDK(sdkConfiguration)

  apiOtelSdk.start()
  apiOtelStarted = true
  return true
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
  }
}

function normalizeSignalEndpoint(endpoint: string | undefined, signal: 'traces' | 'metrics' | 'logs') {
  const raw = endpoint?.trim()
  if (!raw) {
    return ''
  }

  const trimmed = raw.replace(/\/+$/, '')
  const suffix = `/v1/${signal}`

  if (trimmed.endsWith(suffix)) {
    return trimmed
  }

  return `${trimmed}${suffix}`
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
