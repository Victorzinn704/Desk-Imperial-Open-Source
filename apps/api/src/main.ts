import 'reflect-metadata'
import { context, trace } from '@opentelemetry/api'
import { Logger, ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import cookieParser from 'cookie-parser'
import type { NextFunction, Request, Response } from 'express'
import helmet from 'helmet'
import { AppModule } from './app.module'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { initializeApiOpenTelemetry, shutdownApiOpenTelemetry } from './common/utils/otel.util'
import { getAllowedOrigins, isAllowedOrigin } from './common/utils/origin.util'

let processFailureHandlersRegistered = false
let processShutdownHandlersRegistered = false

function normalizeRequestId(value: number | string | string[] | undefined | null) {
  if (value === undefined || value === null) {
    return null
  }

  const normalized = Array.isArray(value) ? value.join(',') : String(value)
  const trimmed = normalized.trim()
  if (!trimmed) {
    return null
  }

  return trimmed
}

function isConfiguredSecret(value: string | undefined, minLength: number) {
  if (!value) {
    return false
  }

  const normalized = value.trim()
  if (!normalized) {
    return false
  }

  if (normalized.toLowerCase() === 'change-me') {
    return false
  }

  return normalized.length >= minLength
}

function registerProcessFailureHandlers(logger: Logger) {
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

function registerProcessShutdownHandlers(logger: Logger) {
  if (processShutdownHandlersRegistered) {
    return
  }

  const gracefulShutdown = async (signal: 'SIGTERM' | 'SIGINT') => {
    try {
      await shutdownApiOpenTelemetry()
      logger.log(`[process] OpenTelemetry finalizado em ${signal}.`)
    } catch (error) {
      logger.error(
        `[process] Falha ao finalizar OpenTelemetry em ${signal}.`,
        error instanceof Error ? error.stack : String(error),
      )
    }
  }

  process.once('SIGTERM', () => {
    void gracefulShutdown('SIGTERM')
  })

  process.once('SIGINT', () => {
    void gracefulShutdown('SIGINT')
  })

  processShutdownHandlersRegistered = true
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  })

  const configService = app.get(ConfigService)
  const logger = new Logger('Bootstrap')
  const port = configService.get<number>('PORT') ?? 4000
  const cookieSecret = configService.get<string>('COOKIE_SECRET')
  const csrfSecret = configService.get<string>('CSRF_SECRET')
  const nodeEnv = configService.get<string>('NODE_ENV')
  const isTestEnvironment = nodeEnv === 'test'
  const isProduction = configService.get<string>('NODE_ENV') === 'production'
  const allowedOrigins = getAllowedOrigins(configService)
  const swaggerEnabled = !isProduction || configService.get<string>('ENABLE_SWAGGER') === 'true'
  const swaggerAllowedInProduction = configService.get<string>('SWAGGER_ALLOW_IN_PRODUCTION') === 'true'
  const trustProxy = configService.get<string>('TRUST_PROXY')
  const otelEnabled = await initializeApiOpenTelemetry({
    endpoint: configService.get<string>('OTEL_EXPORTER_OTLP_ENDPOINT'),
    tracesEndpoint: configService.get<string>('OTEL_EXPORTER_OTLP_TRACES_ENDPOINT'),
    metricsEndpoint: configService.get<string>('OTEL_EXPORTER_OTLP_METRICS_ENDPOINT'),
    logsEndpoint: configService.get<string>('OTEL_EXPORTER_OTLP_LOGS_ENDPOINT'),
    headers: configService.get<string>('OTEL_EXPORTER_OTLP_HEADERS'),
    serviceName: configService.get<string>('OTEL_SERVICE_NAME') ?? 'desk-imperial-api',
    serviceVersion: process.env.npm_package_version,
    environment: configService.get<string>('OTEL_SERVICE_ENVIRONMENT') ?? configService.get<string>('NODE_ENV'),
    tracesSampleRate: configService.get<string>('OTEL_TRACES_SAMPLE_RATE') ?? (isProduction ? '0.03' : '1'),
    metricsExportIntervalMs: configService.get<string>('OTEL_METRICS_EXPORT_INTERVAL_MS') ?? '15000',
    diagnosticsEnabled: configService.get<string>('OTEL_DIAGNOSTICS') === 'true',
  })

  if (otelEnabled) {
    logger.log(
      'OpenTelemetry da API habilitado para telemetria OTLP (traces, metricas e logs conforme endpoints configurados).',
    )
  }

  registerProcessFailureHandlers(logger)
  registerProcessShutdownHandlers(logger)

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      frameguard: { action: 'deny' },
      referrerPolicy: { policy: 'no-referrer' },
      hsts: isProduction
        ? {
            maxAge: 15552000,
            includeSubDomains: true,
            preload: true,
          }
        : false,
    }),
  )
  app.use(cookieParser(cookieSecret))
  app.use((request: Request, response: Response, next: NextFunction) => {
    const requestId =
      normalizeRequestId(response.getHeader('x-request-id')) ?? normalizeRequestId(request.headers['x-request-id'])

    if (requestId) {
      response.setHeader('x-request-id', requestId)

      const activeSpan = trace.getSpan(context.active())
      if (activeSpan) {
        activeSpan.setAttribute('request.id', requestId)
        activeSpan.setAttribute('http.request_id', requestId)
      }
    }

    next()
  })

  const httpAdapter = app.getHttpAdapter().getInstance()
  httpAdapter.disable('x-powered-by')
  if (trustProxy === 'true' || (isProduction && trustProxy !== 'false')) {
    httpAdapter.set('trust proxy', 1)
  } else if (trustProxy && trustProxy !== 'false') {
    const parsed = Number(trustProxy)
    httpAdapter.set('trust proxy', Number.isFinite(parsed) ? parsed : trustProxy)
  }
  app.enableCors({
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
      if (!origin || isAllowedOrigin(origin, allowedOrigins)) {
        callback(null, true)
        return
      }

      callback(new Error('Origin not allowed by CORS'), false)
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
  })
  app.setGlobalPrefix('api')
  app.useGlobalFilters(new HttpExceptionFilter())
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  if (!isTestEnvironment) {
    if (!isConfiguredSecret(cookieSecret, 16) || !isConfiguredSecret(csrfSecret, 32)) {
      throw new Error(
        'Defina COOKIE_SECRET (>=16 chars) e CSRF_SECRET (>=32 chars) com valores fortes e sem placeholder change-me antes de iniciar a API.',
      )
    }
  }

  const portfolioFallback = configService.get<string>('PORTFOLIO_EMAIL_FALLBACK')
  if (isProduction && portfolioFallback === 'true') {
    throw new Error(
      'PORTFOLIO_EMAIL_FALLBACK=true em produção altera fluxos de recuperação/verificação de email. Desative esta variável antes de iniciar a API.',
    )
  }

  if (!isProduction && portfolioFallback === 'true') {
    logger.warn('PORTFOLIO_EMAIL_FALLBACK=true está ativo apenas para requisições locais em localhost/127.0.0.1.')
  }

  if (isProduction && swaggerEnabled && !swaggerAllowedInProduction) {
    throw new Error(
      'ENABLE_SWAGGER=true em produção exige SWAGGER_ALLOW_IN_PRODUCTION=true. Desative o Swagger ou libere explicitamente esse uso.',
    )
  }

  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('DESK IMPERIAL API')
      .setDescription('API principal do portal empresarial com foco em seguranca, consentimento e observabilidade.')
      .setVersion('1.0.0')
      .build()

    const document = SwaggerModule.createDocument(app, swaggerConfig)
    SwaggerModule.setup('docs', app, document)
  }

  await app.listen(port)
  logger.log(`API pronta em http://localhost:${port}/api`)
}

void bootstrap()
