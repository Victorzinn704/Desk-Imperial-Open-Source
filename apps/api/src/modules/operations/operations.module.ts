import { Module } from '@nestjs/common'
import { CacheModule } from '../../cache/cache.module'
import { AuthModule } from '../auth/auth.module'
import { MonitoringModule } from '../monitoring/monitoring.module'
import { OperationsRealtimeModule } from '../operations-realtime.module'
import { OperationsController } from './operations.controller'
import { OperationsService } from './operations.service'
import { CashSessionService } from './cash-session.service'
import { ComandaService } from './comanda.service'
import { OperationsHelpersService } from './operations-helpers.service'

@Module({
  imports: [AuthModule, CacheModule, MonitoringModule, OperationsRealtimeModule],
  controllers: [OperationsController],
  providers: [OperationsHelpersService, CashSessionService, ComandaService, OperationsService],
  exports: [OperationsService],
})
export class OperationsModule {}
