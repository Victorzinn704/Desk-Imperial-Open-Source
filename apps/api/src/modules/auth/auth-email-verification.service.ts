import { BadRequestException, HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AuditSeverity, OneTimeCodePurpose } from '@prisma/client'
import type { RequestContext } from '../../common/utils/request-context.util'
import { PrismaService } from '../../database/prisma.service'
import { MailerService } from '../mailer/mailer.service'
import { AuditLogService } from '../monitoring/audit-log.service'
import { AuthRateLimitService } from './auth-rate-limit.service'
import type { ForgotPasswordDto } from './dto/forgot-password.dto'
import type { VerifyEmailDto } from './dto/verify-email.dto'
import {
  hashToken,
  isStrictlyLocalRequestContext,
  normalizeAuthEmail,
  normalizeOneTimeCode,
  parseBoolean,
} from './auth-shared.util'
import {
  deliverEmailVerificationCode,
  type EmailVerificationDeliveryResult,
} from './auth-email-verification-delivery.utils'
import { issueOneTimeCode } from './auth-one-time-code.utils'
import {
  assertAllowedForKeys,
  buildOptionalRateLimitMetadata,
  buildRateLimitMetadata,
  clearRateLimitKeys,
  pickMostRestrictiveRateLimitState,
  recordAttemptsForKeys,
} from './auth-login-rate-limit.utils'

@Injectable()
export class AuthEmailVerificationService {
  private readonly logger = new Logger(AuthEmailVerificationService.name)

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(MailerService) private readonly mailerService: MailerService,
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService,
    @Inject(AuthRateLimitService) private readonly authRateLimitService: AuthRateLimitService,
  ) {}

  async requestEmailVerification(dto: ForgotPasswordDto, context: RequestContext) {
    const genericMessage =
      'Se o email estiver cadastrado e pendente de confirmacao, enviaremos um novo codigo em instantes.'
    const normalizedEmail = normalizeAuthEmail(dto.email)
    const rateLimitKeys = [
      this.authRateLimitService.buildEmailVerificationKey(normalizedEmail, context.ipAddress),
      this.authRateLimitService.buildEmailVerificationEmailKey(normalizedEmail),
    ]

    await assertAllowedForKeys(rateLimitKeys, (key) => this.authRateLimitService.assertEmailVerificationAllowed(key))

    const rateLimitState = pickMostRestrictiveRateLimitState(
      await recordAttemptsForKeys(rateLimitKeys, (key) =>
        this.authRateLimitService.recordEmailVerificationAttempt(key),
      ),
    )

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (!user || user.status !== 'ACTIVE') {
      await this.auditEmailVerificationRequest({
        context,
        email: normalizedEmail,
        metadata: { userFound: false },
        rateLimitState,
        severity: AuditSeverity.WARN,
      })
      return { success: true, message: genericMessage }
    }

    if (user.emailVerifiedAt) {
      await this.auditEmailVerificationRequest({
        actorUserId: user.id,
        context,
        email: user.email,
        metadata: { alreadyVerified: true },
        rateLimitState,
        resourceId: user.id,
      })
      return { success: true, message: genericMessage }
    }

    await this.sendEmailVerificationCode({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      context,
      trigger: 'manual',
      bypassRateLimit: true,
    })

    return { success: true, message: genericMessage }
  }

  async verifyEmail(dto: VerifyEmailDto, context: RequestContext) {
    const normalizedEmail = normalizeAuthEmail(dto.email)
    const normalizedCode = normalizeOneTimeCode(dto.code)
    const rateLimitKeys = [
      this.authRateLimitService.buildEmailVerificationCodeKey(normalizedEmail, context.ipAddress),
      this.authRateLimitService.buildEmailVerificationCodeEmailKey(normalizedEmail),
    ]

    await assertAllowedForKeys(rateLimitKeys, (key) =>
      this.authRateLimitService.assertEmailVerificationCodeAllowed(key),
    )

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { cookiePreference: true },
    })

    if (!user || user.status !== 'ACTIVE') {
      return this.rejectUnknownEmailVerificationUser(rateLimitKeys)
    }

    if (user.emailVerifiedAt) {
      return this.confirmAlreadyVerifiedEmail(rateLimitKeys)
    }

    const verificationCode = await this.prisma.oneTimeCode.findFirst({
      where: {
        userId: user.id,
        email: normalizedEmail,
        purpose: OneTimeCodePurpose.EMAIL_VERIFICATION,
        codeHash: hashToken(normalizedCode),
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!verificationCode) {
      return this.rejectInvalidEmailVerificationCode({ context, normalizedEmail, rateLimitKeys, user })
    }

    return this.completeEmailVerification({ context, rateLimitKeys, user, verificationCode })
  }

  private async auditEmailVerificationRequest(params: {
    actorUserId?: string
    context: RequestContext
    email: string
    metadata: Record<string, unknown>
    rateLimitState: { count: number; lockedUntil: number | null }
    resourceId?: string
    severity?: AuditSeverity
  }) {
    await this.auditLogService.record({
      ...(params.actorUserId ? { actorUserId: params.actorUserId } : {}),
      event: 'auth.email-verification.requested',
      resource: 'user',
      ...(params.resourceId ? { resourceId: params.resourceId } : {}),
      ...(params.severity ? { severity: params.severity } : {}),
      metadata: {
        email: params.email,
        ...params.metadata,
        ...buildRateLimitMetadata(params.rateLimitState),
      },
      ipAddress: params.context.ipAddress,
      userAgent: params.context.userAgent,
    })
  }

  private async rejectUnknownEmailVerificationUser(rateLimitKeys: string[]): Promise<never> {
    await recordAttemptsForKeys(rateLimitKeys, (key) =>
      this.authRateLimitService.recordEmailVerificationCodeAttempt(key),
    )
    throw new BadRequestException('Email invalido ou nao cadastrado.')
  }

  private async confirmAlreadyVerifiedEmail(rateLimitKeys: string[]) {
    await clearRateLimitKeys(rateLimitKeys, this.authRateLimitService)
    return {
      success: true,
      message: 'Email ja confirmado. Agora voce pode entrar normalmente.',
    }
  }

  private async rejectInvalidEmailVerificationCode(params: {
    context: RequestContext
    normalizedEmail: string
    rateLimitKeys: string[]
    user: { id: string }
  }): Promise<never> {
    const rateLimitState = pickMostRestrictiveRateLimitState(
      await recordAttemptsForKeys(params.rateLimitKeys, (key) =>
        this.authRateLimitService.recordEmailVerificationCodeAttempt(key),
      ),
    )

    await this.auditLogService.record({
      actorUserId: params.user.id,
      event: 'auth.email-verification.failed',
      resource: 'user',
      resourceId: params.user.id,
      severity: AuditSeverity.WARN,
      metadata: {
        email: params.normalizedEmail,
        failedAttempts: rateLimitState.count,
        lockedUntil: rateLimitState.lockedUntil ? new Date(rateLimitState.lockedUntil).toISOString() : null,
      },
      ipAddress: params.context.ipAddress,
      userAgent: params.context.userAgent,
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

  private async completeEmailVerification(params: {
    context: RequestContext
    rateLimitKeys: string[]
    user: { id: string; email: string }
    verificationCode: { id: string }
  }) {
    const now = new Date()
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: params.user.id },
        data: { emailVerifiedAt: now },
      }),
      this.prisma.oneTimeCode.update({
        where: { id: params.verificationCode.id },
        data: { usedAt: now },
      }),
      this.prisma.oneTimeCode.updateMany({
        where: {
          userId: params.user.id,
          purpose: OneTimeCodePurpose.EMAIL_VERIFICATION,
          usedAt: null,
          id: { not: params.verificationCode.id },
        },
        data: { usedAt: now },
      }),
    ])

    await clearRateLimitKeys(params.rateLimitKeys, this.authRateLimitService)

    await this.auditLogService.record({
      actorUserId: params.user.id,
      event: 'auth.email-verification.completed',
      resource: 'user',
      resourceId: params.user.id,
      metadata: { email: params.user.email },
      ipAddress: params.context.ipAddress,
      userAgent: params.context.userAgent,
    })

    return {
      success: true,
      message: 'Email confirmado com sucesso. Agora voce pode entrar no portal.',
    }
  }

  async sendEmailVerificationCode(params: {
    userId: string
    email: string
    fullName: string
    context: RequestContext
    trigger: 'register' | 'login' | 'manual'
    bypassRateLimit?: boolean
  }): Promise<EmailVerificationDeliveryResult> {
    const rateLimitKeys = [
      this.authRateLimitService.buildEmailVerificationKey(params.email, params.context.ipAddress),
      this.authRateLimitService.buildEmailVerificationEmailKey(params.email),
    ]

    if (!params.bypassRateLimit) {
      await assertAllowedForKeys(rateLimitKeys, (key) => this.authRateLimitService.assertEmailVerificationAllowed(key))
    }

    const rateLimitState = params.bypassRateLimit
      ? null
      : pickMostRestrictiveRateLimitState(
          await recordAttemptsForKeys(rateLimitKeys, (key) =>
            this.authRateLimitService.recordEmailVerificationAttempt(key),
          ),
        )

    const verificationCode = await issueOneTimeCode(this.prisma, {
      userId: params.userId,
      email: params.email,
      purpose: OneTimeCodePurpose.EMAIL_VERIFICATION,
      ttlMinutes: this.getEmailVerificationTtlMinutes(),
      context: params.context,
    })

    return deliverEmailVerificationCode({
      dependencies: {
        auditLogService: this.auditLogService,
        logger: this.logger,
        mailerService: this.mailerService,
        prisma: this.prisma,
      },
      params,
      verificationCode,
      rateLimitMeta: buildOptionalRateLimitMetadata(rateLimitState),
      ttlMinutes: this.getEmailVerificationTtlMinutes(),
      portfolioFallbackEnabled: this.shouldUsePortfolioEmailFallback(params.context),
    })
  }

  private getEmailVerificationTtlMinutes() {
    const ttlMinutes = Number(this.configService.get<string>('EMAIL_VERIFICATION_TTL_MINUTES') ?? 15)
    return Math.max(ttlMinutes, 5)
  }

  private shouldUsePortfolioEmailFallback(context: RequestContext) {
    return (
      !this.isProduction() &&
      parseBoolean(this.configService.get<string>('PORTFOLIO_EMAIL_FALLBACK') ?? 'true') &&
      isStrictlyLocalRequestContext(context)
    )
  }

  private isProduction() {
    return this.configService.get<string>('NODE_ENV') === 'production'
  }
}
