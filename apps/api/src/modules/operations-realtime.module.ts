import { Module } from '@nestjs/common'
import { AuthModule } from './auth/auth.module'
import { OperationsRealtimeSessionsModule } from './operations-realtime-sessions.module'
import { OperationsRealtimeGateway } from './operations-realtime/operations-realtime.gateway'
import { OperationsRealtimeService } from './operations-realtime/operations-realtime.service'

@Module({
  imports: [AuthModule, OperationsRealtimeSessionsModule],
  providers: [OperationsRealtimeService, OperationsRealtimeGateway],
  exports: [OperationsRealtimeService, OperationsRealtimeGateway],
})
export class OperationsRealtimeModule {}
