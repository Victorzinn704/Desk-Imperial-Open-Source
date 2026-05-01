import { HttpException, HttpStatus, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHash } from 'node:crypto'
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

  async assertRealtimeSocketAllowed(key: string): Promise<void> {
    await this.assertAllowedFailOpen(key, this.getRealtimeSocketPolicy())
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

  async recordRealtimeSocketAttempt(key: string): Promise<AttemptEntry> {
    return this.recordAttemptFailOpen(key, this.getRealtimeSocketPolicy())
  }

  async clear(key: string): Promise<void> {
    await this.cache.del(CacheService.ratelimitKey('auth', key))
  }

  buildLoginKey(email: string, ipAddress: string | null) {
    return this.buildScopedKey('login', email, ipAddress)
  }

  buildLoginEmailKey(email: string) {
    return this.buildEmailScopedKey('login', email)
  }

  buildPasswordResetKey(email: string, ipAddress: string | null) {
    return this.buildScopedKey('password-reset', email, ipAddress)
  }

  buildPasswordResetEmailKey(email: string) {
    return this.buildEmailScopedKey('password-reset', email)
  }

  buildPasswordResetCodeKey(email: string, ipAddress: string | null) {
    return this.buildScopedKey('password-reset-code', email, ipAddress)
  }

  buildPasswordResetCodeEmailKey(email: string) {
    return this.buildEmailScopedKey('password-reset-code', email)
  }

  buildEmailVerificationKey(email: string, ipAddress: string | null) {
    return this.buildScopedKey('email-verification', email, ipAddress)
  }

  buildEmailVerificationEmailKey(email: string) {
    return this.buildEmailScopedKey('email-verification', email)
  }

  buildEmailVerificationCodeKey(email: string, ipAddress: string | null) {
    return this.buildScopedKey('email-verification-code', email, ipAddress)
  }

  buildEmailVerificationCodeEmailKey(email: string) {
    return this.buildEmailScopedKey('email-verification-code', email)
  }

  buildRealtimeSocketKey(rawToken: string | null, ipAddress: string | null) {
    const normalizedIp = this.normalizeIpAddress(ipAddress)
    const tokenHash = rawToken ? createHash('sha256').update(rawToken.trim()).digest('hex').slice(0, 16) : 'anonymous'
    return `realtime-socket:${normalizedIp}:${tokenHash}`
  }

  private async assertAllowed(key: string, policy: AttemptPolicy): Promise<void> {
    await this.ensureCacheReady()
    await this.assertAllowedWithPolicy(key, policy)
  }

  private async recordAttempt(key: string, policy: AttemptPolicy): Promise<AttemptEntry> {
    await this.ensureCacheReady()
    return this.recordAttemptWithPolicy(key, policy)
  }

  private async assertAllowedFailOpen(key: string, policy: AttemptPolicy): Promise<void> {
    await this.assertAllowedWithPolicy(key, policy)
  }

  private async recordAttemptFailOpen(key: string, policy: AttemptPolicy): Promise<AttemptEntry> {
    return this.recordAttemptWithPolicy(key, policy)
  }

  private async assertAllowedWithPolicy(key: string, policy: AttemptPolicy): Promise<void> {
    const redisKey = CacheService.ratelimitKey('auth', key)
    const entry = await this.cache.get<AttemptEntry>(redisKey)

    if (!entry) {
      return
    }

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

  private async recordAttemptWithPolicy(key: string, policy: AttemptPolicy): Promise<AttemptEntry> {
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

  private async ensureCacheReady(): Promise<void> {
    const isReady = this.cache.isReady

    if (typeof isReady !== 'function') {
      return
    }

    const ready = await Promise.resolve(isReady.call(this.cache))

    if (ready) {
      return
    }

    throw new ServiceUnavailableException(
      'Serviço de cache indisponível para controle de tentativas. Tente novamente em instantes.',
    )
  }

  private getLoginPolicy(): AttemptPolicy {
    return this.buildAttemptPolicy('LOGIN', 5, 15, 15, 'Muitas tentativas de acesso. Tente novamente mais tarde.')
  }

  private getPasswordResetPolicy(): AttemptPolicy {
    return this.buildAttemptPolicy(
      'PASSWORD_RESET',
      3,
      15,
      30,
      'Muitas solicitações de redefinição. Tente novamente mais tarde.',
    )
  }

  private getPasswordResetCodePolicy(): AttemptPolicy {
    return this.buildAttemptPolicy(
      'PASSWORD_RESET_CODE',
      5,
      15,
      30,
      'Muitas tentativas de validar o código de redefinição. Tente novamente mais tarde.',
    )
  }

  private getEmailVerificationPolicy(): AttemptPolicy {
    return this.buildAttemptPolicy(
      'EMAIL_VERIFICATION',
      3,
      15,
      30,
      'Muitas solicitações de verificação de e-mail. Tente novamente mais tarde.',
    )
  }

  private getEmailVerificationCodePolicy(): AttemptPolicy {
    return this.buildAttemptPolicy(
      'EMAIL_VERIFICATION_CODE',
      5,
      15,
      30,
      'Muitas tentativas de validar o código de confirmação. Tente novamente mais tarde.',
    )
  }

  private getRealtimeSocketPolicy(): AttemptPolicy {
    return this.buildAttemptPolicy('REALTIME_SOCKET', 24, 2, 1, 'Muitas tentativas de conexao realtime.')
  }

  private normalizeKeyValue(value: string) {
    return value.trim().toLowerCase()
  }

  private buildScopedKey(prefix: string, email: string, ipAddress: string | null) {
    return `${prefix}:${ipAddress ?? 'unknown'}:${this.normalizeKeyValue(email)}`
  }

  private buildEmailScopedKey(prefix: string, email: string) {
    return `${prefix}:email:${this.normalizeKeyValue(email)}`
  }

  private normalizeIpAddress(ipAddress: string | null) {
    const normalizedIp = ipAddress?.trim()
    return normalizedIp && normalizedIp.length > 0 ? normalizedIp : 'unknown'
  }

  private buildAttemptPolicy(
    configPrefix: string,
    defaultMaxAttempts: number,
    defaultWindowMinutes: number,
    defaultLockMinutes: number,
    message: string,
  ): AttemptPolicy {
    return {
      maxAttempts: this.getPositiveConfigNumber(`${configPrefix}_MAX_ATTEMPTS`, defaultMaxAttempts),
      windowMs: this.getPositiveConfigNumber(`${configPrefix}_WINDOW_MINUTES`, defaultWindowMinutes) * 60 * 1000,
      lockMs: this.getPositiveConfigNumber(`${configPrefix}_LOCK_MINUTES`, defaultLockMinutes) * 60 * 1000,
      message,
    }
  }

  private getPositiveConfigNumber(configKey: string, fallback: number) {
    const rawValue = this.configService.get<string>(configKey)
    const parsed = Number(rawValue ?? fallback)

    if (!Number.isFinite(parsed) || parsed < 1) {
      this.logger.warn(`${configKey} inválido: "${rawValue}", usando default ${fallback}`)
      return fallback
    }

    return parsed
  }
}
