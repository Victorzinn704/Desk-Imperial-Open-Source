import { Module } from '@nestjs/common'
import { OperationsRealtimeSessionsService } from './operations-realtime/operations-realtime-sessions.service'

@Module({
  providers: [OperationsRealtimeSessionsService],
  exports: [OperationsRealtimeSessionsService],
})
export class OperationsRealtimeSessionsModule {}
