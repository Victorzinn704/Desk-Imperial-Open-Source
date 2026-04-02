import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { LoggerModule } from 'nestjs-pino'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { PrismaModule } from './database/prisma.module'
import { CacheModule } from './cache/cache.module'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AdminPinModule } from './modules/admin-pin/admin-pin.module'
import { AuthModule } from './modules/auth/auth.module'
import { ConsentModule } from './modules/consent/consent.module'
import { CurrencyModule } from './modules/currency/currency.module'
import { EmployeesModule } from './modules/employees/employees.module'
import { FinanceModule } from './modules/finance/finance.module'
import { GeocodingModule } from './modules/geocoding/geocoding.module'
import { MarketIntelligenceModule } from './modules/market-intelligence/market-intelligence.module'
import { MonitoringModule } from './modules/monitoring/monitoring.module'
import { OperationsModule } from './modules/operations/operations.module'
import { OperationsRealtimeModule } from './modules/operations-realtime.module'
import { OrdersModule } from './modules/orders/orders.module'
import { ProductsModule } from './modules/products/products.module'
import { validateEnvironment } from './config/env.validation'

const DEFAULT_THROTTLER_TTL_MS = 60_000
const DEFAULT_THROTTLER_LIMIT = 120

function parsePositiveIntegerEnv(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback
  }

  const numericValue = Number(value)
  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    return fallback
  }

  return numericValue
}

const throttlerTtlMs = parsePositiveIntegerEnv(process.env.THROTTLER_TTL_MS, DEFAULT_THROTTLER_TTL_MS)
const throttlerLimit = parsePositiveIntegerEnv(process.env.THROTTLER_LIMIT, DEFAULT_THROTTLER_LIMIT)

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: process.env.NODE_ENV === 'production',
      envFilePath: Array.from(
        new Set([
          resolve(process.cwd(), 'apps/api/.env'),
          resolve(process.cwd(), '.env'),
          resolve(process.cwd(), '../../.env'),
        ]),
      ),
      validate: validateEnvironment,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: throttlerTtlMs,
        limit: throttlerLimit,
      },
    ]),
    LoggerModule.forRoot({
      pinoHttp: {
        autoLogging: true,
        genReqId: (req, res) => {
          const incoming = req.headers['x-request-id']
          const requestId = typeof incoming === 'string' && incoming.trim() ? incoming.trim() : randomUUID()
          res.setHeader('x-request-id', requestId)
          return requestId
        },
        customProps: (req) => ({
          requestId: req.id,
        }),
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.headers.x-csrf-token',
            'req.headers.x-admin-pin',
            'req.body.fullName',
            'req.body.companyName',
            'req.body.email',
            'req.body.companyEmail',
            'req.body.companyStreetLine1',
            'req.body.companyStreetNumber',
            'req.body.companyAddressComplement',
            'req.body.companyDistrict',
            'req.body.companyCity',
            'req.body.companyState',
            'req.body.companyPostalCode',
            'req.body.postalCode',
            'req.body.companyCountry',
            'req.body.hasEmployees',
            'req.body.employeeCount',
            'req.body.employeeCode',
            'req.body.password',
            'req.body.confirmPassword',
            'req.body.currentPassword',
            'req.body.newPassword',
            'req.body.pin',
            'req.body.currentPin',
            'req.body.newPin',
            'req.body.token',
            'req.body.code',
            'req.body.customerDocument',
            'req.body.document',
            'req.body.cpf',
            'req.body.cnpj',
            'res.body.token',
            'res.body.csrfToken',
            'req.headers.cookie',
          ],
          censor: '[REDACTED]',
        },
      },
    }),
    PrismaModule,
    CacheModule,
    CurrencyModule,
    EmployeesModule,
    GeocodingModule,
    MarketIntelligenceModule,
    MonitoringModule,
    ConsentModule,
    AuthModule,
    AdminPinModule,
    ProductsModule,
    OrdersModule,
    OperationsModule,
    OperationsRealtimeModule,
    FinanceModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
