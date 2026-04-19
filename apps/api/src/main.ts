import 'reflect-metadata'
import { context, trace } from '@opentelemetry/api'
import { type INestApplication, Logger, ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { SwaggerModule } from '@nestjs/swagger'
import cookieParser from 'cookie-parser'
import type { Express, NextFunction, Request, Response } from 'express'
import helmet from 'helmet'
import { AppModule } from './app.module'
import { AppService } from './app.service'
import { generateApiOpenApiDocument } from './common/openapi/document'
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

function configureHelmet(app: INestApplication, isProduction: boolean) {
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      frameguard: { action: 'deny' },
      referrerPolicy: { policy: 'no-referrer' },
      hsts: isProduction ? { maxAge: 15552000, includeSubDomains: true, preload: true } : false,
    }),
  )
}

function configureRequestIdMiddleware(app: INestApplication) {
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
}

function configureTrustProxy(app: INestApplication, trustProxy: string | undefined, isProduction: boolean) {
  const httpAdapter = app.getHttpAdapter().getInstance()
  httpAdapter.disable('x-powered-by')

  if (trustProxy === 'true' || (isProduction && trustProxy !== 'false')) {
    httpAdapter.set('trust proxy', 1)
  } else if (trustProxy && trustProxy !== 'false') {
    const parsed = Number(trustProxy)
    httpAdapter.set('trust proxy', Number.isFinite(parsed) ? parsed : trustProxy)
  }
}

function configureCors(app: INestApplication, allowedOrigins: string[]) {
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
}

function assertBootstrapSecrets(
  isTestEnvironment: boolean,
  cookieSecret: string | undefined,
  csrfSecret: string | undefined,
) {
  if (isTestEnvironment) {
    return
  }
  if (!isConfiguredSecret(cookieSecret, 16) || !isConfiguredSecret(csrfSecret, 32)) {
    throw new Error(
      'Defina COOKIE_SECRET (>=16 chars) e CSRF_SECRET (>=32 chars) com valores fortes e sem placeholder change-me antes de iniciar a API.',
    )
  }
}

function assertBootstrapEnvironment(configService: ConfigService, isProduction: boolean, logger: Logger) {
  const portfolioFallback = configService.get<string>('PORTFOLIO_EMAIL_FALLBACK')
  if (isProduction && portfolioFallback === 'true') {
    throw new Error(
      'PORTFOLIO_EMAIL_FALLBACK=true em produção altera fluxos de recuperação/verificação de email. Desative esta variável antes de iniciar a API.',
    )
  }

  if (!isProduction && portfolioFallback === 'true') {
    logger.warn('PORTFOLIO_EMAIL_FALLBACK=true está ativo apenas para requisições locais em localhost/127.0.0.1.')
  }
}

function configureApiDocs(app: INestApplication, apiDocsEnabled: boolean, logger: Logger) {
  if (!apiDocsEnabled) {
    return
  }

  try {
    const document = generateApiOpenApiDocument()
    const expressApp = app.getHttpAdapter().getInstance() as Express

    expressApp.get('/api/v1/openapi.json', (_request: Request, response: Response) => {
      response.type('application/json').send(document)
    })

    SwaggerModule.setup('api/v1/docs', app, document as unknown as Parameters<typeof SwaggerModule.setup>[2], {
      customSiteTitle: 'Desk Imperial API Docs',
    })
  } catch (error) {
    logger.warn(
      `API docs desabilitadas neste boot: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

function configureLegacyHealthAlias(app: INestApplication) {
  const expressApp = app.getHttpAdapter().getInstance() as Express
  const appService = app.get(AppService)

  expressApp.get('/api/health', async (_request: Request, response: Response, next: NextFunction) => {
    try {
      const health = await appService.getHealth()
      response.status(health.status === 'error' ? 503 : 200).json(health)
    } catch (error) {
      next(error)
    }
  })
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
  const isProduction = nodeEnv === 'production'
  const allowedOrigins = getAllowedOrigins(configService)
  const apiDocsEnabled = !isProduction || configService.get<string>('ENABLE_API_DOCS') === 'true'
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

  configureHelmet(app, isProduction)
  app.use(cookieParser(cookieSecret))
  configureRequestIdMiddleware(app)
  configureTrustProxy(app, trustProxy, isProduction)
  configureCors(app, allowedOrigins)
  configureLegacyHealthAlias(app)

  app.setGlobalPrefix('api/v1')
  app.useGlobalFilters(new HttpExceptionFilter())
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  assertBootstrapSecrets(isTestEnvironment, cookieSecret, csrfSecret)
  assertBootstrapEnvironment(configService, isProduction, logger)
  configureApiDocs(app, apiDocsEnabled, logger)

  await app.listen(port)
  logger.log(`API pronta em http://localhost:${port}/api/v1`)
}

void bootstrap().catch((error: unknown) => {
  const logger = new Logger('Bootstrap')
  logger.error('Falha ao iniciar a API.', error instanceof Error ? error.stack : String(error))
  process.exit(1)
})
