import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { LoggerModule } from 'nestjs-pino'
import { PrismaModule } from './database/prisma.module'
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
import { OrdersModule } from './modules/orders/orders.module'
import { ProductsModule } from './modules/products/products.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: process.env.NODE_ENV === 'production',
      envFilePath: ['../../.env'],
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        autoLogging: true,
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.body.password',
            'req.body.confirmPassword',
            'req.body.token',
          ],
          censor: '[REDACTED]',
        },
      },
    }),
    PrismaModule,
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
    FinanceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
