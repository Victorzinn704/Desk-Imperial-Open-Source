import { BadRequestException, HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AuditSeverity, OneTimeCodePurpose } from '@prisma/client'
import * as argon2 from 'argon2'
import type { RequestContext } from '../../common/utils/request-context.util'
import { PrismaService } from '../../database/prisma.service'
import { MailerService } from '../mailer/mailer.service'
import { AuditLogService } from '../monitoring/audit-log.service'
import { AuthRateLimitService } from './auth-rate-limit.service'
import type { ForgotPasswordDto } from './dto/forgot-password.dto'
import type { ResetPasswordDto } from './dto/reset-password.dto'
import {
  generateNumericCode,
  hashToken,
  isServiceUnavailable,
  isStrictlyLocalRequestContext,
  normalizeEmail,
  parseBoolean,
} from './auth-shared.util'
import { AuthSessionService } from './auth-session.service'
import { DemoAccessService } from './demo-access.service'

type RateLimitState = Awaited<ReturnType<AuthRateLimitService['recordFailure']>>

@Injectable()
export class AuthPasswordService {
  private readonly logger = new Logger(AuthPasswordService.name)

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(MailerService) private readonly mailerService: MailerService,
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService,
    @Inject(AuthRateLimitService) private readonly authRateLimitService: AuthRateLimitService,
    @Inject(AuthSessionService) private readonly sessionService: AuthSessionService,
    @Inject(DemoAccessService) private readonly demoAccessService: DemoAccessService,
  ) {}

  async requestPasswordReset(dto: ForgotPasswordDto, context: RequestContext) {
    const genericMessage = 'Se o email estiver cadastrado e ativo, enviaremos um codigo de redefinicao em instantes.'
    const normalizedEmail = normalizeEmail(dto.email)
    const rateLimitKeys = [
      this.authRateLimitService.buildPasswordResetKey(normalizedEmail, context.ipAddress),
      this.authRateLimitService.buildPasswordResetEmailKey(normalizedEmail),
    ]

    await this.assertAllowedForKeys(rateLimitKeys, (key) => this.authRateLimitService.assertPasswordResetAllowed(key))
    const rateLimitState = this.pickMostRestrictiveRateLimitState(
      await this.recordAttemptsForKeys(rateLimitKeys, (key) =>
        this.authRateLimitService.recordPasswordResetAttempt(key),
      ),
    )

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (!user || user.status !== 'ACTIVE') {
      return this.auditAndReturnGenericPasswordReset({
        actorUserId: undefined,
        email: normalizedEmail,
        extraMetadata: { userFound: false },
        rateLimitState,
        context,
        genericMessage,
      })
    }

    if (!user.emailVerifiedAt) {
      return this.auditAndReturnGenericPasswordReset({
        actorUserId: user.id,
        email: user.email,
        extraMetadata: { userFound: true, emailVerified: false },
        rateLimitState,
        context,
        genericMessage,
      })
    }

    const resetCode = await this.issueOneTimeCode({
      userId: user.id,
      email: user.email,
      purpose: OneTimeCodePurpose.PASSWORD_RESET,
      ttlMinutes: this.getPasswordResetTtlMinutes(),
      context,
    })

    await this.deliverPasswordResetEmail(user, resetCode, rateLimitState, context)

    return { success: true, message: genericMessage }
  }

  async resetPassword(dto: ResetPasswordDto, context: RequestContext) {
    const normalizedEmail = normalizeEmail(dto.email)
    const rateLimitKeys = [
      this.authRateLimitService.buildPasswordResetCodeKey(normalizedEmail, context.ipAddress),
      this.authRateLimitService.buildPasswordResetCodeEmailKey(normalizedEmail),
    ]

    await this.assertAllowedForKeys(rateLimitKeys, (key) =>
      this.authRateLimitService.assertPasswordResetCodeAllowed(key),
    )

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (!user || user.status !== 'ACTIVE') {
      await this.recordAttemptsForKeys(rateLimitKeys, (key) =>
        this.authRateLimitService.recordPasswordResetCodeAttempt(key),
      )
      throw new BadRequestException('Email invalido ou nao cadastrado.')
    }

    const resetCode = await this.prisma.oneTimeCode.findFirst({
      where: {
        userId: user.id,
        email: normalizedEmail,
        purpose: OneTimeCodePurpose.PASSWORD_RESET,
        codeHash: hashToken(dto.code.trim()),
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!resetCode) {
      const rateLimitState = this.pickMostRestrictiveRateLimitState(
        await this.recordAttemptsForKeys(rateLimitKeys, (key) =>
          this.authRateLimitService.recordPasswordResetCodeAttempt(key),
        ),
      )

      await this.auditLogService.record({
        actorUserId: user.id,
        event: 'auth.password-reset.code_failed',
        resource: 'password_reset',
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

    const isSamePassword = await argon2.verify(user.passwordHash, dto.password)
    if (isSamePassword) {
      throw new BadRequestException('Escolha uma senha diferente da senha atual.')
    }

    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id })
    const now = new Date()
    const revokedSessions = await this.prisma.session.findMany({
      where: { userId: user.id, revokedAt: null },
      select: { id: true, tokenHash: true },
    })

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, passwordChangedAt: now },
      }),
      this.prisma.oneTimeCode.update({
        where: { id: resetCode.id },
        data: { usedAt: now },
      }),
      this.prisma.oneTimeCode.updateMany({
        where: {
          userId: user.id,
          purpose: OneTimeCodePurpose.PASSWORD_RESET,
          usedAt: null,
          id: { not: resetCode.id },
        },
        data: { usedAt: now },
      }),
      this.prisma.session.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: now },
      }),
    ])

    await Promise.all(
      revokedSessions.map((session) => Promise.all([this.sessionService.forgetSessionCache(session.id)])),
    )

    await this.clearRateLimitKeys(rateLimitKeys)

    await this.auditLogService.record({
      actorUserId: user.id,
      event: 'auth.password-reset.completed',
      resource: 'user',
      resourceId: user.id,
      metadata: { email: user.email },
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

  private async auditAndReturnGenericPasswordReset(params: {
    actorUserId: string | undefined
    email: string
    extraMetadata: Record<string, unknown>
    rateLimitState: { count: number; lockedUntil: number | null }
    context: RequestContext
    genericMessage: string
  }) {
    await this.auditLogService.record({
      ...(params.actorUserId ? { actorUserId: params.actorUserId } : {}),
      event: 'auth.password-reset.requested',
      resource: 'password_reset',
      severity: AuditSeverity.WARN,
      metadata: {
        email: params.email,
        ...params.extraMetadata,
        attempts: params.rateLimitState.count,
        lockedUntil: params.rateLimitState.lockedUntil
          ? new Date(params.rateLimitState.lockedUntil).toISOString()
          : null,
      },
      ipAddress: params.context.ipAddress,
      userAgent: params.context.userAgent,
    })

    return { success: true, message: params.genericMessage }
  }

  private async deliverPasswordResetEmail(
    user: { id: string; email: string; fullName: string },
    resetCode: { code: string; recordId: string },
    rateLimitState: { count: number; lockedUntil: number | null },
    context: RequestContext,
  ) {
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
          lockedUntil: rateLimitState.lockedUntil ? new Date(rateLimitState.lockedUntil).toISOString() : null,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })
    } catch (error) {
      if (isServiceUnavailable(error) && this.shouldUsePortfolioEmailFallback(context)) {
        await this.auditLogService.record({
          actorUserId: user.id,
          event: 'auth.password-reset.preview_enabled',
          resource: 'password_reset',
          resourceId: resetCode.recordId,
          severity: AuditSeverity.WARN,
          metadata: {
            email: user.email,
            reason: error instanceof Error ? error.message : 'unknown',
            attempts: rateLimitState.count,
            lockedUntil: rateLimitState.lockedUntil ? new Date(rateLimitState.lockedUntil).toISOString() : null,
          },
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        })

        this.logger.warn(
          `Entrega de redefinicao indisponivel para ${user.email}. O envio sera reprocessado no modo local.`,
        )
        return
      }

      await this.prisma.oneTimeCode.deleteMany({ where: { id: resetCode.recordId } })

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
  }

  private async sendPasswordChangedNotice(
    user: { id: string; email: string; fullName: string },
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
      where: { userId: params.userId, purpose: params.purpose, usedAt: null },
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

  getPasswordResetTtlMinutes() {
    const ttlMinutes = Number(this.configService.get<string>('PASSWORD_RESET_TTL_MINUTES') ?? 30)
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
