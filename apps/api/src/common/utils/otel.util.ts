import { NodeSDK } from '@opentelemetry/sdk-node'
import * as Sentry from '@sentry/nestjs'
import {
  buildApiOpenTelemetrySdkConfiguration,
  configureOpenTelemetryDiagnostics,
  hasApiOpenTelemetrySignal,
  type InitializeApiOpenTelemetryOptions,
  resolveApiOpenTelemetrySettings,
  resolveApiOpenTelemetrySignals,
} from './otel-sdk-config.util'

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

  const signals = resolveApiOpenTelemetrySignals(options)
  if (!hasApiOpenTelemetrySignal(signals)) {
    return apiOtelStatus
  }

  configureOpenTelemetryDiagnostics(options.diagnosticsEnabled)

  apiOtelSdk = new NodeSDK(
    buildApiOpenTelemetrySdkConfiguration(options, signals, resolveApiOpenTelemetrySettings(options)),
  )

  apiOtelSdk.start()
  apiOtelStarted = true
  apiOtelStatus = {
    enabled: true,
    otlpTracesEnabled: Boolean(signals.traceEndpoint),
    otlpMetricsEnabled: Boolean(signals.metricsEndpoint),
    otlpLogsEnabled: Boolean(signals.logsEndpoint),
    sentryBridgeEnabled: signals.sentryBridgeEnabled,
  }

  if (signals.sentryBridgeEnabled) {
    Sentry.validateOpenTelemetrySetup()
  }

  return apiOtelStatus
}

export async function shutdownApiOpenTelemetry() {
  if (!(apiOtelSdk && apiOtelStarted)) {
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
