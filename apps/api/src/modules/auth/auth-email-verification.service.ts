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
  generateNumericCode,
  hashToken,
  isServiceUnavailable,
  isStrictlyLocalRequestContext,
  normalizeEmail,
  parseBoolean,
} from './auth-shared.util'

export type EmailVerificationDeliveryResult = {
  deliveryMode: 'email' | 'preview'
  previewCode?: string
  previewExpiresAt?: Date
}

type RateLimitState = Awaited<ReturnType<AuthRateLimitService['recordFailure']>>

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
    const normalizedEmail = normalizeEmail(dto.email)
    const rateLimitKeys = [
      this.authRateLimitService.buildEmailVerificationKey(normalizedEmail, context.ipAddress),
      this.authRateLimitService.buildEmailVerificationEmailKey(normalizedEmail),
    ]

    await this.assertAllowedForKeys(rateLimitKeys, (key) =>
      this.authRateLimitService.assertEmailVerificationAllowed(key),
    )

    const rateLimitState = this.pickMostRestrictiveRateLimitState(
      await this.recordAttemptsForKeys(rateLimitKeys, (key) =>
        this.authRateLimitService.recordEmailVerificationAttempt(key),
      ),
    )

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (!user || user.status !== 'ACTIVE') {
      await this.auditLogService.record({
        event: 'auth.email-verification.requested',
        resource: 'user',
        severity: AuditSeverity.WARN,
        metadata: {
          email: normalizedEmail,
          userFound: false,
          attempts: rateLimitState.count,
          lockedUntil: rateLimitState.lockedUntil ? new Date(rateLimitState.lockedUntil).toISOString() : null,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })

      return { success: true, message: genericMessage }
    }

    if (user.emailVerifiedAt) {
      await this.auditLogService.record({
        actorUserId: user.id,
        event: 'auth.email-verification.requested',
        resource: 'user',
        resourceId: user.id,
        metadata: {
          email: user.email,
          alreadyVerified: true,
          attempts: rateLimitState.count,
          lockedUntil: rateLimitState.lockedUntil ? new Date(rateLimitState.lockedUntil).toISOString() : null,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
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
    const normalizedEmail = normalizeEmail(dto.email)
    const rateLimitKeys = [
      this.authRateLimitService.buildEmailVerificationCodeKey(normalizedEmail, context.ipAddress),
      this.authRateLimitService.buildEmailVerificationCodeEmailKey(normalizedEmail),
    ]

    await this.assertAllowedForKeys(rateLimitKeys, (key) =>
      this.authRateLimitService.assertEmailVerificationCodeAllowed(key),
    )

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { cookiePreference: true },
    })

    if (!user || user.status !== 'ACTIVE') {
      await this.recordAttemptsForKeys(rateLimitKeys, (key) =>
        this.authRateLimitService.recordEmailVerificationCodeAttempt(key),
      )
      throw new BadRequestException('Email invalido ou nao cadastrado.')
    }

    if (user.emailVerifiedAt) {
      await this.clearRateLimitKeys(rateLimitKeys)
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
        codeHash: hashToken(dto.code.trim()),
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!verificationCode) {
      const rateLimitState = this.pickMostRestrictiveRateLimitState(
        await this.recordAttemptsForKeys(rateLimitKeys, (key) =>
          this.authRateLimitService.recordEmailVerificationCodeAttempt(key),
        ),
      )

      await this.auditLogService.record({
        actorUserId: user.id,
        event: 'auth.email-verification.failed',
        resource: 'user',
        resourceId: user.id,
        severity: AuditSeverity.WARN,
        metadata: {
          email: normalizedEmail,
          failedAttempts: rateLimitState.count,
          lockedUntil: rateLimitState.lockedUntil ? new Date(rateLimitState.lockedUntil).toISOString() : null,
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
        data: { emailVerifiedAt: now },
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
          id: { not: verificationCode.id },
        },
        data: { usedAt: now },
      }),
    ])

    await this.clearRateLimitKeys(rateLimitKeys)

    await this.auditLogService.record({
      actorUserId: user.id,
      event: 'auth.email-verification.completed',
      resource: 'user',
      resourceId: user.id,
      metadata: { email: user.email },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
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
      await this.assertAllowedForKeys(rateLimitKeys, (key) =>
        this.authRateLimitService.assertEmailVerificationAllowed(key),
      )
    }

    const rateLimitState = params.bypassRateLimit
      ? null
      : this.pickMostRestrictiveRateLimitState(
          await this.recordAttemptsForKeys(rateLimitKeys, (key) =>
            this.authRateLimitService.recordEmailVerificationAttempt(key),
          ),
        )

    const verificationCode = await this.issueOneTimeCode({
      userId: params.userId,
      email: params.email,
      purpose: OneTimeCodePurpose.EMAIL_VERIFICATION,
      ttlMinutes: this.getEmailVerificationTtlMinutes(),
      context: params.context,
    })

    return this.deliverEmailVerificationCode(params, verificationCode, rateLimitState)
  }

  private async deliverEmailVerificationCode(
    params: { userId: string; email: string; fullName: string; trigger: string; context: RequestContext },
    verificationCode: { code: string; recordId: string; expiresAt: Date },
    rateLimitState: { count: number; lockedUntil: number | null } | null,
  ): Promise<EmailVerificationDeliveryResult> {
    const rateLimitMeta = {
      attempts: rateLimitState?.count ?? null,
      lockedUntil: rateLimitState?.lockedUntil ? new Date(rateLimitState.lockedUntil).toISOString() : null,
    }

    try {
      const delivery = await this.mailerService.sendEmailVerificationEmail({
        to: params.email,
        fullName: params.fullName,
        code: verificationCode.code,
        expiresInMinutes: this.getEmailVerificationTtlMinutes(),
      })

      if (delivery.mode === 'log' && this.shouldUsePortfolioEmailFallback(params.context)) {
        return this.handleVerificationPreviewFallback(params, verificationCode, {
          reason: 'log_delivery_mode',
          deliveryMode: delivery.mode,
          ...rateLimitMeta,
        })
      }

      await this.auditLogService.record({
        actorUserId: params.userId,
        event: 'auth.email-verification.requested',
        resource: 'user',
        resourceId: params.userId,
        metadata: {
          email: params.email,
          trigger: params.trigger,
          deliveryMode: delivery.mode,
          ...rateLimitMeta,
        },
        ipAddress: params.context.ipAddress,
        userAgent: params.context.userAgent,
      })

      return { deliveryMode: 'email' }
    } catch (error) {
      if (isServiceUnavailable(error) && this.shouldUsePortfolioEmailFallback(params.context)) {
        this.logger.warn(
          `Entrega de email indisponivel para ${params.email}. Codigo de apoio liberado no modo portfolio.`,
        )
        return this.handleVerificationPreviewFallback(params, verificationCode, {
          reason: error instanceof Error ? error.message : 'unknown',
          ...rateLimitMeta,
        })
      }

      await this.prisma.oneTimeCode.deleteMany({ where: { id: verificationCode.recordId } })

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

  private async handleVerificationPreviewFallback(
    params: { userId: string; email: string; trigger: string; context: RequestContext },
    verificationCode: { code: string; expiresAt: Date },
    metadata: Record<string, unknown>,
  ): Promise<EmailVerificationDeliveryResult> {
    await this.auditLogService.record({
      actorUserId: params.userId,
      event: 'auth.email-verification.preview_enabled',
      resource: 'user',
      resourceId: params.userId,
      severity: AuditSeverity.WARN,
      metadata: {
        email: params.email,
        trigger: params.trigger,
        ...metadata,
      },
      ipAddress: params.context.ipAddress,
      userAgent: params.context.userAgent,
    })

    return {
      deliveryMode: 'preview',
      previewCode: verificationCode.code,
      previewExpiresAt: verificationCode.expiresAt,
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
      data: { usedAt: new Date() },
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

    return { recordId: record.id, code, expiresAt }
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
