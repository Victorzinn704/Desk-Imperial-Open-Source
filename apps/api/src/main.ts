import { Logger, ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import { AppModule } from './app.module'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { getAllowedOrigins, isAllowedOrigin } from './common/utils/origin.util'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  })

  const configService = app.get(ConfigService)
  const logger = new Logger('Bootstrap')
  const port = configService.get<number>('PORT') ?? 4000
  const cookieSecret = configService.get<string>('COOKIE_SECRET') ?? 'change-me'
  const csrfSecret = configService.get<string>('CSRF_SECRET') ?? 'change-me'
  const isProduction = configService.get<string>('NODE_ENV') === 'production'
  const allowedOrigins = getAllowedOrigins(configService)
  const swaggerEnabled =
    configService.get<string>('ENABLE_SWAGGER') === 'true'
  const trustProxy = configService.get<string>('TRUST_PROXY')

  app.use(helmet())
  app.use(cookieParser(cookieSecret))
  const httpAdapter = app.getHttpAdapter().getInstance()
  httpAdapter.disable('x-powered-by')
  if (trustProxy === 'true' || (isProduction && trustProxy !== 'false')) {
    httpAdapter.set('trust proxy', 1)
  } else if (trustProxy && trustProxy !== 'false') {
    const parsed = Number(trustProxy)
    httpAdapter.set('trust proxy', Number.isFinite(parsed) ? parsed : trustProxy)
  }
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || isAllowedOrigin(origin, allowedOrigins)) {
        callback(null, true)
        return
      }

      callback(new Error('Origin not allowed by CORS'), false)
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'X-Admin-Pin-Token'],
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

  if (isProduction && (cookieSecret === 'change-me' || csrfSecret === 'change-me')) {
    throw new Error('Defina COOKIE_SECRET e CSRF_SECRET antes de iniciar em producao.')
  }

  const portfolioFallback = configService.get<string>('PORTFOLIO_EMAIL_FALLBACK')
  if (isProduction && portfolioFallback === 'true') {
    logger.warn(
      '[SECURITY] PORTFOLIO_EMAIL_FALLBACK=true em producao expoe codigos de verificacao via HTTP. Desative esta variavel em ambiente real.',
      'SecurityCheck',
    )
  }

  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('DESK IMPERIAL API')
      .setDescription(
        'API principal do portal empresarial com foco em seguranca, consentimento e observabilidade.',
      )
      .setVersion('1.0.0')
      .build()

    const document = SwaggerModule.createDocument(app, swaggerConfig)
    SwaggerModule.setup('docs', app, document)
  }

  await app.listen(port)
  logger.log(`API pronta em http://localhost:${port}/api`)
}

void bootstrap()
