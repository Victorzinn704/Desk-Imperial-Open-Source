import { Module } from '@nestjs/common'
import { CacheModule } from '../../cache/cache.module'
import { AuthModule } from '../auth/auth.module'
import { MonitoringModule } from '../monitoring/monitoring.module'
import { OperationsRealtimeModule } from '../operations-realtime.module'
import { OperationsController } from './operations.controller'
import { OperationsService } from './operations.service'

@Module({
  imports: [AuthModule, CacheModule, MonitoringModule, OperationsRealtimeModule],
  controllers: [OperationsController],
  providers: [OperationsService],
  exports: [OperationsService],
})
export class OperationsModule {}
