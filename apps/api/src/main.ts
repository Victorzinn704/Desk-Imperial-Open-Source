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
  const swaggerEnabled = configService.get<string>('ENABLE_SWAGGER') === 'true'
  const swaggerAllowedInProduction = configService.get<string>('SWAGGER_ALLOW_IN_PRODUCTION') === 'true'
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
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
      if (!origin || isAllowedOrigin(origin, allowedOrigins)) {
        callback(null, true)
        return
      }

      callback(new Error('Origin not allowed by CORS'), false)
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
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
    throw new Error(
      'PORTFOLIO_EMAIL_FALLBACK=true em producao expoe codigos de verificacao via HTTP. Desative esta variavel antes de iniciar a API.',
    )
  }

  if (!isProduction && portfolioFallback === 'true') {
    logger.warn(
      'PORTFOLIO_EMAIL_FALLBACK=true esta ativo apenas para requisicoes locais em localhost/127.0.0.1. Origens publicas nao recebem preview de codigo.',
    )
  }

  if (isProduction && swaggerEnabled && !swaggerAllowedInProduction) {
    throw new Error(
      'ENABLE_SWAGGER=true em producao exige SWAGGER_ALLOW_IN_PRODUCTION=true. Desative o Swagger ou libere explicitamente esse uso.',
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
