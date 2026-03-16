import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AuditSeverity, CurrencyCode, OneTimeCodePurpose, UserStatus } from '@prisma/client'
import * as argon2 from 'argon2'
import { createHash, createHmac, randomBytes, randomInt } from 'node:crypto'
import type { Response } from 'express'
import { sanitizePlainText } from '../../common/utils/input-hardening.util'
import type { RequestContext } from '../../common/utils/request-context.util'
import { PrismaService } from '../../database/prisma.service'
import { ConsentService } from '../consent/consent.service'
import { MailerService } from '../mailer/mailer.service'
import { AuditLogService } from '../monitoring/audit-log.service'
import { AuthRateLimitService } from './auth-rate-limit.service'
import {
  DEV_CSRF_COOKIE_NAME,
  DEV_SESSION_COOKIE_NAME,
  PROD_CSRF_COOKIE_NAME,
  PROD_SESSION_COOKIE_NAME,
} from './auth.constants'
import type { AuthContext } from './auth.types'
import { ForgotPasswordDto } from './dto/forgot-password.dto'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { VerifyEmailDto } from './dto/verify-email.dto'
import { DemoAccessService } from './demo-access.service'

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly consentService: ConsentService,
    private readonly mailerService: MailerService,
    private readonly auditLogService: AuditLogService,
    private readonly authRateLimitService: AuthRateLimitService,
    private readonly demoAccessService: DemoAccessService,
  ) {}

  getSessionCookieName() {
    return this.isProduction() ? PROD_SESSION_COOKIE_NAME : DEV_SESSION_COOKIE_NAME
  }

  getCsrfCookieName() {
    return this.isProduction() ? PROD_CSRF_COOKIE_NAME : DEV_CSRF_COOKIE_NAME
  }

  buildCsrfToken(sessionId: string) {
    return createHmac('sha256', this.getCsrfSecret()).update(`csrf:${sessionId}`).digest('hex')
  }

  async register(dto: RegisterDto, context: RequestContext) {
    if (!dto.acceptTerms || !dto.acceptPrivacy) {
      throw new BadRequestException('Voce precisa aceitar os termos de uso e o aviso de privacidade.')
    }

    const normalizedEmail = normalizeEmail(dto.email)
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      throw new ConflictException('Nao foi possivel concluir o cadastro com os dados informados.')
    }

    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id })
    const user = await this.prisma.user.create({
      data: {
        fullName: sanitizePlainText(dto.fullName, 'Nome completo', {
          allowEmpty: false,
          rejectFormula: true,
        })!,
        companyName: sanitizePlainText(dto.companyName, 'Empresa', {
          allowEmpty: true,
          rejectFormula: true,
        }),
        email: normalizedEmail,
        passwordHash,
        preferredCurrency: CurrencyCode.BRL,
        emailVerifiedAt: null,
      },
      select: publicUserSelect,
    })

    await this.consentService.recordLegalAcceptances({
      userId: user.id,
      version: this.getConsentVersion(),
      context,
    })

    await this.consentService.updateCookiePreferences({
      userId: user.id,
      version: this.getConsentVersion(),
      preferences: {
        analytics: dto.analyticsCookies ?? false,
        marketing: dto.marketingCookies ?? false,
      },
      context,
    })

    try {
      await this.sendEmailVerificationCode({
        userId: user.id,
        email: user.email,
        fullName: user.fullName,
        context,
        trigger: 'register',
        bypassRateLimit: true,
      })
    } catch (error) {
      await this.prisma.user.delete({
        where: {
          id: user.id,
        },
      })

      if (isServiceUnavailable(error)) {
        throw new ServiceUnavailableException(
          'Nao foi possivel enviar o codigo de confirmacao agora. O cadastro nao foi concluido. Tente novamente em instantes.',
        )
      }

      throw error
    }

    await this.auditLogService.record({
      actorUserId: user.id,
      event: 'auth.registered',
      resource: 'user',
      resourceId: user.id,
      metadata: {
        email: user.email,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return {
      success: true,
      requiresEmailVerification: true,
      email: user.email,
      message: 'Cadastro concluido. Enviamos um codigo para confirmar seu email antes do primeiro acesso.',
    }
  }

  async login(dto: LoginDto, response: Response, context: RequestContext) {
    const normalizedEmail = normalizeEmail(dto.email)
    const rateLimitKey = this.authRateLimitService.buildLoginKey(normalizedEmail, context.ipAddress)

    try {
      this.authRateLimitService.assertLoginAllowed(rateLimitKey)
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

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        cookiePreference: true,
      },
    })

    if (!user || user.status !== UserStatus.ACTIVE) {
      await this.handleFailedLogin({
        email: normalizedEmail,
        reason: 'user_not_found_or_disabled',
        rateLimitKey,
        context,
      })
    }

    const activeUser = user!
    const isValidPassword = await argon2.verify(activeUser.passwordHash, dto.password)

    if (!isValidPassword) {
      await this.handleFailedLogin({
        actorUserId: activeUser.id,
        email: normalizedEmail,
        reason: 'invalid_password',
        rateLimitKey,
        context,
      })
    }

    if (!activeUser.emailVerifiedAt) {
      this.authRateLimitService.clear(rateLimitKey)
      const verificationMessage = await this.handleUnverifiedLogin(activeUser, context)
      throw new ForbiddenException(verificationMessage)
    }

    this.authRateLimitService.clear(rateLimitKey)

    let session: Awaited<ReturnType<AuthService['createSession']>>

    try {
      session = await this.createSession(
        {
          id: activeUser.id,
          email: activeUser.email,
        },
        context,
      )
    } catch (error) {
      if (this.demoAccessService.isDemoAccount(activeUser.email)) {
        await this.auditLogService.record({
          actorUserId: activeUser.id,
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

    this.setSessionCookies(response, session.token, session.sessionId, session.expiresAt)

    await this.auditLogService.record({
      actorUserId: activeUser.id,
      event: 'auth.login.succeeded',
      resource: 'session',
      resourceId: session.sessionId,
      metadata: { email: normalizedEmail },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    void this.sendLoginAlertIfEnabled(activeUser, context)

    return {
      user: toAuthUser(activeUser, {
        sessionId: session.sessionId,
        analytics: activeUser.cookiePreference?.analytics ?? false,
        marketing: activeUser.cookiePreference?.marketing ?? false,
        evaluationAccess: session.evaluationAccess,
      }),
      session: {
        expiresAt: session.expiresAt,
      },
    }
  }

  async requestPasswordReset(dto: ForgotPasswordDto, context: RequestContext) {
    const normalizedEmail = normalizeEmail(dto.email)
    const rateLimitKey = this.authRateLimitService.buildPasswordResetKey(
      normalizedEmail,
      context.ipAddress,
    )

    this.authRateLimitService.assertPasswordResetAllowed(rateLimitKey)
    const rateLimitState = this.authRateLimitService.recordPasswordResetAttempt(rateLimitKey)
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (!user || user.status !== UserStatus.ACTIVE) {
      await this.auditLogService.record({
        event: 'auth.password-reset.requested',
        resource: 'password_reset',
        severity: AuditSeverity.WARN,
        metadata: {
          email: normalizedEmail,
          userFound: false,
          attempts: rateLimitState.count,
          lockedUntil: rateLimitState.lockedUntil
            ? new Date(rateLimitState.lockedUntil).toISOString()
            : null,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })

      throw new BadRequestException('Email invalido ou nao cadastrado.')
    }

    if (!user.emailVerifiedAt) {
      throw new BadRequestException('Confirme seu email antes de redefinir a senha.')
    }

    const resetCode = await this.issueOneTimeCode({
      userId: user.id,
      email: user.email,
      purpose: OneTimeCodePurpose.PASSWORD_RESET,
      ttlMinutes: this.getPasswordResetTtlMinutes(),
      context,
    })

    try {
      const delivery = await this.mailerService.sendPasswordResetEmail({
        to: user.email,
        fullName: user.fullName,
        code: resetCode.code,
        expiresInMinutes: this.getPasswordResetTtlMinutes(),
      })

      await this.auditLogService.record({
        actorUserId: user.id,
        event: 'auth.password-reset.requested',
        resource: 'password_reset',
        resourceId: resetCode.recordId,
        metadata: {
          email: user.email,
          deliveryMode: delivery.mode,
          attempts: rateLimitState.count,
          lockedUntil: rateLimitState.lockedUntil
            ? new Date(rateLimitState.lockedUntil).toISOString()
            : null,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })
    } catch (error) {
      await this.prisma.oneTimeCode.deleteMany({
        where: {
          id: resetCode.recordId,
        },
      })

      await this.auditLogService.record({
        actorUserId: user.id,
        event: 'auth.password-reset.delivery_failed',
        resource: 'password_reset',
        resourceId: resetCode.recordId,
        severity: AuditSeverity.ERROR,
        metadata: {
          email: user.email,
          reason: error instanceof Error ? error.message : 'unknown',
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })

      throw error
    }

    return {
      success: true,
      email: user.email,
      message: 'Enviamos um codigo de verificacao para redefinir sua senha.',
    }
  }

  async resetPassword(dto: ResetPasswordDto, context: RequestContext) {
    const normalizedEmail = normalizeEmail(dto.email)
    const rateLimitKey = this.authRateLimitService.buildPasswordResetCodeKey(
      normalizedEmail,
      context.ipAddress,
    )

    this.authRateLimitService.assertPasswordResetCodeAllowed(rateLimitKey)
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (!user || user.status !== UserStatus.ACTIVE) {
      this.authRateLimitService.recordPasswordResetCodeAttempt(rateLimitKey)
      throw new BadRequestException('Email invalido ou nao cadastrado.')
    }

    const resetCode = await this.prisma.oneTimeCode.findFirst({
      where: {
        userId: user.id,
        email: normalizedEmail,
        purpose: OneTimeCodePurpose.PASSWORD_RESET,
        codeHash: hashToken(dto.code),
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (!resetCode) {
      const rateLimitState = this.authRateLimitService.recordPasswordResetCodeAttempt(rateLimitKey)

      await this.auditLogService.record({
        actorUserId: user.id,
        event: 'auth.password-reset.code_failed',
        resource: 'password_reset',
        severity: AuditSeverity.WARN,
        metadata: {
          email: normalizedEmail,
          failedAttempts: rateLimitState.count,
          lockedUntil: rateLimitState.lockedUntil
            ? new Date(rateLimitState.lockedUntil).toISOString()
            : null,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })

      if (rateLimitState.lockedUntil) {
        const retryAfterSeconds = Math.ceil((rateLimitState.lockedUntil - Date.now()) / 1000)
        throw new HttpException(
          `Muitas tentativas de validar o codigo. Tente novamente em ${retryAfterSeconds} segundo(s).`,
          HttpStatus.TOO_MANY_REQUESTS,
        )
      }

      throw new BadRequestException('Codigo invalido ou expirado.')
    }

    const isSamePassword = await argon2.verify(user.passwordHash, dto.password)
    if (isSamePassword) {
      throw new BadRequestException('Escolha uma senha diferente da senha atual.')
    }

    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id })
    const now = new Date()

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          passwordHash,
          passwordChangedAt: now,
        },
      }),
      this.prisma.oneTimeCode.update({
        where: {
          id: resetCode.id,
        },
        data: {
          usedAt: now,
        },
      }),
      this.prisma.oneTimeCode.updateMany({
        where: {
          userId: user.id,
          purpose: OneTimeCodePurpose.PASSWORD_RESET,
          usedAt: null,
          id: {
            not: resetCode.id,
          },
        },
        data: {
          usedAt: now,
        },
      }),
      this.prisma.session.updateMany({
        where: {
          userId: user.id,
          revokedAt: null,
        },
        data: {
          revokedAt: now,
        },
      }),
    ])

    this.authRateLimitService.clear(rateLimitKey)

    await this.auditLogService.record({
      actorUserId: user.id,
      event: 'auth.password-reset.completed',
      resource: 'user',
      resourceId: user.id,
      metadata: {
        email: user.email,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    void this.sendPasswordChangedNotice(user, context, now)
    await this.demoAccessService.closeGrantsForUser(user.id, now)

    return {
      success: true,
      message: 'Senha redefinida com sucesso. Entre novamente para continuar.',
    }
  }

  async requestEmailVerification(dto: ForgotPasswordDto, context: RequestContext) {
    const normalizedEmail = normalizeEmail(dto.email)
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new BadRequestException('Email invalido ou nao cadastrado.')
    }

    if (user.emailVerifiedAt) {
      return {
        success: true,
        message: 'Este email ja foi confirmado. Agora voce pode entrar normalmente.',
      }
    }

    await this.sendEmailVerificationCode({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      context,
      trigger: 'manual',
    })

    return {
      success: true,
      email: user.email,
      message: 'Enviamos um novo codigo de confirmacao para o email cadastrado.',
    }
  }

  async verifyEmail(dto: VerifyEmailDto, context: RequestContext) {
    const normalizedEmail = normalizeEmail(dto.email)
    const rateLimitKey = this.authRateLimitService.buildEmailVerificationCodeKey(
      normalizedEmail,
      context.ipAddress,
    )

    this.authRateLimitService.assertEmailVerificationCodeAllowed(rateLimitKey)
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        cookiePreference: true,
      },
    })

    if (!user || user.status !== UserStatus.ACTIVE) {
      this.authRateLimitService.recordEmailVerificationCodeAttempt(rateLimitKey)
      throw new BadRequestException('Email invalido ou nao cadastrado.')
    }

    if (user.emailVerifiedAt) {
      this.authRateLimitService.clear(rateLimitKey)
      return {
        success: true,
        message: 'Email ja confirmado. Agora voce pode entrar normalmente.',
      }
    }

    const verificationCode = await this.prisma.oneTimeCode.findFirst({
      where: {
        userId: user.id,
        email: normalizedEmail,
        purpose: OneTimeCodePurpose.EMAIL_VERIFICATION,
        codeHash: hashToken(dto.code),
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (!verificationCode) {
      const rateLimitState = this.authRateLimitService.recordEmailVerificationCodeAttempt(rateLimitKey)

      await this.auditLogService.record({
        actorUserId: user.id,
        event: 'auth.email-verification.failed',
        resource: 'user',
        resourceId: user.id,
        severity: AuditSeverity.WARN,
        metadata: {
          email: normalizedEmail,
          failedAttempts: rateLimitState.count,
          lockedUntil: rateLimitState.lockedUntil
            ? new Date(rateLimitState.lockedUntil).toISOString()
            : null,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })

      if (rateLimitState.lockedUntil) {
        const retryAfterSeconds = Math.ceil((rateLimitState.lockedUntil - Date.now()) / 1000)
        throw new HttpException(
          `Muitas tentativas de validar o codigo. Tente novamente em ${retryAfterSeconds} segundo(s).`,
          HttpStatus.TOO_MANY_REQUESTS,
        )
      }

      throw new BadRequestException('Codigo invalido ou expirado.')
    }

    const now = new Date()
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerifiedAt: now,
        },
      }),
      this.prisma.oneTimeCode.update({
        where: { id: verificationCode.id },
        data: { usedAt: now },
      }),
      this.prisma.oneTimeCode.updateMany({
        where: {
          userId: user.id,
          purpose: OneTimeCodePurpose.EMAIL_VERIFICATION,
          usedAt: null,
          id: {
            not: verificationCode.id,
          },
        },
        data: {
          usedAt: now,
        },
      }),
    ])

    this.authRateLimitService.clear(rateLimitKey)

    await this.auditLogService.record({
      actorUserId: user.id,
      event: 'auth.email-verification.completed',
      resource: 'user',
      resourceId: user.id,
      metadata: {
        email: user.email,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return {
      success: true,
      message: 'Email confirmado com sucesso. Agora voce pode entrar no portal.',
    }
  }

  async logout(auth: AuthContext, response: Response, context: RequestContext) {
    await this.demoAccessService.closeGrantForSession(auth.sessionId)

    await this.prisma.session.updateMany({
      where: {
        id: auth.sessionId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    })

    response.clearCookie(this.getSessionCookieName(), this.getSessionCookieBaseOptions())
    response.clearCookie(this.getCsrfCookieName(), this.getCsrfCookieBaseOptions())

    await this.auditLogService.record({
      actorUserId: auth.userId,
      event: 'auth.logout.succeeded',
      resource: 'session',
      resourceId: auth.sessionId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return {
      success: true,
    }
  }

  async validateSessionToken(rawToken: string): Promise<AuthContext | null> {
    const tokenHash = hashToken(rawToken)
    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            cookiePreference: true,
          },
        },
      },
    })

    if (!session) {
      return null
    }

    if (session.revokedAt || session.expiresAt <= new Date() || session.user.status !== UserStatus.ACTIVE) {
      await this.demoAccessService.closeGrantForSession(session.id)
      return null
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() },
    })

    return toAuthUser(session.user, {
      sessionId: session.id,
      analytics: session.user.cookiePreference?.analytics ?? false,
      marketing: session.user.cookiePreference?.marketing ?? false,
      evaluationAccess: this.demoAccessService.buildEvaluationAccess(session.user.email, session.expiresAt),
    })
  }

  async getCurrentUser(auth: AuthContext, response: Response) {
    this.setCsrfCookie(response, auth.sessionId)

    return {
      user: auth,
    }
  }

  async updateProfile(auth: AuthContext, dto: UpdateProfileDto, context: RequestContext) {
    const user = await this.prisma.user.update({
      where: {
        id: auth.userId,
      },
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
      include: {
        cookiePreference: true,
      },
    })

    await this.auditLogService.record({
      actorUserId: auth.userId,
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

    return {
      user: toAuthUser(user, {
        sessionId: auth.sessionId,
        analytics: user.cookiePreference?.analytics ?? false,
        marketing: user.cookiePreference?.marketing ?? false,
        evaluationAccess: auth.evaluationAccess,
      }),
    }
  }

  private async createSession(
    user: {
      id: string
      email: string
    },
    context: RequestContext,
  ) {
    const token = randomBytes(32).toString('hex')
    const sessionTtlMs = this.getSessionMaxAgeMs()
    const demoReservation = await this.demoAccessService.reserveWindow({
      email: user.email,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      sessionTtlMs,
    })
    const expiresAt = demoReservation?.expiresAt ?? new Date(Date.now() + sessionTtlMs)

    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
    })

    if (demoReservation) {
      await this.demoAccessService.attachGrant({
        userId: user.id,
        sessionId: session.id,
        reservation: demoReservation,
      })
    }

    return {
      token,
      expiresAt,
      sessionId: session.id,
      evaluationAccess: this.demoAccessService.buildEvaluationAccess(user.email, expiresAt),
    }
  }

  private setSessionCookies(response: Response, token: string, sessionId: string, expiresAt: Date) {
    this.setSessionCookie(response, token, expiresAt)
    this.setCsrfCookie(response, sessionId, expiresAt)
  }

  private setSessionCookie(response: Response, token: string, expiresAt: Date) {
    response.cookie(this.getSessionCookieName(), token, {
      ...this.getSessionCookieBaseOptions(),
      expires: expiresAt,
    })
  }

  private setCsrfCookie(response: Response, sessionId: string, expiresAt?: Date) {
    response.cookie(this.getCsrfCookieName(), this.buildCsrfToken(sessionId), {
      ...this.getCsrfCookieBaseOptions(),
      ...(expiresAt ? { expires: expiresAt } : {}),
    })
  }

  private getSessionCookieBaseOptions() {
    return {
      httpOnly: true,
      secure: this.isProduction(),
      sameSite: 'lax' as const,
      path: '/',
    }
  }

  private getCsrfCookieBaseOptions() {
    return {
      httpOnly: false,
      secure: this.isProduction(),
      sameSite: 'lax' as const,
      path: '/',
    }
  }

  private getSessionMaxAgeMs() {
    const ttlHours = Number(this.configService.get<string>('SESSION_TTL_HOURS') ?? 24)
    return Math.max(ttlHours, 1) * 60 * 60 * 1000
  }

  private getConsentVersion() {
    return this.configService.get<string>('CONSENT_VERSION') ?? '2026.03'
  }

  private getPasswordResetTtlMinutes() {
    const ttlMinutes = Number(this.configService.get<string>('PASSWORD_RESET_TTL_MINUTES') ?? 30)
    return Math.max(ttlMinutes, 5)
  }

  private getEmailVerificationTtlMinutes() {
    const ttlMinutes = Number(this.configService.get<string>('EMAIL_VERIFICATION_TTL_MINUTES') ?? 15)
    return Math.max(ttlMinutes, 5)
  }

  private getCsrfSecret() {
    return (
      this.configService.get<string>('CSRF_SECRET') ??
      this.configService.get<string>('COOKIE_SECRET') ??
      'change-me'
    )
  }

  private isProduction() {
    return this.configService.get<string>('NODE_ENV') === 'production'
  }

  private async handleFailedLogin(params: {
    actorUserId?: string
    email: string
    reason: string
    rateLimitKey: string
    context: RequestContext
  }): Promise<never> {
    const rateLimitState = this.authRateLimitService.recordFailure(params.rateLimitKey)

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

    if (rateLimitState.lockedUntil) {
      const retryAfterSeconds = Math.ceil((rateLimitState.lockedUntil - Date.now()) / 1000)
      throw new HttpException(
        `Muitas tentativas de acesso. Tente novamente em ${retryAfterSeconds} segundo(s).`,
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }

    throw new UnauthorizedException('Credenciais invalidas.')
  }

  private async handleUnverifiedLogin(
    user: {
      id: string
      email: string
      fullName: string
    },
    context: RequestContext,
  ) {
    try {
      await this.sendEmailVerificationCode({
        userId: user.id,
        email: user.email,
        fullName: user.fullName,
        context,
        trigger: 'login',
      })

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

  private async sendEmailVerificationCode(params: {
    userId: string
    email: string
    fullName: string
    context: RequestContext
    trigger: 'register' | 'login' | 'manual'
    bypassRateLimit?: boolean
  }) {
    const rateLimitKey = this.authRateLimitService.buildEmailVerificationKey(
      params.email,
      params.context.ipAddress,
    )

    if (!params.bypassRateLimit) {
      this.authRateLimitService.assertEmailVerificationAllowed(rateLimitKey)
    }

    const rateLimitState = params.bypassRateLimit
      ? null
      : this.authRateLimitService.recordEmailVerificationAttempt(rateLimitKey)

    const verificationCode = await this.issueOneTimeCode({
      userId: params.userId,
      email: params.email,
      purpose: OneTimeCodePurpose.EMAIL_VERIFICATION,
      ttlMinutes: this.getEmailVerificationTtlMinutes(),
      context: params.context,
    })

    try {
      const delivery = await this.mailerService.sendEmailVerificationEmail({
        to: params.email,
        fullName: params.fullName,
        code: verificationCode.code,
        expiresInMinutes: this.getEmailVerificationTtlMinutes(),
      })

      await this.auditLogService.record({
        actorUserId: params.userId,
        event: 'auth.email-verification.requested',
        resource: 'user',
        resourceId: params.userId,
        metadata: {
          email: params.email,
          trigger: params.trigger,
          deliveryMode: delivery.mode,
          attempts: rateLimitState?.count ?? null,
          lockedUntil: rateLimitState?.lockedUntil
            ? new Date(rateLimitState.lockedUntil).toISOString()
            : null,
        },
        ipAddress: params.context.ipAddress,
        userAgent: params.context.userAgent,
      })
    } catch (error) {
      await this.prisma.oneTimeCode.deleteMany({
        where: {
          id: verificationCode.recordId,
        },
      })

      await this.auditLogService.record({
        actorUserId: params.userId,
        event: 'auth.email-verification.delivery_failed',
        resource: 'user',
        resourceId: params.userId,
        severity: AuditSeverity.ERROR,
        metadata: {
          email: params.email,
          trigger: params.trigger,
          reason: error instanceof Error ? error.message : 'unknown',
        },
        ipAddress: params.context.ipAddress,
        userAgent: params.context.userAgent,
      })

      throw error
    }
  }

  private async issueOneTimeCode(params: {
    userId: string
    email: string
    purpose: OneTimeCodePurpose
    ttlMinutes: number
    context: RequestContext
  }) {
    const code = generateNumericCode()
    const expiresAt = new Date(Date.now() + params.ttlMinutes * 60 * 1000)

    await this.prisma.oneTimeCode.updateMany({
      where: {
        userId: params.userId,
        purpose: params.purpose,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    })

    const record = await this.prisma.oneTimeCode.create({
      data: {
        userId: params.userId,
        email: params.email,
        purpose: params.purpose,
        codeHash: hashToken(code),
        expiresAt,
        ipAddress: params.context.ipAddress,
        userAgent: params.context.userAgent,
      },
    })

    return {
      recordId: record.id,
      code,
      expiresAt,
    }
  }

  private async sendPasswordChangedNotice(
    user: {
      id: string
      email: string
      fullName: string
    },
    context: RequestContext,
    changedAt: Date,
  ) {
    try {
      const delivery = await this.mailerService.sendPasswordChangedEmail({
        to: user.email,
        fullName: user.fullName,
        changedAt,
        ipAddress: context.ipAddress,
      })

      await this.auditLogService.record({
        actorUserId: user.id,
        event: 'auth.password-reset.notification_sent',
        resource: 'user',
        resourceId: user.id,
        metadata: {
          email: user.email,
          deliveryMode: delivery.mode,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })
    } catch (error) {
      this.logger.warn(
        `Falha ao enviar notificacao de senha alterada para ${user.email}: ${error instanceof Error ? error.message : 'unknown'}`,
      )
    }
  }

  private async sendLoginAlertIfEnabled(
    user: {
      id: string
      email: string
      fullName: string
    },
    context: RequestContext,
  ) {
    if (!parseBoolean(this.configService.get<string>('LOGIN_ALERT_EMAILS_ENABLED'))) {
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
        metadata: {
          email: user.email,
          deliveryMode: delivery.mode,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })
    } catch (error) {
      this.logger.warn(
        `Falha ao enviar alerta de login para ${user.email}: ${error instanceof Error ? error.message : 'unknown'}`,
      )
    }
  }
}

const publicUserSelect = {
  id: true,
  fullName: true,
  companyName: true,
  email: true,
  emailVerifiedAt: true,
  preferredCurrency: true,
  status: true,
} as const

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function hashToken(rawToken: string) {
  return createHash('sha256').update(rawToken).digest('hex')
}

function toAuthUser(
  user: {
    id: string
    fullName: string
    companyName: string | null
    email: string
    emailVerifiedAt?: Date | null
    preferredCurrency: CurrencyCode
    status: UserStatus
  },
  options: {
    sessionId?: string
    analytics: boolean
    marketing: boolean
    evaluationAccess: AuthContext['evaluationAccess']
  },
): AuthContext {
  return {
    userId: user.id,
    sessionId: options.sessionId ?? '',
    email: user.email,
    fullName: user.fullName,
    companyName: user.companyName,
    emailVerified: Boolean((user as { emailVerifiedAt?: Date | null }).emailVerifiedAt),
    preferredCurrency: user.preferredCurrency,
    status: user.status,
    evaluationAccess: options.evaluationAccess,
    cookiePreferences: {
      necessary: true,
      analytics: options.analytics,
      marketing: options.marketing,
    },
  }
}

function generateNumericCode() {
  return randomInt(100000, 1000000).toString()
}

function parseBoolean(value: string | undefined) {
  if (value == null) {
    return false
  }

  return value === 'true'
}

function isServiceUnavailable(error: unknown) {
  return error instanceof HttpException && error.getStatus() === HttpStatus.SERVICE_UNAVAILABLE
}
