import { Inject, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Response } from 'express'
import type { AuthContext } from './auth.types'
import type { RequestContext } from '../../common/utils/request-context.util'
import { PrismaService } from '../../database/prisma.service'
import { MailerService } from '../mailer/mailer.service'
import { AuditLogService } from '../monitoring/audit-log.service'
import { AuthRateLimitService } from './auth-rate-limit.service'
import { AuthSessionService } from './auth-session.service'
import { AuthRegistrationService } from './auth-registration.service'
import { AuthLoginService } from './auth-login.service'
import { AuthPasswordService } from './auth-password.service'
import { AuthEmailVerificationService } from './auth-email-verification.service'
import { DemoAccessService } from './demo-access.service'
import {
  getAdminPinVerificationCookieName,
  getAdminPinVerificationCookieOptions,
} from '../admin-pin/admin-pin.constants'
import type { ForgotPasswordDto } from './dto/forgot-password.dto'
import type { DemoLoginDto } from './dto/demo-login.dto'
import type { LoginDto } from './dto/login.dto'
import type { RegisterDto } from './dto/register.dto'
import type { ResetPasswordDto } from './dto/reset-password.dto'
import type { UpdateProfileDto } from './dto/update-profile.dto'
import type { VerifyEmailDto } from './dto/verify-email.dto'
import { sanitizePlainText } from '../../common/utils/input-hardening.util'
import { normalizeComparableValue, resolveAuthActorUserId, toAuthUser } from './auth-shared.util'
import { assertOwnerRole } from '../../common/utils/workspace-access.util'

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(MailerService) private readonly mailerService: MailerService,
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService,
    @Inject(AuthRateLimitService) private readonly authRateLimitService: AuthRateLimitService,
    @Inject(DemoAccessService) private readonly demoAccessService: DemoAccessService,
    @Inject(AuthSessionService) private readonly sessionService: AuthSessionService,
    @Inject(AuthRegistrationService) private readonly registrationService: AuthRegistrationService,
    @Inject(AuthLoginService) private readonly loginService: AuthLoginService,
    @Inject(AuthPasswordService) private readonly passwordService: AuthPasswordService,
    @Inject(AuthEmailVerificationService) private readonly emailVerificationService: AuthEmailVerificationService,
  ) {}

  // === Delegates ===

  register(dto: RegisterDto, context: RequestContext) {
    return this.registrationService.register(dto, context)
  }

  login(dto: LoginDto, response: Response, context: RequestContext) {
    return this.loginService.login(dto, response, context)
  }

  loginDemo(dto: DemoLoginDto, response: Response, context: RequestContext) {
    return this.loginService.loginDemo(dto, response, context)
  }

  requestPasswordReset(dto: ForgotPasswordDto, context: RequestContext) {
    return this.passwordService.requestPasswordReset(dto, context)
  }

  resetPassword(dto: ResetPasswordDto, context: RequestContext) {
    return this.passwordService.resetPassword(dto, context)
  }

  requestEmailVerification(dto: ForgotPasswordDto, context: RequestContext) {
    return this.emailVerificationService.requestEmailVerification(dto, context)
  }

  verifyEmail(dto: VerifyEmailDto, context: RequestContext) {
    return this.emailVerificationService.verifyEmail(dto, context)
  }

  // === Owned methods ===

  async logout(auth: AuthContext, response: Response, context: RequestContext) {
    await this.demoAccessService.closeGrantForSession(auth.sessionId)

    await this.prisma.session.updateMany({
      where: { id: auth.sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    })

    response.clearCookie(this.sessionService.getSessionCookieName(), this.sessionService.getSessionCookieBaseOptions())
    response.clearCookie(this.sessionService.getCsrfCookieName(), this.sessionService.getCsrfCookieBaseOptions())
    response.clearCookie(
      getAdminPinVerificationCookieName(this.isProduction()),
      getAdminPinVerificationCookieOptions({
        secure: this.shouldUseSecureCookies(),
        sameSite: this.getCookieSameSitePolicy(),
      }),
    )

    await this.auditLogService.record({
      actorUserId: resolveAuthActorUserId(auth),
      event: 'auth.logout.succeeded',
      resource: 'session',
      resourceId: auth.sessionId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    await Promise.all([
      this.sessionService.forgetSessionCache(auth.sessionId),
      this.sessionService.disconnectTrackedSessions([auth.sessionId]),
      this.sessionService.refreshWorkspaceSessionCaches(auth.workspaceOwnerUserId),
      this.sessionService.invalidateWorkspaceDerivedCaches(auth.workspaceOwnerUserId),
    ])

    return { success: true }
  }

  async validateSessionToken(rawToken: string): Promise<AuthContext | null> {
    return this.sessionService.validateSessionToken(rawToken)
  }

  async getCurrentUser(auth: AuthContext, response: Response) {
    this.sessionService.setCsrfCookie(response, auth.sessionId)

    return {
      user: auth,
      csrfToken: this.sessionService.buildCsrfToken(auth.sessionId),
    }
  }

  async updateProfile(auth: AuthContext, dto: UpdateProfileDto, context: RequestContext) {
    assertOwnerRole(auth, 'Apenas o dono da empresa pode atualizar o perfil.')

    const user = await this.prisma.user.update({
      where: { id: auth.userId },
      data: {
        fullName: sanitizePlainText(dto.fullName, 'Nome do responsavel', {
          allowEmpty: false,
          rejectFormula: true,
        })!,
        companyName: sanitizePlainText(dto.companyName, 'Nome da empresa', {
          allowEmpty: true,
          rejectFormula: true,
        }),
        preferredCurrency: dto.preferredCurrency,
      },
      include: { cookiePreference: true },
    })

    await this.auditLogService.record({
      actorUserId: resolveAuthActorUserId(auth),
      event: 'auth.profile.updated',
      resource: 'user',
      resourceId: auth.userId,
      metadata: {
        fullName: user.fullName,
        companyName: user.companyName,
        preferredCurrency: user.preferredCurrency,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    await Promise.all([
      this.sessionService.refreshWorkspaceSessionCaches(auth.workspaceOwnerUserId),
      this.sessionService.invalidateWorkspaceDerivedCaches(auth.workspaceOwnerUserId),
    ])

    return {
      user: toAuthUser(user, {
        sessionId: auth.sessionId,
        actorUserId: resolveAuthActorUserId(auth),
        analytics: user.cookiePreference?.analytics ?? false,
        marketing: user.cookiePreference?.marketing ?? false,
        evaluationAccess: auth.evaluationAccess,
        employeeId: auth.employeeId,
        employeeCode: auth.employeeCode,
      }),
    }
  }

  // === Helpers ===

  async refreshWorkspaceSessionCaches(workspaceOwnerUserId: string) {
    return this.sessionService.refreshWorkspaceSessionCaches(workspaceOwnerUserId)
  }

  async refreshEmployeeSessionCaches(employeeId: string) {
    return this.sessionService.refreshEmployeeSessionCaches(employeeId)
  }

  async revokeEmployeeSessions(employeeId: string) {
    return this.sessionService.revokeEmployeeSessions(employeeId)
  }

  async forgetSessionCache(sessionId: string) {
    return this.sessionService.forgetSessionCache(sessionId)
  }

  getSessionCookieName() {
    return this.sessionService.getSessionCookieName()
  }

  getCsrfCookieName() {
    return this.sessionService.getCsrfCookieName()
  }

  buildCsrfToken(sessionId: string) {
    return this.sessionService.buildCsrfToken(sessionId)
  }

  setSessionCookies(response: Response, token: string, sessionId: string, expiresAt: Date) {
    this.sessionService.setSessionCookies(response, token, sessionId, expiresAt)
  }

  setCsrfCookie(response: Response, sessionId: string, expiresAt?: Date) {
    this.sessionService.setCsrfCookie(response, sessionId, expiresAt)
  }

  getSessionCookieBaseOptions() {
    return this.sessionService.getSessionCookieBaseOptions()
  }

  getCsrfCookieBaseOptions() {
    return this.sessionService.getCsrfCookieBaseOptions()
  }

  private shouldUseSecureCookies() {
    if (this.isProduction()) {
      return true
    }
    return parseBoolean(this.configService.get<string>('COOKIE_SECURE'))
  }

  private getCookieSameSitePolicy(): 'lax' | 'strict' | 'none' {
    const configuredPolicy = this.configService.get<string>('COOKIE_SAME_SITE')?.trim().toLowerCase()
    if (configuredPolicy === 'strict') {
      return configuredPolicy
    }
    if (configuredPolicy === 'none') {
      if (!this.shouldUseSecureCookies()) {
        return 'lax'
      }
      return configuredPolicy
    }
    return 'lax'
  }

  private isProduction() {
    return this.configService.get<string>('NODE_ENV') === 'production'
  }

  private getConsentVersion() {
    return this.configService.get<string>('CONSENT_VERSION') ?? '2026.03'
  }

  async sendLoginAlertIfEnabled(
    user: { id: string; email: string; fullName: string },
    context: RequestContext,
    currentSessionId: string,
  ) {
    if (!parseBoolean(this.configService.get<string>('LOGIN_ALERT_EMAILS_ENABLED'))) {
      return
    }

    const previousSessions = await this.prisma.session.findMany({
      where: { userId: user.id, id: { not: currentSessionId } },
      select: { id: true, ipAddress: true, userAgent: true },
      take: 12,
      orderBy: { createdAt: 'desc' },
    })

    if (previousSessions.length === 0) {
      return
    }

    const isKnownDevice = previousSessions.some(
      (session) =>
        normalizeComparableValue(session.ipAddress) === normalizeComparableValue(context.ipAddress) &&
        normalizeComparableValue(session.userAgent) === normalizeComparableValue(context.userAgent),
    )

    if (isKnownDevice) {
      return
    }

    try {
      const delivery = await this.mailerService.sendLoginAlertEmail({
        to: user.email,
        fullName: user.fullName,
        occurredAt: new Date(),
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })

      await this.auditLogService.record({
        actorUserId: user.id,
        event: 'auth.login.notification_sent',
        resource: 'session',
        metadata: { email: user.email, deliveryMode: delivery.mode },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })
    } catch (error) {
      this.logger.warn(
        `Falha ao enviar alerta de login para ${user.email}: ${error instanceof Error ? error.message : 'unknown'}`,
      )
    }
  }

  async assertAllowedForKeys(keys: string[], assertion: (key: string) => Promise<void>) {
    await Promise.all(keys.map((key) => assertion(key)))
  }

  async clearRateLimitKeys(keys: string[]) {
    await Promise.all(keys.map((key) => this.authRateLimitService.clear(key)))
  }
}

function parseBoolean(value: string | undefined) {
  if (value == null) {
    return false
  }
  return value === 'true'
}
