import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

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
  private readonly attempts = new Map<string, AttemptEntry>()

  constructor(private readonly configService: ConfigService) {}

  assertLoginAllowed(key: string) {
    this.assertAllowed(key, this.getLoginPolicy())
  }

  assertPasswordResetAllowed(key: string) {
    this.assertAllowed(key, this.getPasswordResetPolicy())
  }

  assertPasswordResetCodeAllowed(key: string) {
    this.assertAllowed(key, this.getPasswordResetCodePolicy())
  }

  assertEmailVerificationAllowed(key: string) {
    this.assertAllowed(key, this.getEmailVerificationPolicy())
  }

  assertEmailVerificationCodeAllowed(key: string) {
    this.assertAllowed(key, this.getEmailVerificationCodePolicy())
  }

  recordFailure(key: string) {
    return this.recordAttempt(key, this.getLoginPolicy())
  }

  recordPasswordResetAttempt(key: string) {
    return this.recordAttempt(key, this.getPasswordResetPolicy())
  }

  recordPasswordResetCodeAttempt(key: string) {
    return this.recordAttempt(key, this.getPasswordResetCodePolicy())
  }

  recordEmailVerificationAttempt(key: string) {
    return this.recordAttempt(key, this.getEmailVerificationPolicy())
  }

  recordEmailVerificationCodeAttempt(key: string) {
    return this.recordAttempt(key, this.getEmailVerificationCodePolicy())
  }

  clear(key: string) {
    this.attempts.delete(key)
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

  private assertAllowed(key: string, policy: AttemptPolicy) {
    const entry = this.attempts.get(key)
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
      this.attempts.delete(key)
    }
  }

  private recordAttempt(key: string, policy: AttemptPolicy) {
    const now = Date.now()
    const current = this.attempts.get(key)

    if (!current || current.firstAttemptAt + policy.windowMs <= now) {
      const next: AttemptEntry = {
        count: 1,
        firstAttemptAt: now,
        lockedUntil: null,
      }
      this.attempts.set(key, next)
      return next
    }

    current.count += 1
    if (current.count >= policy.maxAttempts) {
      current.lockedUntil = now + policy.lockMs
    }

    this.attempts.set(key, current)
    return current
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
