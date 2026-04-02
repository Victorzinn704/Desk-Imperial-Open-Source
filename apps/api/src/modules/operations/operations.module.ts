import { Module } from '@nestjs/common'
import { CacheModule } from '../../cache/cache.module'
import { PrismaModule } from '../../database/prisma.module'
import { AuthModule } from '../auth/auth.module'
import { FinanceModule } from '../finance/finance.module'
import { MonitoringModule } from '../monitoring/monitoring.module'
import { OperationsRealtimeModule } from '../operations-realtime.module'
import { OperationsController } from './operations.controller'
import { OperationsService } from './operations.service'
import { CashSessionService } from './cash-session.service'
import { ComandaService } from './comanda.service'
import { OperationsHelpersService } from './operations-helpers.service'

@Module({
  imports: [AuthModule, PrismaModule, CacheModule, MonitoringModule, OperationsRealtimeModule, FinanceModule],
  controllers: [OperationsController],
  providers: [OperationsHelpersService, CashSessionService, ComandaService, OperationsService],
  exports: [OperationsService],
})
export class OperationsModule {}
