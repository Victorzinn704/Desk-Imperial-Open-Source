import { Module, forwardRef } from '@nestjs/common'
import { ConsentModule } from '../consent/consent.module'
import { MailerModule } from '../mailer/mailer.module'
import { MonitoringModule } from '../monitoring/monitoring.module'
import { AuthRateLimitService } from './auth-rate-limit.service'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { DemoAccessService } from './demo-access.service'
import { CsrfGuard } from './guards/csrf.guard'
import { SessionGuard } from './guards/session.guard'

@Module({
  imports: [forwardRef(() => ConsentModule), MonitoringModule, MailerModule],
  controllers: [AuthController],
  providers: [AuthService, AuthRateLimitService, DemoAccessService, SessionGuard, CsrfGuard],
  exports: [AuthService, SessionGuard, CsrfGuard],
})
export class AuthModule {}
