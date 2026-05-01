import { Module } from '@nestjs/common'
import { MonitoringModule } from '../monitoring/monitoring.module'
import { ConsentBootstrap } from './consent.bootstrap'
import { ConsentController } from './consent.controller'
import { ConsentService } from './consent.service'

@Module({
  imports: [MonitoringModule],
  controllers: [ConsentController],
  providers: [ConsentService, ConsentBootstrap],
  exports: [ConsentService],
})
export class ConsentModule {}
