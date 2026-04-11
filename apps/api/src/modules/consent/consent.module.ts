import { forwardRef, Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { MonitoringModule } from '../monitoring/monitoring.module'
import { ConsentBootstrap } from './consent.bootstrap'
import { ConsentController } from './consent.controller'
import { ConsentService } from './consent.service'

@Module({
  imports: [forwardRef(() => AuthModule), MonitoringModule],
  controllers: [ConsentController],
  providers: [ConsentService, ConsentBootstrap],
  exports: [ConsentService],
})
export class ConsentModule {}
