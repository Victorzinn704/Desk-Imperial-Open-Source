import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs'
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import type { NodeSDKConfiguration } from '@opentelemetry/sdk-node'
import {
  BatchSpanProcessor,
  ParentBasedSampler,
  type SpanProcessor,
  TraceIdRatioBasedSampler,
} from '@opentelemetry/sdk-trace-base'
import {
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions'
import * as Sentry from '@sentry/nestjs'
import { SentryPropagator, SentrySampler, SentrySpanProcessor } from '@sentry/opentelemetry'

export type InitializeApiOpenTelemetryOptions = {
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

export type ApiOpenTelemetrySignals = {
  traceEndpoint: string
  metricsEndpoint: string
  logsEndpoint: string
  sentryClient: ReturnType<typeof getActiveSentryClient>
  sentryBridgeEnabled: boolean
}

type ApiOpenTelemetrySettings = {
  headers: Record<string, string> | undefined
  tracesSampleRate: number
  metricsExportIntervalMs: number
}

type OtlpHeaderEntry = readonly [string, string]

export function resolveApiOpenTelemetrySignals(options: InitializeApiOpenTelemetryOptions): ApiOpenTelemetrySignals {
  const sentryClient = getActiveSentryClient()

  return {
    traceEndpoint: normalizeSignalEndpoint(options.tracesEndpoint ?? options.endpoint, 'traces'),
    metricsEndpoint: normalizeSignalEndpoint(options.metricsEndpoint ?? options.endpoint, 'metrics'),
    logsEndpoint: normalizeSignalEndpoint(options.logsEndpoint ?? options.endpoint, 'logs'),
    sentryClient,
    sentryBridgeEnabled: Boolean(sentryClient),
  }
}

export function hasApiOpenTelemetrySignal(signals: ApiOpenTelemetrySignals) {
  return Boolean(
    signals.traceEndpoint || signals.metricsEndpoint || signals.logsEndpoint || signals.sentryBridgeEnabled,
  )
}

export function configureOpenTelemetryDiagnostics(enabled: boolean | undefined) {
  if (enabled) {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO)
  }
}

export function resolveApiOpenTelemetrySettings(options: InitializeApiOpenTelemetryOptions): ApiOpenTelemetrySettings {
  return {
    headers: parseOtlpHeaders(options.headers),
    tracesSampleRate: parseSampleRate(options.tracesSampleRate, 0.03),
    metricsExportIntervalMs: parsePositiveInteger(options.metricsExportIntervalMs, 15_000),
  }
}

export function buildApiOpenTelemetrySdkConfiguration(
  options: InitializeApiOpenTelemetryOptions,
  signals: ApiOpenTelemetrySignals,
  settings: ApiOpenTelemetrySettings,
): Partial<NodeSDKConfiguration> {
  const sdkConfiguration = buildBaseOpenTelemetrySdkConfiguration(options)

  configureTracePipeline(sdkConfiguration, signals, settings)
  configureMetricPipeline(sdkConfiguration, signals.metricsEndpoint, settings)
  configureLogPipeline(sdkConfiguration, signals.logsEndpoint, settings.headers)

  return sdkConfiguration
}

function getActiveSentryClient() {
  const client = Sentry.getClient()
  if (!client) {
    return null
  }

  const options = client.getOptions()
  const dsn = resolveSentryDsn(options.dsn)

  if (!dsn || options.enabled === false) {
    return null
  }

  return client
}

function resolveSentryDsn(dsn: unknown) {
  if (typeof dsn === 'string') {
    return dsn.trim()
  }

  if (dsn && typeof dsn === 'object') {
    return String(dsn).trim()
  }

  return ''
}

function buildBaseOpenTelemetrySdkConfiguration(
  options: InitializeApiOpenTelemetryOptions,
): Partial<NodeSDKConfiguration> {
  return {
    resource: resourceFromAttributes({
      [SEMRESATTRS_SERVICE_NAME]: options.serviceName?.trim() || 'desk-imperial-api',
      [SEMRESATTRS_SERVICE_VERSION]: options.serviceVersion?.trim() || '0.1.0',
      [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: options.environment?.trim() || process.env.NODE_ENV || 'development',
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-dns': { enabled: false },
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  }
}

function configureTracePipeline(
  sdkConfiguration: Partial<NodeSDKConfiguration>,
  signals: ApiOpenTelemetrySignals,
  settings: ApiOpenTelemetrySettings,
) {
  const spanProcessors: SpanProcessor[] = []

  configureSentryBridge(sdkConfiguration, signals.sentryClient, spanProcessors)
  configureOtlpTraceExporter(sdkConfiguration, signals.traceEndpoint, settings, spanProcessors)

  if (spanProcessors.length > 0) {
    sdkConfiguration.spanProcessors = spanProcessors
  }
}

function configureSentryBridge(
  sdkConfiguration: Partial<NodeSDKConfiguration>,
  sentryClient: ApiOpenTelemetrySignals['sentryClient'],
  spanProcessors: SpanProcessor[],
) {
  if (!sentryClient) {
    return
  }

  sdkConfiguration.contextManager = new Sentry.SentryContextManager()
  sdkConfiguration.textMapPropagator = new SentryPropagator()
  sdkConfiguration.sampler = new SentrySampler(sentryClient)
  spanProcessors.push(new SentrySpanProcessor())
}

function configureOtlpTraceExporter(
  sdkConfiguration: Partial<NodeSDKConfiguration>,
  traceEndpoint: string,
  settings: ApiOpenTelemetrySettings,
  spanProcessors: SpanProcessor[],
) {
  if (!traceEndpoint) {
    return
  }

  if (!sdkConfiguration.sampler) {
    sdkConfiguration.sampler = new ParentBasedSampler({
      root: new TraceIdRatioBasedSampler(settings.tracesSampleRate),
    })
  }

  spanProcessors.push(
    new BatchSpanProcessor(new OTLPTraceExporter(buildOtlpExporterConfig(traceEndpoint, settings.headers))),
  )
}

function configureMetricPipeline(
  sdkConfiguration: Partial<NodeSDKConfiguration>,
  metricsEndpoint: string,
  settings: ApiOpenTelemetrySettings,
) {
  if (!metricsEndpoint) {
    return
  }

  sdkConfiguration.metricReaders = [
    new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter(buildOtlpExporterConfig(metricsEndpoint, settings.headers)),
      exportIntervalMillis: settings.metricsExportIntervalMs,
      exportTimeoutMillis: 3_000,
    }),
  ]
}

function configureLogPipeline(
  sdkConfiguration: Partial<NodeSDKConfiguration>,
  logsEndpoint: string,
  headers: Record<string, string> | undefined,
) {
  if (!logsEndpoint) {
    return
  }

  sdkConfiguration.logRecordProcessors = [
    new BatchLogRecordProcessor(new OTLPLogExporter(buildOtlpExporterConfig(logsEndpoint, headers))),
  ]
}

function normalizeSignalEndpoint(endpoint: string | undefined, signal: 'traces' | 'metrics' | 'logs') {
  const raw = endpoint?.trim()
  if (!raw) {
    return ''
  }

  const trimmed = trimTrailingSlashes(raw)
  const suffix = `/v1/${signal}`
  return trimmed.endsWith(suffix) ? trimmed : `${trimmed}${suffix}`
}

function trimTrailingSlashes(value: string) {
  let end = value.length
  while (end > 0 && value[end - 1] === '/') {
    end -= 1
  }

  return end === value.length ? value : value.slice(0, end)
}

function parseOtlpHeaders(headers: string | undefined) {
  const entries = headers?.split(',').map(parseOtlpHeaderEntry).filter(isOtlpHeaderEntry) ?? []
  return entries.length > 0 ? Object.fromEntries(entries) : undefined
}

function parseOtlpHeaderEntry(entry: string): OtlpHeaderEntry | null {
  const separatorIndex = entry.indexOf('=')
  if (separatorIndex <= 0 || separatorIndex >= entry.length - 1) {
    return null
  }

  const key = entry.slice(0, separatorIndex).trim()
  const value = entry.slice(separatorIndex + 1).trim()
  return key && value ? [key, value] : null
}

function isOtlpHeaderEntry(entry: OtlpHeaderEntry | null): entry is OtlpHeaderEntry {
  return Boolean(entry)
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
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : fallback
}

function parsePositiveInteger(value: string | number | undefined, fallback: number) {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}
