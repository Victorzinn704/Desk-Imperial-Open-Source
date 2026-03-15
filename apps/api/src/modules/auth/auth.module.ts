import { Module, forwardRef } from '@nestjs/common'
import { ConsentModule } from '../consent/consent.module'
import { MonitoringModule } from '../monitoring/monitoring.module'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { SessionGuard } from './guards/session.guard'

@Module({
  imports: [forwardRef(() => ConsentModule), MonitoringModule],
  controllers: [AuthController],
  providers: [AuthService, SessionGuard],
  exports: [AuthService, SessionGuard],
})
export class AuthModule {}
