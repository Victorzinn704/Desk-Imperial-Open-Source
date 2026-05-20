import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { startEventLoopMonitor, stopEventLoopMonitor } from './common/observability/event-loop-monitor.util'
import { initializeApiOpenTelemetry, shutdownApiOpenTelemetry } from './common/utils/otel.util'
import { getAllowedOrigins } from './common/utils/origin.util'

export type BootstrapRuntimeConfig = {
  port: number
  cookieSecret: string | undefined
  csrfSecret: string | undefined
  telegramBotEnabled: boolean
  telegramWebhookSecret: string | undefined
  isTestEnvironment: boolean
  isProduction: boolean
  allowedOrigins: string[]
  apiDocsEnabled: boolean
  trustProxy: string | undefined
}

let processFailureHandlersRegistered = false
let processShutdownHandlersRegistered = false

export function registerProcessFailureHandlers(logger: Logger) {
  if (processFailureHandlersRegistered) {
    return
  }

  process.on('unhandledRejection', (reason) => {
    logger.error('[process] unhandledRejection capturada.', reason instanceof Error ? reason.stack : String(reason))
  })

  process.on('uncaughtExceptionMonitor', (error, origin) => {
    logger.error(`[process] uncaughtExceptionMonitor (${origin}) capturada.`, error.stack)
  })

  processFailureHandlersRegistered = true
}

export function registerProcessShutdownHandlers(logger: Logger) {
  if (processShutdownHandlersRegistered) {
    return
  }

  process.once('SIGTERM', () => {
    void gracefullyShutdownObservability(logger, 'SIGTERM')
  })

  process.once('SIGINT', () => {
    void gracefullyShutdownObservability(logger, 'SIGINT')
  })

  processShutdownHandlersRegistered = true
}

export function resolveBootstrapRuntimeConfig(configService: ConfigService): BootstrapRuntimeConfig {
  const nodeEnv = configService.get<string>('NODE_ENV')
  const isProduction = nodeEnv === 'production'
  const telegramBotToken = configService.get<string>('TELEGRAM_BOT_TOKEN')?.trim()
  const telegramBotEnabledFlag = configService.get<string>('TELEGRAM_BOT_ENABLED')

  return {
    port: configService.get<number>('PORT') ?? 4000,
    cookieSecret: configService.get<string>('COOKIE_SECRET'),
    csrfSecret: configService.get<string>('CSRF_SECRET'),
    telegramBotEnabled: Boolean(telegramBotToken) && telegramBotEnabledFlag !== 'false',
    telegramWebhookSecret: configService.get<string>('TELEGRAM_WEBHOOK_SECRET'),
    isTestEnvironment: nodeEnv === 'test',
    isProduction,
    allowedOrigins: getAllowedOrigins(configService),
    apiDocsEnabled: !isProduction || configService.get<string>('ENABLE_API_DOCS') === 'true',
    trustProxy: configService.get<string>('TRUST_PROXY'),
  }
}

export async function initializeBootstrapTelemetry(configService: ConfigService, runtime: BootstrapRuntimeConfig) {
  return initializeApiOpenTelemetry({
    endpoint: configService.get<string>('OTEL_EXPORTER_OTLP_ENDPOINT'),
    tracesEndpoint: configService.get<string>('OTEL_EXPORTER_OTLP_TRACES_ENDPOINT'),
    metricsEndpoint: configService.get<string>('OTEL_EXPORTER_OTLP_METRICS_ENDPOINT'),
    logsEndpoint: configService.get<string>('OTEL_EXPORTER_OTLP_LOGS_ENDPOINT'),
    headers: configService.get<string>('OTEL_EXPORTER_OTLP_HEADERS'),
    serviceName: configService.get<string>('OTEL_SERVICE_NAME') ?? 'desk-imperial-api',
    serviceVersion: process.env.npm_package_version,
    environment: configService.get<string>('OTEL_SERVICE_ENVIRONMENT') ?? configService.get<string>('NODE_ENV'),
    tracesSampleRate: configService.get<string>('OTEL_TRACES_SAMPLE_RATE') ?? (runtime.isProduction ? '0.03' : '1'),
    metricsExportIntervalMs: configService.get<string>('OTEL_METRICS_EXPORT_INTERVAL_MS') ?? '15000',
    diagnosticsEnabled: configService.get<string>('OTEL_DIAGNOSTICS') === 'true',
  })
}

export function logOpenTelemetryStatus(
  logger: Logger,
  otelStatus: Awaited<ReturnType<typeof initializeApiOpenTelemetry>>,
) {
  if (!otelStatus.enabled) {
    return
  }

  const channels = resolveOpenTelemetryChannels(otelStatus)
  logger.log(`OpenTelemetry da API habilitado para ${channels.join(' + ')}.`)
}

export function startRuntimeObservability(configService: ConfigService, runtime: BootstrapRuntimeConfig) {
  if (runtime.isTestEnvironment) {
    return
  }

  const sampleIntervalMs = Number(configService.get<string>('OTEL_METRICS_EXPORT_INTERVAL_MS') ?? '15000')
  startEventLoopMonitor({ sampleIntervalMs: Number.isFinite(sampleIntervalMs) ? sampleIntervalMs : 15_000 })
}

async function gracefullyShutdownObservability(logger: Logger, signal: 'SIGTERM' | 'SIGINT') {
  try {
    stopEventLoopMonitor()
    await shutdownApiOpenTelemetry()
    logger.log(`[process] OpenTelemetry finalizado em ${signal}.`)
  } catch (error) {
    logger.error(
      `[process] Falha ao finalizar OpenTelemetry em ${signal}.`,
      error instanceof Error ? error.stack : String(error),
    )
  }
}

function resolveOpenTelemetryChannels(otelStatus: Awaited<ReturnType<typeof initializeApiOpenTelemetry>>) {
  const channels: string[] = []

  if (otelStatus.sentryBridgeEnabled) {
    channels.push('bridge do Sentry')
  }

  const otlpSignals = [
    otelStatus.otlpTracesEnabled ? 'traces' : null,
    otelStatus.otlpMetricsEnabled ? 'metricas' : null,
    otelStatus.otlpLogsEnabled ? 'logs' : null,
  ].filter((value): value is string => Boolean(value))

  if (otlpSignals.length > 0) {
    channels.push(`OTLP (${otlpSignals.join(', ')})`)
  }

  return channels
}
