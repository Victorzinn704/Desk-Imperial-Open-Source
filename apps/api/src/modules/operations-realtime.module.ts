import { Module } from '@nestjs/common'
import { AuthModule } from './auth/auth.module'
import { OperationsRealtimeGateway } from './operations-realtime/operations-realtime.gateway'
import { OperationsRealtimeService } from './operations-realtime/operations-realtime.service'

@Module({
  imports: [AuthModule],
  providers: [OperationsRealtimeService, OperationsRealtimeGateway],
  exports: [OperationsRealtimeService, OperationsRealtimeGateway],
})
export class OperationsRealtimeModule {}
