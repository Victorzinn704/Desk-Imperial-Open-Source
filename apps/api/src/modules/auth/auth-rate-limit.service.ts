import { HttpException, HttpStatus, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../database/prisma.service'

type AttemptEntry = {
  count: number
  firstAttemptAt: number
  lockedUntil: number | null
}

type AttemptPolicy = {
  maxAttempts: number
  windowMs: number
  lockMs: number
  message: string
}

// Intervalo de limpeza de entradas expiradas (2 horas em ms)
const CLEANUP_INTERVAL_MS = 2 * 60 * 60 * 1000
// Entradas mais antigas que 2 horas sem atividade são removidas
const STALE_ENTRY_AGE_MS = 2 * 60 * 60 * 1000

@Injectable()
export class AuthRateLimitService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuthRateLimitService.name)
  private cleanupTimer: NodeJS.Timeout | null = null

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.cleanupTimer = setInterval(() => {
      void this.cleanExpiredEntries()
    }, CLEANUP_INTERVAL_MS)
  }

  onModuleDestroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }

  async assertLoginAllowed(key: string): Promise<void> {
    await this.assertAllowed(key, this.getLoginPolicy())
  }

  async assertPasswordResetAllowed(key: string): Promise<void> {
    await this.assertAllowed(key, this.getPasswordResetPolicy())
  }

  async assertPasswordResetCodeAllowed(key: string): Promise<void> {
    await this.assertAllowed(key, this.getPasswordResetCodePolicy())
  }

  async assertEmailVerificationAllowed(key: string): Promise<void> {
    await this.assertAllowed(key, this.getEmailVerificationPolicy())
  }

  async assertEmailVerificationCodeAllowed(key: string): Promise<void> {
    await this.assertAllowed(key, this.getEmailVerificationCodePolicy())
  }

  async recordFailure(key: string): Promise<AttemptEntry> {
    return this.recordAttempt(key, this.getLoginPolicy())
  }

  async recordPasswordResetAttempt(key: string): Promise<AttemptEntry> {
    return this.recordAttempt(key, this.getPasswordResetPolicy())
  }

  async recordPasswordResetCodeAttempt(key: string): Promise<AttemptEntry> {
    return this.recordAttempt(key, this.getPasswordResetCodePolicy())
  }

  async recordEmailVerificationAttempt(key: string): Promise<AttemptEntry> {
    return this.recordAttempt(key, this.getEmailVerificationPolicy())
  }

  async recordEmailVerificationCodeAttempt(key: string): Promise<AttemptEntry> {
    return this.recordAttempt(key, this.getEmailVerificationCodePolicy())
  }

  async clear(key: string): Promise<void> {
    try {
      await this.prisma.authRateLimit.deleteMany({ where: { key } })
    } catch (error) {
      this.logger.error(`AuthRateLimitService.clear failed for key="${key}"`, error)
    }
  }

  buildLoginKey(email: string, ipAddress: string | null) {
    return `login:${ipAddress ?? 'unknown'}:${email.trim().toLowerCase()}`
  }

  /** Chave só por email — protege contra IP spoofing em rate limit de login. */
  buildLoginEmailKey(email: string) {
    return `login:email:${email.trim().toLowerCase()}`
  }

  buildPasswordResetKey(email: string, ipAddress: string | null) {
    return `password-reset:${ipAddress ?? 'unknown'}:${email.trim().toLowerCase()}`
  }

  /** Chave só por email — protege contra IP spoofing em rate limit de reset de senha. */
  buildPasswordResetEmailKey(email: string) {
    return `password-reset:email:${email.trim().toLowerCase()}`
  }

  buildPasswordResetCodeKey(email: string, ipAddress: string | null) {
    return `password-reset-code:${ipAddress ?? 'unknown'}:${email.trim().toLowerCase()}`
  }

  buildEmailVerificationKey(email: string, ipAddress: string | null) {
    return `email-verification:${ipAddress ?? 'unknown'}:${email.trim().toLowerCase()}`
  }

  buildEmailVerificationCodeKey(email: string, ipAddress: string | null) {
    return `email-verification-code:${ipAddress ?? 'unknown'}:${email.trim().toLowerCase()}`
  }

  private async assertAllowed(key: string, policy: AttemptPolicy): Promise<void> {
    try {
      const entry = await this.prisma.authRateLimit.findUnique({ where: { key } })

      if (!entry) return

      const now = Date.now()

      // Verificar se está bloqueado
      if (entry.lockedUntil && entry.lockedUntil.getTime() > now) {
        const retryAfterSeconds = Math.ceil((entry.lockedUntil.getTime() - now) / 1000)
        throw new HttpException(
          `${policy.message} Tente novamente em ${retryAfterSeconds} segundo(s).`,
          HttpStatus.TOO_MANY_REQUESTS,
        )
      }

      // Janela de tempo expirou → limpar e permitir
      const windowExpiredAt = entry.firstAttemptAt.getTime() + policy.windowMs
      if (windowExpiredAt <= now) {
        await this.prisma.authRateLimit.deleteMany({ where: { key } })
        return
      }
    } catch (error) {
      // Re-lançar erros HTTP (rate limit bloqueado) sem suprimir
      if (error instanceof HttpException) throw error
      // Erros de banco não devem derrubar o login — logar e deixar passar
      this.logger.error(`AuthRateLimitService.assertAllowed failed for key="${key}"`, error)
    }
  }

  private async recordAttempt(key: string, policy: AttemptPolicy): Promise<AttemptEntry> {
    try {
      const now = new Date()

      // Verificar se existe entrada e se a janela ainda é válida
      const existing = await this.prisma.authRateLimit.findUnique({ where: { key } })

      if (!existing || existing.firstAttemptAt.getTime() + policy.windowMs <= Date.now()) {
        // Sem entrada ou janela expirada → criar nova
        const created = await this.prisma.authRateLimit.upsert({
          where: { key },
          create: {
            key,
            attempts: 1,
            firstAttemptAt: now,
            lockedUntil: null,
          },
          update: {
            attempts: 1,
            firstAttemptAt: now,
            lockedUntil: null,
          },
        })

        return {
          count: created.attempts,
          firstAttemptAt: created.firstAttemptAt.getTime(),
          lockedUntil: null,
        }
      }

      // Janela válida → incrementar tentativas
      const newAttempts = existing.attempts + 1
      const shouldLock = newAttempts >= policy.maxAttempts
      const lockedUntil = shouldLock ? new Date(Date.now() + policy.lockMs) : null

      const updated = await this.prisma.authRateLimit.update({
        where: { key },
        data: {
          attempts: newAttempts,
          lockedUntil,
        },
      })

      return {
        count: updated.attempts,
        firstAttemptAt: updated.firstAttemptAt.getTime(),
        lockedUntil: updated.lockedUntil ? updated.lockedUntil.getTime() : null,
      }
    } catch (error) {
      // Erros de banco não devem derrubar o login — retornar estado neutro
      this.logger.error(`AuthRateLimitService.recordAttempt failed for key="${key}"`, error)
      return { count: 0, firstAttemptAt: Date.now(), lockedUntil: null }
    }
  }

  private async cleanExpiredEntries(): Promise<void> {
    try {
      const cutoff = new Date(Date.now() - STALE_ENTRY_AGE_MS)
      const result = await this.prisma.authRateLimit.deleteMany({
        where: { updatedAt: { lt: cutoff } },
      })
      if (result.count > 0) {
        this.logger.log(`AuthRateLimitService: removidas ${result.count} entradas expiradas`)
      }
    } catch (error) {
      this.logger.error('AuthRateLimitService.cleanExpiredEntries failed', error)
    }
  }

  private getLoginPolicy(): AttemptPolicy {
    return {
      maxAttempts: Math.max(Number(this.configService.get<string>('LOGIN_MAX_ATTEMPTS') ?? 5), 1),
      windowMs:
        Math.max(Number(this.configService.get<string>('LOGIN_WINDOW_MINUTES') ?? 15), 1) *
        60 *
        1000,
      lockMs:
        Math.max(Number(this.configService.get<string>('LOGIN_LOCK_MINUTES') ?? 15), 1) *
        60 *
        1000,
      message: 'Muitas tentativas de acesso. Tente novamente mais tarde.',
    }
  }

  private getPasswordResetPolicy(): AttemptPolicy {
    return {
      maxAttempts: Math.max(
        Number(this.configService.get<string>('PASSWORD_RESET_MAX_ATTEMPTS') ?? 3),
        1,
      ),
      windowMs:
        Math.max(
          Number(this.configService.get<string>('PASSWORD_RESET_WINDOW_MINUTES') ?? 15),
          1,
        ) *
        60 *
        1000,
      lockMs:
        Math.max(
          Number(this.configService.get<string>('PASSWORD_RESET_LOCK_MINUTES') ?? 30),
          1,
        ) *
        60 *
        1000,
      message: 'Muitas solicitações de redefinição. Tente novamente mais tarde.',
    }
  }

  private getPasswordResetCodePolicy(): AttemptPolicy {
    return {
      maxAttempts: Math.max(
        Number(this.configService.get<string>('PASSWORD_RESET_CODE_MAX_ATTEMPTS') ?? 5),
        1,
      ),
      windowMs:
        Math.max(
          Number(this.configService.get<string>('PASSWORD_RESET_CODE_WINDOW_MINUTES') ?? 15),
          1,
        ) *
        60 *
        1000,
      lockMs:
        Math.max(
          Number(this.configService.get<string>('PASSWORD_RESET_CODE_LOCK_MINUTES') ?? 30),
          1,
        ) *
        60 *
        1000,
      message: 'Muitas tentativas de validar o código de redefinição. Tente novamente mais tarde.',
    }
  }

  private getEmailVerificationPolicy(): AttemptPolicy {
    return {
      maxAttempts: Math.max(
        Number(this.configService.get<string>('EMAIL_VERIFICATION_MAX_ATTEMPTS') ?? 3),
        1,
      ),
      windowMs:
        Math.max(
          Number(this.configService.get<string>('EMAIL_VERIFICATION_WINDOW_MINUTES') ?? 15),
          1,
        ) *
        60 *
        1000,
      lockMs:
        Math.max(
          Number(this.configService.get<string>('EMAIL_VERIFICATION_LOCK_MINUTES') ?? 30),
          1,
        ) *
        60 *
        1000,
      message: 'Muitas solicitações de verificação de e-mail. Tente novamente mais tarde.',
    }
  }

  private getEmailVerificationCodePolicy(): AttemptPolicy {
    return {
      maxAttempts: Math.max(
        Number(this.configService.get<string>('EMAIL_VERIFICATION_CODE_MAX_ATTEMPTS') ?? 5),
        1,
      ),
      windowMs:
        Math.max(
          Number(this.configService.get<string>('EMAIL_VERIFICATION_CODE_WINDOW_MINUTES') ?? 15),
          1,
        ) *
        60 *
        1000,
      lockMs:
        Math.max(
          Number(this.configService.get<string>('EMAIL_VERIFICATION_CODE_LOCK_MINUTES') ?? 30),
          1,
        ) *
        60 *
        1000,
      message: 'Muitas tentativas de validar o código de confirmação. Tente novamente mais tarde.',
    }
  }
}
