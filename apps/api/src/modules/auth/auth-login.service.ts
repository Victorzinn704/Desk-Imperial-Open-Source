import { BadRequestException, ForbiddenException, Inject, Injectable, Logger } from '@nestjs/common'
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
  normalizeAuthEmail,
  normalizeEmail,
  sanitizeEmployeeCodeForLogin,
  toAuthUser,
} from './auth-shared.util'
import type { DemoLoginDto } from './dto/demo-login.dto'
import { type LoginDto, LoginModeDto } from './dto/login.dto'
import { DemoAccessService } from './demo-access.service'
import { AuthSessionService } from './auth-session.service'
import { AuthEmailVerificationService } from './auth-email-verification.service'
import { resolveDemoOwnerActor, resolveDemoStaffActor, resolveLoginActor } from './auth-login-actor.utils'
import { type LoginAlertDependencies, sendLoginAlertIfEnabled } from './auth-login-alerts.utils'
import { type FailedLoginDependencies, rejectFailedLogin } from './auth-login-failure.utils'
import { resolveUnverifiedLoginMessage } from './auth-login-verification.utils'
import { assertAllowedForKeys, clearRateLimitKeys } from './auth-login-rate-limit.utils'

type ResolvedLoginActor = NonNullable<Awaited<ReturnType<typeof resolveLoginActor>>>
type LoginSessionInput = {
  actor: ResolvedLoginActor
  context: RequestContext
  demo?: boolean
  loginMode: LoginModeDto | undefined
  normalizedEmail: string
  response: Response
}

@Injectable()
export class AuthLoginService {
  private readonly logger = new Logger(AuthLoginService.name)
  private readonly loginAlertDependencies: LoginAlertDependencies
  private readonly failedLoginDependencies: FailedLoginDependencies

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(MailerService) private readonly mailerService: MailerService,
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService,
    @Inject(AuthRateLimitService) private readonly authRateLimitService: AuthRateLimitService,
    @Inject(DemoAccessService) private readonly demoAccessService: DemoAccessService,
    @Inject(AuthSessionService) private readonly sessionService: AuthSessionService,
    @Inject('AuthEmailVerificationService') private readonly emailVerificationService: AuthEmailVerificationService,
  ) {
    this.loginAlertDependencies = {
      configService,
      prisma,
      mailerService,
      auditLogService,
    }
    this.failedLoginDependencies = {
      auditLogService,
      authRateLimitService,
      loginAlertDependencies: this.loginAlertDependencies,
    }
  }

  async login(dto: LoginDto, response: Response, context: RequestContext) {
    const normalizedEmail =
      dto.loginMode === LoginModeDto.STAFF
        ? `staff:${normalizeAuthEmail(dto.companyEmail, 'Email da empresa')}:${sanitizeEmployeeCodeForLogin(dto.employeeCode ?? '')}`
        : normalizeAuthEmail(dto.email)
    const rateLimitKeys = [
      this.authRateLimitService.buildLoginKey(normalizedEmail, context.ipAddress),
      this.authRateLimitService.buildLoginEmailKey(normalizedEmail),
    ]

    await this.assertLoginAllowed({ rateLimitKeys, normalizedEmail, context })

    const actor = await resolveLoginActor(this.prisma, dto)

    if (!actor || actor.status !== UserStatus.ACTIVE) {
      return rejectFailedLogin({
        dependencies: this.failedLoginDependencies,
        email: normalizedEmail,
        reason: 'user_not_found_or_disabled',
        rateLimitKeys,
        context,
      })
    }

    const activeActor = actor
    const isValidPassword = await argon2.verify(activeActor.passwordHash, dto.password)

    if (!isValidPassword) {
      return rejectFailedLogin({
        dependencies: this.failedLoginDependencies,
        actorUserId: activeActor.actorUserId,
        actorFullName: activeActor.fullName,
        email: normalizedEmail,
        reason: 'invalid_password',
        rateLimitKeys,
        context,
      })
    }

    if (!activeActor.emailVerifiedAt) {
      await this.rejectUnverifiedLogin(activeActor, rateLimitKeys, context)
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

    return this.finishLoginSession({
      actor: activeActor,
      context,
      loginMode: dto.loginMode,
      normalizedEmail,
      response,
      session,
    })
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

    await this.assertLoginAllowed({ rateLimitKeys, normalizedEmail, context, demo: true })

    const actor =
      dto.loginMode === LoginModeDto.STAFF
        ? await resolveDemoStaffActor(this.prisma, demoEmail, dto.employeeCode)
        : await resolveDemoOwnerActor(this.prisma, demoEmail)

    if (!actor || actor.status !== UserStatus.ACTIVE) {
      return rejectFailedLogin({
        dependencies: this.failedLoginDependencies,
        email: normalizedEmail,
        reason: 'user_not_found_or_disabled',
        rateLimitKeys,
        context,
      })
    }

    const activeActor = actor

    if (!activeActor.emailVerifiedAt) {
      await this.rejectUnverifiedLogin(activeActor, rateLimitKeys, context)
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

    return this.finishLoginSession({
      actor: activeActor,
      context,
      demo: true,
      loginMode: dto.loginMode,
      normalizedEmail,
      response,
      session,
    })
  }

  private async assertLoginAllowed(input: {
    context: RequestContext
    demo?: boolean
    normalizedEmail: string
    rateLimitKeys: string[]
  }) {
    try {
      await assertAllowedForKeys(input.rateLimitKeys, (key) => this.authRateLimitService.assertLoginAllowed(key))
    } catch (error) {
      await this.auditLogService.record({
        event: 'auth.login.blocked',
        resource: 'session',
        severity: AuditSeverity.WARN,
        metadata: { email: input.normalizedEmail, reason: 'rate_limit', ...(input.demo ? { demo: true } : {}) },
        ipAddress: input.context.ipAddress,
        userAgent: input.context.userAgent,
      })
      throw error
    }
  }

  private async rejectUnverifiedLogin(actor: ResolvedLoginActor, rateLimitKeys: string[], context: RequestContext) {
    await clearRateLimitKeys(rateLimitKeys, this.authRateLimitService)
    const verificationMessage = await resolveUnverifiedLoginMessage({
      emailVerificationService: this.emailVerificationService,
      user: actor.ownerUser,
      context,
    })
    throw new ForbiddenException(verificationMessage)
  }

  private async finishLoginSession(
    input: LoginSessionInput & {
      session: Awaited<ReturnType<AuthSessionService['createSession']>>
    },
  ) {
    this.sessionService.setSessionCookies(
      input.response,
      input.session.token,
      input.session.sessionId,
      input.session.expiresAt,
    )

    const authUser = toAuthUser(input.actor.authUser, {
      sessionId: input.session.sessionId,
      actorUserId: input.actor.actorUserId,
      analytics: input.actor.cookiePreference?.analytics ?? false,
      marketing: input.actor.cookiePreference?.marketing ?? false,
      evaluationAccess: input.session.evaluationAccess,
      employeeId: input.actor.employeeId,
      employeeCode: input.actor.employeeCode,
    })
    await this.sessionService.cacheAuthSession(
      { tokenHash: hashToken(input.session.token), auth: authUser },
      input.session.expiresAt,
    )

    await this.auditLoginSucceeded(input, input.session.sessionId)
    this.sendLoginAlert(input.actor, input.context, input.session.sessionId)

    return {
      user: authUser,
      csrfToken: this.sessionService.buildCsrfToken(input.session.sessionId),
      session: { expiresAt: input.session.expiresAt },
    }
  }

  private async auditLoginSucceeded(input: LoginSessionInput, sessionId: string) {
    await this.auditLogService.record({
      actorUserId: input.actor.actorUserId,
      event: 'auth.login.succeeded',
      resource: 'session',
      resourceId: sessionId,
      metadata: { email: input.normalizedEmail, loginMode: input.loginMode, ...(input.demo ? { demo: true } : {}) },
      ipAddress: input.context.ipAddress,
      userAgent: input.context.userAgent,
    })
  }

  private sendLoginAlert(actor: ResolvedLoginActor, context: RequestContext, currentSessionId: string) {
    void sendLoginAlertIfEnabled({
      dependencies: this.loginAlertDependencies,
      user: actor.ownerUser,
      context,
      currentSessionId,
    })
  }
}
