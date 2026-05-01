import { Global, Module } from '@nestjs/common'
import { ConsentModule } from '../consent/consent.module'
import { GeocodingModule } from '../geocoding/geocoding.module'
import { MailerModule } from '../mailer/mailer.module'
import { MonitoringModule } from '../monitoring/monitoring.module'
import { OperationsRealtimeSessionsModule } from '../operations-realtime-sessions.module'
import { AuthRateLimitService } from './auth-rate-limit.service'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { AuthSessionService } from './auth-session.service'
import { AuthRegistrationService } from './auth-registration.service'
import { AuthLoginService } from './auth-login.service'
import { AuthPasswordService } from './auth-password.service'
import { AuthEmailVerificationService } from './auth-email-verification.service'
import { DemoAccessService } from './demo-access.service'
import { CsrfGuard } from './guards/csrf.guard'
import { SessionGuard } from './guards/session.guard'

@Global()
@Module({
  imports: [ConsentModule, GeocodingModule, MonitoringModule, MailerModule, OperationsRealtimeSessionsModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthSessionService,
    AuthRegistrationService,
    AuthLoginService,
    AuthPasswordService,
    AuthEmailVerificationService,
    {
      provide: 'AuthEmailVerificationService',
      useExisting: AuthEmailVerificationService,
    },
    AuthRateLimitService,
    DemoAccessService,
    SessionGuard,
    CsrfGuard,
  ],
  exports: [AuthService, AuthRateLimitService, DemoAccessService, SessionGuard, CsrfGuard],
})
export class AuthModule {}
