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
import { AuditSeverity, UserRole, UserStatus } from '@prisma/client'
import * as argon2 from 'argon2'
import type { Response } from 'express'
import type { RequestContext } from '../../common/utils/request-context.util'
import { PrismaService } from '../../database/prisma.service'
import { MailerService } from '../mailer/mailer.service'
import { AuditLogService } from '../monitoring/audit-log.service'
import { AuthRateLimitService } from './auth-rate-limit.service'
import {
  authSessionUserSelect,
  authSessionWorkspaceOwnerSelect,
  hashToken,
  isServiceUnavailable,
  normalizeComparableValue,
  normalizeEmail,
  parseBoolean,
  sanitizeEmployeeCodeForLogin,
  toAuthUser,
} from './auth-shared.util'
import type { DemoLoginDto } from './dto/demo-login.dto'
import { type LoginDto, LoginModeDto } from './dto/login.dto'
import { DemoAccessService } from './demo-access.service'
import { AuthSessionService } from './auth-session.service'
import type { AuthEmailVerificationService } from './auth-email-verification.service'

type RateLimitState = Awaited<ReturnType<AuthRateLimitService['recordFailure']>>

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
      await this.assertAllowedForKeys(rateLimitKeys, (key) => this.authRateLimitService.assertLoginAllowed(key))
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

    const actor = await this.resolveLoginActor(dto)

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
      await this.clearRateLimitKeys(rateLimitKeys)
      const verificationMessage = await this.handleUnverifiedLogin(activeActor.ownerUser, context)
      throw new ForbiddenException(verificationMessage)
    }

    await this.clearRateLimitKeys(rateLimitKeys)

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

    void this.sendLoginAlertIfEnabled(activeActor.ownerUser, context, session.sessionId)

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
      await this.assertAllowedForKeys(rateLimitKeys, (key) => this.authRateLimitService.assertLoginAllowed(key))
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
        ? await this.resolveDemoStaffActor(demoEmail, dto.employeeCode)
        : await this.resolveDemoOwnerActor(demoEmail)

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
      await this.clearRateLimitKeys(rateLimitKeys)
      const verificationMessage = await this.handleUnverifiedLogin(activeActor.ownerUser, context)
      throw new ForbiddenException(verificationMessage)
    }

    await this.clearRateLimitKeys(rateLimitKeys)

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

    void this.sendLoginAlertIfEnabled(activeActor.ownerUser, context, session.sessionId)

    return {
      user: authUser,
      csrfToken: this.sessionService.buildCsrfToken(session.sessionId),
      session: { expiresAt: session.expiresAt },
    }
  }

  private async resolveDemoOwnerActor(demoEmail: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: demoEmail },
      select: { ...authSessionUserSelect, passwordHash: true, role: true },
    })

    if (!user || user.role !== UserRole.OWNER || user.companyOwnerId) {
      return null
    }

    return {
      actorUserId: user.id,
      sessionUserId: user.id,
      workspaceOwnerUserId: user.id,
      employeeId: user.employeeAccount?.id ?? null,
      employeeCode: user.employeeAccount?.employeeCode ?? null,
      passwordHash: user.passwordHash,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      fullName: user.fullName,
      cookiePreference: user.cookiePreference,
      ownerUser: user,
      authUser: user,
    }
  }

  private async resolveDemoStaffActor(demoEmail: string, employeeCode?: string) {
    const owner = await this.prisma.user.findFirst({
      where: { email: demoEmail, companyOwnerId: null, role: UserRole.OWNER },
      select: { id: true },
    })

    if (!owner) {
      return null
    }

    const safeEmployeeCode = sanitizeEmployeeCodeForLogin(employeeCode ?? 'VD-001')
    const employee = await this.findActiveEmployeeLoginActor(owner.id, safeEmployeeCode)

    if (!employee) {
      return null
    }

    const ownerUser = employee.user
    const legacyLoginUser = employee.loginUser

    if (ownerUser.status !== UserStatus.ACTIVE) {
      return null
    }

    return {
      actorUserId: legacyLoginUser?.id ?? ownerUser.id,
      sessionUserId: legacyLoginUser?.id ?? null,
      workspaceOwnerUserId: ownerUser.id,
      employeeId: employee.id,
      employeeCode: employee.employeeCode,
      passwordHash: hashToken(`demo-session:${ownerUser.id}:${employee.id}:${employee.employeeCode}`),
      status: employee.active ? UserStatus.ACTIVE : UserStatus.DISABLED,
      emailVerifiedAt: ownerUser.emailVerifiedAt,
      fullName: employee.displayName,
      cookiePreference: ownerUser.cookiePreference,
      ownerUser,
      authUser: {
        ...ownerUser,
        fullName: employee.displayName,
        role: UserRole.STAFF,
        companyOwnerId: ownerUser.id,
        email: ownerUser.email,
      },
    }
  }

  private async resolveLoginActor(dto: LoginDto) {
    if (dto.loginMode === LoginModeDto.STAFF) {
      const companyEmail = normalizeEmail(dto.companyEmail ?? '')
      const employeeCode = sanitizeEmployeeCodeForLogin(dto.employeeCode ?? '')

      const owner = await this.prisma.user.findFirst({
        where: { email: companyEmail, companyOwnerId: null, role: UserRole.OWNER },
        select: { id: true },
      })

      if (!owner) {
        return null
      }

      const employee = await this.findActiveEmployeeLoginActor(owner.id, employeeCode)

      if (!employee) {
        return null
      }

      const ownerUser = employee.user
      const legacyLoginUser = employee.loginUser
      const passwordHash = this.resolveEmployeePasswordHash(employee)

      if (!passwordHash || ownerUser.status !== UserStatus.ACTIVE) {
        return null
      }

      return {
        actorUserId: legacyLoginUser?.id ?? ownerUser.id,
        sessionUserId: legacyLoginUser?.id ?? null,
        workspaceOwnerUserId: ownerUser.id,
        employeeId: employee.id,
        employeeCode: employee.employeeCode,
        passwordHash,
        status: employee.active ? UserStatus.ACTIVE : UserStatus.DISABLED,
        emailVerifiedAt: ownerUser.emailVerifiedAt,
        fullName: employee.displayName,
        cookiePreference: ownerUser.cookiePreference,
        ownerUser,
        authUser: {
          ...ownerUser,
          fullName: employee.displayName,
          role: UserRole.STAFF,
          companyOwnerId: ownerUser.id,
          email: ownerUser.email,
        },
      }
    }

    const user = await this.prisma.user.findUnique({
      where: { email: normalizeEmail(dto.email ?? '') },
      select: { ...authSessionUserSelect, passwordHash: true, role: true },
    })

    if (!user) {
      return null
    }

    return {
      actorUserId: user.id,
      sessionUserId: user.id,
      workspaceOwnerUserId: user.id,
      employeeId: user.employeeAccount?.id ?? null,
      employeeCode: user.employeeAccount?.employeeCode ?? null,
      passwordHash: user.passwordHash,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      fullName: user.fullName,
      cookiePreference: user.cookiePreference,
      ownerUser: user,
      authUser: user,
    }
  }

  private findActiveEmployeeLoginActor(ownerUserId: string, employeeCode: string) {
    return this.prisma.employee.findFirst({
      where: { userId: ownerUserId, employeeCode, active: true },
      select: {
        id: true,
        active: true,
        employeeCode: true,
        displayName: true,
        passwordHash: true,
        user: { select: authSessionWorkspaceOwnerSelect },
        loginUser: { select: { id: true, passwordHash: true } },
      },
    })
  }

  private resolveEmployeePasswordHash(employee: {
    passwordHash: string | null
    loginUser: { passwordHash: string } | null
  }) {
    return employee.passwordHash ?? employee.loginUser?.passwordHash ?? null
  }

  private async handleFailedLogin(params: {
    actorUserId?: string
    actorFullName?: string
    email: string
    reason: string
    rateLimitKeys: string[]
    context: RequestContext
  }): Promise<never> {
    const rateLimitState = this.pickMostRestrictiveRateLimitState(
      await this.recordAttemptsForKeys(params.rateLimitKeys, (key) => this.authRateLimitService.recordFailure(key)),
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
      void this.sendFailedLoginAlertIfEnabled(
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

  private async sendLoginAlertIfEnabled(
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

  private async sendFailedLoginAlertIfEnabled(
    user: { id: string; email: string; fullName: string },
    context: RequestContext,
    failedAttempts: number,
  ) {
    if (!parseBoolean(this.configService.get<string>('FAILED_LOGIN_ALERTS_ENABLED'))) {
      return
    }

    const threshold = Math.max(Number(this.configService.get<string>('FAILED_LOGIN_ALERT_THRESHOLD') ?? 3), 1)

    if (failedAttempts < threshold || failedAttempts > threshold) {
      return
    }

    try {
      const delivery = await this.mailerService.sendFailedLoginAlertEmail({
        to: user.email,
        fullName: user.fullName,
        occurredAt: new Date(),
        attemptCount: failedAttempts,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        locationSummary: context.ipAddress ? 'Local aproximado indisponivel no momento' : null,
      })

      await this.auditLogService.record({
        actorUserId: user.id,
        event: 'auth.login.failed_notification_sent',
        resource: 'session',
        metadata: { email: user.email, failedAttempts, deliveryMode: delivery.mode },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })
    } catch (error) {
      this.logger.warn(
        `Falha ao enviar alerta de tentativas suspeitas para ${user.email}: ${error instanceof Error ? error.message : 'unknown'}`,
      )
    }
  }

  private async assertAllowedForKeys(keys: string[], assertion: (key: string) => Promise<void>) {
    await Promise.all(keys.map((key) => assertion(key)))
  }

  private async recordAttemptsForKeys(keys: string[], recorder: (key: string) => Promise<RateLimitState>) {
    return Promise.all(keys.map((key) => recorder(key)))
  }

  private async clearRateLimitKeys(keys: string[]) {
    await Promise.all(keys.map((key) => this.authRateLimitService.clear(key)))
  }

  private pickMostRestrictiveRateLimitState(states: RateLimitState[]): RateLimitState {
    const [initialState, ...remainingStates] = states
    if (!initialState) {
      return { count: 0, firstAttemptAt: 0, lockedUntil: null }
    }

    return remainingStates.reduce((current, candidate) => {
      const currentLockedUntil = current.lockedUntil ?? 0
      const candidateLockedUntil = candidate.lockedUntil ?? 0
      if (candidateLockedUntil > currentLockedUntil) {
        return candidate
      }
      if (candidateLockedUntil === currentLockedUntil && candidate.count > current.count) {
        return candidate
      }
      return current
    }, initialState)
  }
}
