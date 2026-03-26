import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { LoggerModule } from 'nestjs-pino'
import { resolve } from 'node:path'
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
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        autoLogging: true,
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.body.fullName',
            'req.body.companyName',
            'req.body.email',
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
            'req.body.password',
            'req.body.confirmPassword',
            'req.body.token',
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
  providers: [AppService],
})
export class AppModule {}
