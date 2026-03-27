import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { CacheService } from '../../common/services/cache.service'

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

@Injectable()
export class AuthRateLimitService {
  private readonly logger = new Logger(AuthRateLimitService.name)

  constructor(
    private readonly configService: ConfigService,
    private readonly cache: CacheService,
  ) {}

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
    await this.cache.del(CacheService.ratelimitKey('auth', key))
  }

  buildLoginKey(email: string, ipAddress: string | null) {
    return `login:${ipAddress ?? 'unknown'}:${email.trim().toLowerCase()}`
  }

  buildLoginEmailKey(email: string) {
    return `login:email:${email.trim().toLowerCase()}`
  }

  buildPasswordResetKey(email: string, ipAddress: string | null) {
    return `password-reset:${ipAddress ?? 'unknown'}:${email.trim().toLowerCase()}`
  }

  buildPasswordResetEmailKey(email: string) {
    return `password-reset:email:${email.trim().toLowerCase()}`
  }

  buildPasswordResetCodeKey(email: string, ipAddress: string | null) {
    return `password-reset-code:${ipAddress ?? 'unknown'}:${email.trim().toLowerCase()}`
  }

  buildPasswordResetCodeEmailKey(email: string) {
    return `password-reset-code:email:${email.trim().toLowerCase()}`
  }

  buildEmailVerificationKey(email: string, ipAddress: string | null) {
    return `email-verification:${ipAddress ?? 'unknown'}:${email.trim().toLowerCase()}`
  }

  buildEmailVerificationEmailKey(email: string) {
    return `email-verification:email:${email.trim().toLowerCase()}`
  }

  buildEmailVerificationCodeKey(email: string, ipAddress: string | null) {
    return `email-verification-code:${ipAddress ?? 'unknown'}:${email.trim().toLowerCase()}`
  }

  buildEmailVerificationCodeEmailKey(email: string) {
    return `email-verification-code:email:${email.trim().toLowerCase()}`
  }

  private async assertAllowed(key: string, policy: AttemptPolicy): Promise<void> {
    const redisKey = CacheService.ratelimitKey('auth', key)
    const entry = await this.cache.get<AttemptEntry>(redisKey)

    if (!entry) return

    const now = Date.now()

    if (entry.lockedUntil && entry.lockedUntil > now) {
      const retryAfterSeconds = Math.ceil((entry.lockedUntil - now) / 1000)
      throw new HttpException(
        `${policy.message} Tente novamente em ${retryAfterSeconds} segundo(s).`,
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }

    if (entry.firstAttemptAt + policy.windowMs <= now) {
      await this.cache.del(redisKey)
    }
  }

  private async recordAttempt(key: string, policy: AttemptPolicy): Promise<AttemptEntry> {
    const redisKey = CacheService.ratelimitKey('auth', key)
    const now = Date.now()

    const existing = await this.cache.get<AttemptEntry>(redisKey)

    if (!existing || existing.firstAttemptAt + policy.windowMs <= now) {
      const fresh: AttemptEntry = { count: 1, firstAttemptAt: now, lockedUntil: null }
      await this.cache.set(redisKey, fresh, Math.ceil(policy.windowMs / 1000))
      return fresh
    }

    const newCount = existing.count + 1
    const shouldLock = newCount >= policy.maxAttempts
    const lockedUntil = shouldLock ? now + policy.lockMs : null
    const updated: AttemptEntry = { count: newCount, firstAttemptAt: existing.firstAttemptAt, lockedUntil }

    const ttlSeconds = shouldLock
      ? Math.ceil(policy.lockMs / 1000)
      : Math.ceil((existing.firstAttemptAt + policy.windowMs - now) / 1000)

    await this.cache.set(redisKey, updated, Math.max(ttlSeconds, 1))
    return updated
  }

  private getLoginPolicy(): AttemptPolicy {
    return {
      maxAttempts: Math.max(Number(this.configService.get<string>('LOGIN_MAX_ATTEMPTS') ?? 5), 1),
      windowMs: Math.max(Number(this.configService.get<string>('LOGIN_WINDOW_MINUTES') ?? 15), 1) * 60 * 1000,
      lockMs: Math.max(Number(this.configService.get<string>('LOGIN_LOCK_MINUTES') ?? 15), 1) * 60 * 1000,
      message: 'Muitas tentativas de acesso. Tente novamente mais tarde.',
    }
  }

  private getPasswordResetPolicy(): AttemptPolicy {
    return {
      maxAttempts: Math.max(Number(this.configService.get<string>('PASSWORD_RESET_MAX_ATTEMPTS') ?? 3), 1),
      windowMs: Math.max(Number(this.configService.get<string>('PASSWORD_RESET_WINDOW_MINUTES') ?? 15), 1) * 60 * 1000,
      lockMs: Math.max(Number(this.configService.get<string>('PASSWORD_RESET_LOCK_MINUTES') ?? 30), 1) * 60 * 1000,
      message: 'Muitas solicitações de redefinição. Tente novamente mais tarde.',
    }
  }

  private getPasswordResetCodePolicy(): AttemptPolicy {
    return {
      maxAttempts: Math.max(Number(this.configService.get<string>('PASSWORD_RESET_CODE_MAX_ATTEMPTS') ?? 5), 1),
      windowMs: Math.max(Number(this.configService.get<string>('PASSWORD_RESET_CODE_WINDOW_MINUTES') ?? 15), 1) * 60 * 1000,
      lockMs: Math.max(Number(this.configService.get<string>('PASSWORD_RESET_CODE_LOCK_MINUTES') ?? 30), 1) * 60 * 1000,
      message: 'Muitas tentativas de validar o código de redefinição. Tente novamente mais tarde.',
    }
  }

  private getEmailVerificationPolicy(): AttemptPolicy {
    return {
      maxAttempts: Math.max(Number(this.configService.get<string>('EMAIL_VERIFICATION_MAX_ATTEMPTS') ?? 3), 1),
      windowMs: Math.max(Number(this.configService.get<string>('EMAIL_VERIFICATION_WINDOW_MINUTES') ?? 15), 1) * 60 * 1000,
      lockMs: Math.max(Number(this.configService.get<string>('EMAIL_VERIFICATION_LOCK_MINUTES') ?? 30), 1) * 60 * 1000,
      message: 'Muitas solicitações de verificação de e-mail. Tente novamente mais tarde.',
    }
  }

  private getEmailVerificationCodePolicy(): AttemptPolicy {
    return {
      maxAttempts: Math.max(Number(this.configService.get<string>('EMAIL_VERIFICATION_CODE_MAX_ATTEMPTS') ?? 5), 1),
      windowMs: Math.max(Number(this.configService.get<string>('EMAIL_VERIFICATION_CODE_WINDOW_MINUTES') ?? 15), 1) * 60 * 1000,
      lockMs: Math.max(Number(this.configService.get<string>('EMAIL_VERIFICATION_CODE_LOCK_MINUTES') ?? 30), 1) * 60 * 1000,
      message: 'Muitas tentativas de validar o código de confirmação. Tente novamente mais tarde.',
    }
  }
}

