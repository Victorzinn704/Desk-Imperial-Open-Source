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
  hashToken,
  isStrictlyLocalRequestContext,
  normalizeAuthEmail,
  normalizeOneTimeCode,
  parseBoolean,
} from './auth-shared.util'
import { AuthSessionService } from './auth-session.service'
import { DemoAccessService } from './demo-access.service'
import { deliverPasswordResetEmail, sendPasswordChangedNotice } from './auth-password-delivery.utils'
import { issueOneTimeCode } from './auth-one-time-code.utils'
import {
  assertAllowedForKeys,
  buildRateLimitMetadata,
  clearRateLimitKeys,
  pickMostRestrictiveRateLimitState,
  recordAttemptsForKeys,
} from './auth-login-rate-limit.utils'

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
    const normalizedEmail = normalizeAuthEmail(dto.email)
    const rateLimitKeys = [
      this.authRateLimitService.buildPasswordResetKey(normalizedEmail, context.ipAddress),
      this.authRateLimitService.buildPasswordResetEmailKey(normalizedEmail),
    ]

    await assertAllowedForKeys(rateLimitKeys, (key) => this.authRateLimitService.assertPasswordResetAllowed(key))
    const rateLimitState = pickMostRestrictiveRateLimitState(
      await recordAttemptsForKeys(rateLimitKeys, (key) => this.authRateLimitService.recordPasswordResetAttempt(key)),
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

    await this.issueAndDeliverPasswordReset({ context, rateLimitState, user })
    return { success: true, message: genericMessage }
  }

  async resetPassword(dto: ResetPasswordDto, context: RequestContext) {
    const normalizedEmail = normalizeAuthEmail(dto.email)
    const normalizedCode = normalizeOneTimeCode(dto.code)
    const rateLimitKeys = [
      this.authRateLimitService.buildPasswordResetCodeKey(normalizedEmail, context.ipAddress),
      this.authRateLimitService.buildPasswordResetCodeEmailKey(normalizedEmail),
    ]

    await assertAllowedForKeys(rateLimitKeys, (key) => this.authRateLimitService.assertPasswordResetCodeAllowed(key))

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (!user || user.status !== 'ACTIVE') {
      return this.rejectUnknownPasswordResetUser(rateLimitKeys)
    }

    const resetCode = await this.prisma.oneTimeCode.findFirst({
      where: {
        userId: user.id,
        email: normalizedEmail,
        purpose: OneTimeCodePurpose.PASSWORD_RESET,
        codeHash: hashToken(normalizedCode),
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!resetCode) {
      return this.rejectInvalidPasswordResetCode({ context, normalizedEmail, rateLimitKeys, user })
    }

    const resetResult = await this.applyPasswordReset({ newPassword: dto.password, resetCode, user })
    await this.afterPasswordReset({ context, rateLimitKeys, user })

    void sendPasswordChangedNotice({
      dependencies: {
        auditLogService: this.auditLogService,
        logger: this.logger,
        mailerService: this.mailerService,
      },
      user,
      context,
      changedAt: resetResult.now,
    })
    await this.demoAccessService.closeGrantsForUser(user.id, resetResult.now)

    return {
      success: true,
      message: 'Senha redefinida com sucesso. Entre novamente para continuar.',
    }
  }

  private async issueAndDeliverPasswordReset(params: {
    context: RequestContext
    rateLimitState: { count: number; lockedUntil: number | null }
    user: { id: string; email: string; fullName: string }
  }) {
    const resetCode = await issueOneTimeCode(this.prisma, {
      userId: params.user.id,
      email: params.user.email,
      purpose: OneTimeCodePurpose.PASSWORD_RESET,
      ttlMinutes: this.getPasswordResetTtlMinutes(),
      context: params.context,
    })

    await deliverPasswordResetEmail({
      dependencies: this.passwordDeliveryDependencies(),
      user: params.user,
      resetCode,
      rateLimitMeta: buildRateLimitMetadata(params.rateLimitState),
      context: params.context,
      ttlMinutes: this.getPasswordResetTtlMinutes(),
      portfolioFallbackEnabled: this.shouldUsePortfolioEmailFallback(params.context),
    })
  }

  private async rejectUnknownPasswordResetUser(rateLimitKeys: string[]): Promise<never> {
    await recordAttemptsForKeys(rateLimitKeys, (key) => this.authRateLimitService.recordPasswordResetCodeAttempt(key))
    throw new BadRequestException('Email invalido ou nao cadastrado.')
  }

  private async rejectInvalidPasswordResetCode(params: {
    context: RequestContext
    normalizedEmail: string
    rateLimitKeys: string[]
    user: { id: string }
  }): Promise<never> {
    const rateLimitState = pickMostRestrictiveRateLimitState(
      await recordAttemptsForKeys(params.rateLimitKeys, (key) =>
        this.authRateLimitService.recordPasswordResetCodeAttempt(key),
      ),
    )

    await this.auditLogService.record({
      actorUserId: params.user.id,
      event: 'auth.password-reset.code_failed',
      resource: 'password_reset',
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

  private async applyPasswordReset(params: {
    newPassword: string
    resetCode: { id: string }
    user: { id: string; passwordHash: string }
  }) {
    const isSamePassword = await argon2.verify(params.user.passwordHash, params.newPassword)
    if (isSamePassword) {
      throw new BadRequestException('Escolha uma senha diferente da senha atual.')
    }

    const passwordHash = await argon2.hash(params.newPassword, { type: argon2.argon2id })
    const now = new Date()
    const revokedSessions = await this.prisma.session.findMany({
      where: { userId: params.user.id, revokedAt: null },
      select: { id: true, tokenHash: true },
    })

    await this.persistPasswordReset({ now, passwordHash, resetCodeId: params.resetCode.id, userId: params.user.id })
    await Promise.all(revokedSessions.map((session) => this.sessionService.forgetSessionCache(session.id)))
    await this.sessionService.disconnectTrackedSessions(revokedSessions.map((session) => session.id))

    return { now }
  }

  private async persistPasswordReset(params: { now: Date; passwordHash: string; resetCodeId: string; userId: string }) {
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: params.userId },
        data: { passwordHash: params.passwordHash, passwordChangedAt: params.now },
      }),
      this.prisma.oneTimeCode.update({
        where: { id: params.resetCodeId },
        data: { usedAt: params.now },
      }),
      this.prisma.oneTimeCode.updateMany({
        where: {
          userId: params.userId,
          purpose: OneTimeCodePurpose.PASSWORD_RESET,
          usedAt: null,
          id: { not: params.resetCodeId },
        },
        data: { usedAt: params.now },
      }),
      this.prisma.session.updateMany({
        where: { userId: params.userId, revokedAt: null },
        data: { revokedAt: params.now },
      }),
    ])
  }

  private async afterPasswordReset(params: {
    context: RequestContext
    rateLimitKeys: string[]
    user: { id: string; email: string }
  }) {
    await clearRateLimitKeys(params.rateLimitKeys, this.authRateLimitService)
    await this.auditLogService.record({
      actorUserId: params.user.id,
      event: 'auth.password-reset.completed',
      resource: 'user',
      resourceId: params.user.id,
      metadata: { email: params.user.email },
      ipAddress: params.context.ipAddress,
      userAgent: params.context.userAgent,
    })
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
        ...buildRateLimitMetadata(params.rateLimitState),
      },
      ipAddress: params.context.ipAddress,
      userAgent: params.context.userAgent,
    })

    return { success: true, message: params.genericMessage }
  }

  getPasswordResetTtlMinutes() {
    const ttlMinutes = Number(this.configService.get<string>('PASSWORD_RESET_TTL_MINUTES') ?? 30)
    return Math.max(ttlMinutes, 5)
  }

  private shouldUsePortfolioEmailFallback(context: RequestContext) {
    return (
      this.configService.get<string>('NODE_ENV') !== 'production' &&
      parseBoolean(this.configService.get<string>('PORTFOLIO_EMAIL_FALLBACK') ?? 'true') &&
      isStrictlyLocalRequestContext(context)
    )
  }

  private passwordDeliveryDependencies() {
    return {
      auditLogService: this.auditLogService,
      logger: this.logger,
      mailerService: this.mailerService,
      prisma: this.prisma,
    }
  }
}
