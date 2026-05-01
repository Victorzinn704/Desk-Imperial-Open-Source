import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AuditSeverity, UserStatus } from '@prisma/client'
import * as argon2 from 'argon2'
import type { Response } from 'express'
import type { RequestContext } from '../../common/utils/request-context.util'
import { PrismaService } from '../../database/prisma.service'
import { MailerService } from '../mailer/mailer.service'
import { AuditLogService } from '../monitoring/audit-log.service'
import { AuthRateLimitService } from './auth-rate-limit.service'
import {
  hashToken,
  isServiceUnavailable,
  normalizeEmail,
  sanitizeEmployeeCodeForLogin,
  toAuthUser,
} from './auth-shared.util'
import type { DemoLoginDto } from './dto/demo-login.dto'
import { type LoginDto, LoginModeDto } from './dto/login.dto'
import { DemoAccessService } from './demo-access.service'
import { AuthSessionService } from './auth-session.service'
import { AuthEmailVerificationService } from './auth-email-verification.service'
import { resolveLoginActor, resolveDemoOwnerActor, resolveDemoStaffActor } from './auth-login-actor.utils'
import { sendLoginAlertIfEnabled, sendFailedLoginAlertIfEnabled } from './auth-login-alerts.utils'
import {
  assertAllowedForKeys,
  recordAttemptsForKeys,
  clearRateLimitKeys,
  pickMostRestrictiveRateLimitState,
} from './auth-login-rate-limit.utils'

@Injectable()
export class AuthLoginService {
  private readonly logger = new Logger(AuthLoginService.name)

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(MailerService) private readonly mailerService: MailerService,
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService,
    @Inject(AuthRateLimitService) private readonly authRateLimitService: AuthRateLimitService,
    @Inject(DemoAccessService) private readonly demoAccessService: DemoAccessService,
    @Inject(AuthSessionService) private readonly sessionService: AuthSessionService,
    @Inject('AuthEmailVerificationService') private readonly emailVerificationService: AuthEmailVerificationService,
  ) {}

  async login(dto: LoginDto, response: Response, context: RequestContext) {
    const normalizedEmail =
      dto.loginMode === LoginModeDto.STAFF
        ? `staff:${normalizeEmail(dto.companyEmail ?? '')}:${sanitizeEmployeeCodeForLogin(dto.employeeCode ?? '')}`
        : normalizeEmail(dto.email ?? '')
    const rateLimitKeys = [
      this.authRateLimitService.buildLoginKey(normalizedEmail, context.ipAddress),
      this.authRateLimitService.buildLoginEmailKey(normalizedEmail),
    ]

    try {
      await assertAllowedForKeys(rateLimitKeys, (key) => this.authRateLimitService.assertLoginAllowed(key))
    } catch (error) {
      await this.auditLogService.record({
        event: 'auth.login.blocked',
        resource: 'session',
        severity: AuditSeverity.WARN,
        metadata: { email: normalizedEmail, reason: 'rate_limit' },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })
      throw error
    }

    const actor = await resolveLoginActor(this.prisma, dto)

    if (!actor || actor.status !== UserStatus.ACTIVE) {
      await this.handleFailedLogin({
        email: normalizedEmail,
        reason: 'user_not_found_or_disabled',
        rateLimitKeys,
        context,
      })
      throw new UnauthorizedException('Credenciais invalidas.')
    }

    const activeActor = actor
    const isValidPassword = await argon2.verify(activeActor.passwordHash, dto.password)

    if (!isValidPassword) {
      await this.handleFailedLogin({
        actorUserId: activeActor.actorUserId,
        actorFullName: activeActor.fullName,
        email: normalizedEmail,
        reason: 'invalid_password',
        rateLimitKeys,
        context,
      })
    }

    if (!activeActor.emailVerifiedAt) {
      await clearRateLimitKeys(rateLimitKeys, this.authRateLimitService)
      const verificationMessage = await this.handleUnverifiedLogin(activeActor.ownerUser, context)
      throw new ForbiddenException(verificationMessage)
    }

    await clearRateLimitKeys(rateLimitKeys, this.authRateLimitService)

    let session: Awaited<ReturnType<AuthSessionService['createSession']>>

    try {
      session = await this.sessionService.createSession(
        {
          userId: activeActor.sessionUserId,
          employeeId: activeActor.employeeId,
          workspaceOwnerUserId: activeActor.workspaceOwnerUserId,
          email: activeActor.ownerUser.email,
        },
        context,
      )
    } catch (error) {
      if (this.demoAccessService.isDemoAccount(activeActor.ownerUser.email)) {
        await this.auditLogService.record({
          actorUserId: activeActor.actorUserId,
          event: 'auth.demo.blocked',
          resource: 'session',
          severity: AuditSeverity.WARN,
          metadata: {
            email: normalizedEmail,
            reason: error instanceof Error ? error.message : 'unknown',
          },
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        })
      }
      throw error
    }

    this.sessionService.setSessionCookies(response, session.token, session.sessionId, session.expiresAt)

    const authUser = toAuthUser(activeActor.authUser, {
      sessionId: session.sessionId,
      actorUserId: activeActor.actorUserId,
      analytics: activeActor.cookiePreference?.analytics ?? false,
      marketing: activeActor.cookiePreference?.marketing ?? false,
      evaluationAccess: session.evaluationAccess,
      employeeId: activeActor.employeeId,
      employeeCode: activeActor.employeeCode,
    })
    await this.sessionService.cacheAuthSession(
      { tokenHash: hashToken(session.token), auth: authUser },
      session.expiresAt,
    )

    await this.auditLogService.record({
      actorUserId: activeActor.actorUserId,
      event: 'auth.login.succeeded',
      resource: 'session',
      resourceId: session.sessionId,
      metadata: { email: normalizedEmail, loginMode: dto.loginMode },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    void sendLoginAlertIfEnabled(
      this.configService,
      this.prisma,
      this.mailerService,
      this.auditLogService,
      activeActor.ownerUser,
      context,
      session.sessionId,
    )

    return {
      user: authUser,
      csrfToken: this.sessionService.buildCsrfToken(session.sessionId),
      session: { expiresAt: session.expiresAt },
    }
  }

  async loginDemo(dto: DemoLoginDto, response: Response, context: RequestContext) {
    const demoEmail = normalizeEmail(this.configService.get<string>('DEMO_ACCOUNT_EMAIL') ?? 'demo@deskimperial.online')

    if (!this.demoAccessService.isDemoAccount(demoEmail)) {
      throw new BadRequestException('Modo demo não está configurado nesta instância.')
    }

    const normalizedEmail =
      dto.loginMode === LoginModeDto.STAFF
        ? `demo:staff:${demoEmail}:${sanitizeEmployeeCodeForLogin(dto.employeeCode ?? 'VD-001')}`
        : `demo:owner:${demoEmail}`
    const rateLimitKeys = [
      this.authRateLimitService.buildLoginKey(normalizedEmail, context.ipAddress),
      this.authRateLimitService.buildLoginEmailKey(normalizedEmail),
    ]

    try {
      await assertAllowedForKeys(rateLimitKeys, (key) => this.authRateLimitService.assertLoginAllowed(key))
    } catch (error) {
      await this.auditLogService.record({
        event: 'auth.login.blocked',
        resource: 'session',
        severity: AuditSeverity.WARN,
        metadata: { email: normalizedEmail, reason: 'rate_limit', demo: true },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })
      throw error
    }

    const actor =
      dto.loginMode === LoginModeDto.STAFF
        ? await resolveDemoStaffActor(this.prisma, demoEmail, dto.employeeCode)
        : await resolveDemoOwnerActor(this.prisma, demoEmail)

    if (!actor || actor.status !== UserStatus.ACTIVE) {
      await this.handleFailedLogin({
        email: normalizedEmail,
        reason: 'user_not_found_or_disabled',
        rateLimitKeys,
        context,
      })
      throw new UnauthorizedException('Credenciais invalidas.')
    }

    const activeActor = actor!

    if (!activeActor.emailVerifiedAt) {
      await clearRateLimitKeys(rateLimitKeys, this.authRateLimitService)
      const verificationMessage = await this.handleUnverifiedLogin(activeActor.ownerUser, context)
      throw new ForbiddenException(verificationMessage)
    }

    await clearRateLimitKeys(rateLimitKeys, this.authRateLimitService)

    const session = await this.sessionService.createSession(
      {
        userId: activeActor.sessionUserId,
        employeeId: activeActor.employeeId,
        workspaceOwnerUserId: activeActor.workspaceOwnerUserId,
        email: activeActor.ownerUser.email,
      },
      context,
    )

    this.sessionService.setSessionCookies(response, session.token, session.sessionId, session.expiresAt)

    const authUser = toAuthUser(activeActor.authUser, {
      sessionId: session.sessionId,
      actorUserId: activeActor.actorUserId,
      analytics: activeActor.cookiePreference?.analytics ?? false,
      marketing: activeActor.cookiePreference?.marketing ?? false,
      evaluationAccess: session.evaluationAccess,
      employeeId: activeActor.employeeId,
      employeeCode: activeActor.employeeCode,
    })
    await this.sessionService.cacheAuthSession(
      { tokenHash: hashToken(session.token), auth: authUser },
      session.expiresAt,
    )

    await this.auditLogService.record({
      actorUserId: activeActor.actorUserId,
      event: 'auth.login.succeeded',
      resource: 'session',
      resourceId: session.sessionId,
      metadata: { email: normalizedEmail, loginMode: dto.loginMode, demo: true },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    void sendLoginAlertIfEnabled(
      this.configService,
      this.prisma,
      this.mailerService,
      this.auditLogService,
      activeActor.ownerUser,
      context,
      session.sessionId,
    )

    return {
      user: authUser,
      csrfToken: this.sessionService.buildCsrfToken(session.sessionId),
      session: { expiresAt: session.expiresAt },
    }
  }

  private async handleFailedLogin(params: {
    actorUserId?: string
    actorFullName?: string
    email: string
    reason: string
    rateLimitKeys: string[]
    context: RequestContext
  }): Promise<never> {
    const rateLimitState = pickMostRestrictiveRateLimitState(
      await recordAttemptsForKeys(params.rateLimitKeys, (key) => this.authRateLimitService.recordFailure(key)),
    )

    await this.auditLogService.record({
      actorUserId: params.actorUserId,
      event: 'auth.login.failed',
      resource: 'session',
      severity: AuditSeverity.WARN,
      metadata: {
        email: params.email,
        reason: params.reason,
        failedAttempts: rateLimitState.count,
        lockedUntil: rateLimitState.lockedUntil ? new Date(rateLimitState.lockedUntil).toISOString() : null,
      },
      ipAddress: params.context.ipAddress,
      userAgent: params.context.userAgent,
    })

    if (params.actorUserId && params.actorFullName) {
      void sendFailedLoginAlertIfEnabled(
        this.configService,
        this.mailerService,
        this.auditLogService,
        { id: params.actorUserId, email: params.email, fullName: params.actorFullName },
        params.context,
        rateLimitState.count,
      )
    }

    if (rateLimitState.lockedUntil) {
      const retryAfterSeconds = Math.ceil((rateLimitState.lockedUntil - Date.now()) / 1000)
      throw new HttpException(
        `Muitas tentativas de acesso. Tente novamente em ${retryAfterSeconds} segundo(s).`,
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }

    throw new UnauthorizedException('Credenciais invalidas.')
  }

  private async handleUnverifiedLogin(user: { id: string; email: string; fullName: string }, context: RequestContext) {
    try {
      const verificationDelivery = await this.emailVerificationService.sendEmailVerificationCode({
        userId: user.id,
        email: user.email,
        fullName: user.fullName,
        context,
        trigger: 'login',
      })

      if (verificationDelivery.deliveryMode === 'preview') {
        return 'Seu email ainda nao foi confirmado. O envio de email esta instavel no momento. Tente reenviar o codigo em instantes.'
      }

      return 'Seu email ainda nao foi confirmado. Enviamos um codigo para liberar o primeiro acesso.'
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() === HttpStatus.TOO_MANY_REQUESTS) {
        return 'Seu email ainda nao foi confirmado. Aguarde alguns minutos antes de solicitar um novo codigo.'
      }

      if (isServiceUnavailable(error)) {
        return 'Seu email ainda nao foi confirmado. A validacao foi aberta, mas o envio do codigo esta indisponivel no momento. Tente reenviar em alguns instantes.'
      }

      throw error
    }
  }
}
