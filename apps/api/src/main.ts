import './instrument'
import 'reflect-metadata'
import { context, trace } from '@opentelemetry/api'
import { type INestApplication, Logger, ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { SwaggerModule } from '@nestjs/swagger'
import * as Sentry from '@sentry/nestjs'
import cookieParser from 'cookie-parser'
import type { Express, NextFunction, Request, Response } from 'express'
import helmet from 'helmet'
import { AppModule } from './app.module'
import { AppService } from './app.service'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { generateApiOpenApiDocument } from './common/openapi/document'
import { isAllowedOrigin } from './common/utils/origin.util'
import {
  type BootstrapRuntimeConfig,
  initializeBootstrapTelemetry,
  logOpenTelemetryStatus,
  registerProcessFailureHandlers,
  registerProcessShutdownHandlers,
  resolveBootstrapRuntimeConfig,
  startRuntimeObservability,
} from './main.bootstrap'

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

function buildStyleSrcDirective(isProduction: boolean) {
  return isProduction ? ["'self'"] : ["'self'", "'unsafe-inline'"]
}

function configureHelmet(app: INestApplication, isProduction: boolean) {
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          scriptSrc: ["'self'"],
          styleSrc: buildStyleSrcDirective(isProduction),
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
    return
  }

  if (trustProxy && trustProxy !== 'false') {
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
    allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'X-Request-Id', 'Sentry-Trace', 'Baggage'],
    exposedHeaders: ['X-Request-Id'],
  })
}

function assertBootstrapSecrets(
  isTestEnvironment: boolean,
  cookieSecret: string | undefined,
  csrfSecret: string | undefined,
  telegramBotEnabled: boolean,
  telegramWebhookSecret: string | undefined,
) {
  if (isTestEnvironment) {
    return
  }

  if (!(isConfiguredSecret(cookieSecret, 16) && isConfiguredSecret(csrfSecret, 32))) {
    throw new Error(
      'Defina COOKIE_SECRET (>=16 chars) e CSRF_SECRET (>=32 chars) com valores fortes e sem placeholder change-me antes de iniciar a API.',
    )
  }

  if (telegramBotEnabled && !isConfiguredSecret(telegramWebhookSecret, 24)) {
    throw new Error(
      'Defina TELEGRAM_WEBHOOK_SECRET (>=24 chars) com valor forte antes de iniciar a API com Telegram habilitado.',
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
    logger.warn(`API docs desabilitadas neste boot: ${error instanceof Error ? error.message : String(error)}`)
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

function configureApplicationRuntime(app: INestApplication, runtime: BootstrapRuntimeConfig) {
  configureHelmet(app, runtime.isProduction)
  app.use(cookieParser(runtime.cookieSecret))
  configureRequestIdMiddleware(app)
  configureTrustProxy(app, runtime.trustProxy, runtime.isProduction)
  configureCors(app, runtime.allowedOrigins)
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
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  })

  const configService = app.get(ConfigService)
  const logger = new Logger('Bootstrap')
  const runtime = resolveBootstrapRuntimeConfig(configService)
  const otelStatus = await initializeBootstrapTelemetry(configService, runtime)

  logOpenTelemetryStatus(logger, otelStatus)
  registerProcessFailureHandlers(logger)
  registerProcessShutdownHandlers(logger)
  startRuntimeObservability(configService, runtime)
  configureApplicationRuntime(app, runtime)

  assertBootstrapSecrets(
    runtime.isTestEnvironment,
    runtime.cookieSecret,
    runtime.csrfSecret,
    runtime.telegramBotEnabled,
    runtime.telegramWebhookSecret,
  )
  assertBootstrapEnvironment(configService, runtime.isProduction, logger)
  configureApiDocs(app, runtime.apiDocsEnabled, logger)

  await app.listen(runtime.port)
  logger.log(`API pronta em http://localhost:${runtime.port}/api/v1`)
}

void bootstrap().catch((error: unknown) => {
  const logger = new Logger('Bootstrap')
  logger.error('Falha ao iniciar a API.', error instanceof Error ? error.stack : String(error))
  Sentry.captureException(error)
  void Sentry.flush(2_000).finally(() => {
    process.exit(1)
  })
})
