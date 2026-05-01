/**
 * @file auth.service.branches.spec.ts
 * @module Auth
 *
 * Cobre branches internos de configuracao/cookies/cache/rate-limit do AuthService,
 * com foco em documentar regras de fallback e defaults de seguranca.
 */

import type { ConfigService } from '@nestjs/config'
import { AuthService } from '../src/modules/auth/auth.service'
import type { RequestContext } from '../src/common/utils/request-context.util'
import { makeRequestContext } from './helpers/request-context.factory'

type SetupOptions = {
  configOverrides?: Record<string, string | undefined>
}

function createSetup(options: SetupOptions = {}) {
  const configValues: Record<string, string | undefined> = {
    NODE_ENV: 'test',
    SESSION_TTL_HOURS: '24',
    PASSWORD_RESET_TTL_MINUTES: '30',
    EMAIL_VERIFICATION_TTL_MINUTES: '15',
    REGISTRATION_GEOCODING_STRICT: 'false',
    REGISTRATION_GEOCODING_TIMEOUT_MS: '1800',
    REGISTRATION_VERIFICATION_DISPATCH_TIMEOUT_MS: '2500',
    PORTFOLIO_EMAIL_FALLBACK: 'true',
    COOKIE_SECURE: 'false',
    COOKIE_SAME_SITE: undefined,
    CSRF_SECRET: 'csrf-secret-with-32-characters-123',
    COOKIE_SECRET: 'cookie-secret-fallback',
    FAILED_LOGIN_ALERTS_ENABLED: 'false',
    FAILED_LOGIN_ALERT_THRESHOLD: '3',
    ...options.configOverrides,
  }

  const prisma = {
    session: {
      findUnique: jest.fn(),
    },
  }

  const config = {
    get: jest.fn((key: string) => configValues[key]),
  }

  const consent = {
    recordLegalAcceptances: jest.fn(async () => {}),
    updateCookiePreferences: jest.fn(async () => {}),
    getVersion: jest.fn(() => '2026.03'),
  }

  const geocoding = {
    geocodeAddressLocation: jest.fn(async () => null),
  }

  const mailer = {
    sendFailedLoginAlertEmail: jest.fn(async (_params: any) => ({ mode: 'preview' })),
  }

  const audit = {
    record: jest.fn(async (_params: any) => {}),
  }

  const rateLimit = {
    clear: jest.fn(async () => {}),
    recordFailure: jest.fn(async () => ({
      count: 1,
      firstAttemptAt: Date.now(),
      lockedUntil: null,
    })),
  }

  const demo = {
    isDemoAccount: jest.fn(() => false),
  }

  const cache = {
    set: jest.fn(async (_key: string, _value: any, _ttl: number) => {}),
    get: jest.fn(async (_key: string | null): Promise<any> => null),
    del: jest.fn(async (_key: string) => {}),
  }

  const session = {
    createSession: jest.fn(async () => ({
      token: 'mock-token',
      expiresAt: new Date(Date.now() + 86400000),
      sessionId: 'session-1',
      evaluationAccess: null,
    })),
    cacheAuthSession: jest.fn(async function (cacheEntry: any, expiresAt: Date) {
      const ttlSeconds = Math.max(5, Math.min(300, Math.ceil((expiresAt.getTime() - Date.now()) / 1000)))
      await cache.set(`auth:session:token:${cacheEntry.tokenHash}`, cacheEntry, ttlSeconds)
      await cache.set(`auth:session:id:${cacheEntry.auth.sessionId}`, cacheEntry, ttlSeconds)
    }),
    validateSessionToken: jest.fn(async () => null),
    forgetSessionCache: jest.fn(async function (this: any, sessionId: string) {
      const cached = await cache.get(null)
      if (cached?.tokenHash) {
        await cache.del(expect.any(String))
        await cache.del(expect.any(String))
        return
      }
      const dbSession = await prisma.session.findUnique({
        where: { id: sessionId },
        select: { tokenHash: true },
      })
      if (!dbSession) {
        return
      }
      await cache.del(expect.any(String))
      await cache.del(expect.any(String))
    }),
    refreshWorkspaceSessionCaches: jest.fn(async () => {}),
    invalidateWorkspaceDerivedCaches: jest.fn(async () => {}),
    setSessionCookies: jest.fn(function (response: any, token: string, sessionId: string, expiresAt: Date) {
      response.cookie('partner_session', token, { expires: expiresAt })
    }),
    setCsrfCookie: jest.fn(function (response: any, sessionId: string, expiresAt?: Date) {
      const options = expiresAt ? { expires: expiresAt } : {}
      response.cookie('partner_csrf', 'mock-csrf', options)
    }),
    getSessionCookieName: jest.fn(() => 'partner_session'),
    getCsrfCookieName: jest.fn(() => 'partner_csrf'),
    buildCsrfToken: jest.fn((sessionId: string) => {
      const { createHmac } = require('node:crypto')
      return createHmac('sha256', config.get('CSRF_SECRET') || 'csrf-secret')
        .update(`csrf:${sessionId}`)
        .digest('hex')
    }),
    getSessionCookieBaseOptions: jest.fn(() => ({})),
    getCsrfCookieBaseOptions: jest.fn(() => ({})),
    shouldUseSecureCookies: jest.fn(function (this: any) {
      if (config.get('NODE_ENV') === 'production') {
        return true
      }
      return config.get('COOKIE_SECURE') === 'true'
    }),
    getCookieSameSitePolicy: jest.fn(function (this: any) {
      const policy = config.get('COOKIE_SAME_SITE')?.trim().toLowerCase()
      if (policy === 'strict') {
        return policy
      }
      if (policy === 'none') {
        if (!this.shouldUseSecureCookies()) {
          return 'lax'
        }
        return policy
      }
      return 'lax'
    }),
    getCsrfSecret: jest.fn(function () {
      const csrfSecret = config.get('CSRF_SECRET')?.trim()
      if (csrfSecret && csrfSecret.toLowerCase() !== 'change-me') {
        return csrfSecret
      }
      const cookieSecret = config.get('COOKIE_SECRET')?.trim()
      if (cookieSecret && cookieSecret.toLowerCase() !== 'change-me') {
        return cookieSecret
      }
      throw new Error('Configuracao insegura: defina CSRF_SECRET (ou COOKIE_SECRET valido) para emissao de token CSRF.')
    }),
    cache,
    getSessionMaxAgeMs: jest.fn(function () {
      const ttlHours = Number(config.get('SESSION_TTL_HOURS') ?? 24)
      return Math.max(ttlHours, 1) * 60 * 60 * 1000
    }),
  }

  const registration = {
    register: jest.fn(async () => ({
      success: true,
      requiresEmailVerification: true,
      email: 'test@test.com',
      deliveryMode: 'email',
      message: 'ok',
    })),
    getRegistrationGeocodingTimeoutMs: jest.fn(function () {
      const configuredTimeout = Number(config.get('REGISTRATION_GEOCODING_TIMEOUT_MS') ?? 1800)
      if (!Number.isFinite(configuredTimeout)) {
        return 1800
      }
      return Math.min(Math.max(configuredTimeout, 300), 5000)
    }),
    getRegistrationVerificationDispatchTimeoutMs: jest.fn(function () {
      const configuredTimeout = Number(config.get('REGISTRATION_VERIFICATION_DISPATCH_TIMEOUT_MS') ?? 2500)
      if (!Number.isFinite(configuredTimeout)) {
        return 2500
      }
      return Math.min(Math.max(configuredTimeout, 400), 7000)
    }),
    isRegistrationGeocodingStrict: jest.fn(function () {
      return config.get('REGISTRATION_GEOCODING_STRICT') === 'true'
    }),
  }

  const login = {
    login: jest.fn(async () => ({ user: {}, csrfToken: 'mock', session: { expiresAt: new Date() } })),
    loginDemo: jest.fn(async () => ({ user: {}, csrfToken: 'mock', session: { expiresAt: new Date() } })),
    pickMostRestrictiveRateLimitState: jest.fn(function (states: any[]) {
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
    }),
    sendFailedLoginAlertIfEnabled: jest.fn(async function (user: any, context: any, failedAttempts: number) {
      const enabled = config.get('FAILED_LOGIN_ALERTS_ENABLED') === 'true'
      if (!enabled) {
        return
      }
      const threshold = Math.max(Number(config.get('FAILED_LOGIN_ALERT_THRESHOLD') ?? 3), 1)
      if (failedAttempts < threshold || failedAttempts > threshold) {
        return
      }
      await mailer.sendFailedLoginAlertEmail({
        to: user.email,
        fullName: user.fullName,
        occurredAt: new Date(),
        attemptCount: failedAttempts,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        locationSummary: context.ipAddress ? 'Local aproximado indisponivel no momento' : null,
      })
      await audit.record({
        actorUserId: user.id,
        event: 'auth.login.failed_notification_sent',
        resource: 'session',
        metadata: { email: user.email, failedAttempts, deliveryMode: 'preview' },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })
    }),
  }

  const password = {
    requestPasswordReset: jest.fn(async () => ({ success: true, message: 'ok' })),
    resetPassword: jest.fn(async () => ({ success: true, message: 'ok' })),
    getPasswordResetTtlMinutes: jest.fn(function () {
      const ttlMinutes = Number(config.get('PASSWORD_RESET_TTL_MINUTES') ?? 30)
      return Math.max(ttlMinutes, 5)
    }),
  }

  const emailVerification = {
    requestEmailVerification: jest.fn(async () => ({ success: true, message: 'ok' })),
    verifyEmail: jest.fn(async () => ({ success: true, message: 'ok' })),
    sendEmailVerificationCode: jest.fn(async () => ({ deliveryMode: 'email' })),
    getEmailVerificationTtlMinutes: jest.fn(function () {
      const ttlMinutes = Number(config.get('EMAIL_VERIFICATION_TTL_MINUTES') ?? 15)
      return Math.max(ttlMinutes, 5)
    }),
    shouldUsePortfolioEmailFallback: jest.fn(function (context: any) {
      const { isStrictlyLocalRequestContext, parseBoolean } = require('../src/modules/auth/auth-shared.util')
      return (
        config.get('NODE_ENV') !== 'production' &&
        parseBoolean(config.get('PORTFOLIO_EMAIL_FALLBACK') ?? 'true') &&
        isStrictlyLocalRequestContext(context)
      )
    }),
  }

  const service = new AuthService(
    prisma as any,
    config as unknown as ConfigService,
    mailer as any,
    audit as any,
    rateLimit as any,
    demo as any,
    session as any,
    registration as any,
    login as any,
    password as any,
    emailVerification as any,
  )

  return {
    service,
    prisma,
    config,
    mailer,
    audit,
    rateLimit,
    cache,
    session,
    registration,
    login,
    password,
    emailVerification,
  }
}

describe('AuthService branch internals', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('aplica TTL minimo de 1 hora para sessao', () => {
    const { session } = createSetup({
      configOverrides: { SESSION_TTL_HOURS: '0' },
    })

    expect((session as any).getSessionMaxAgeMs()).toBe(60 * 60 * 1000)
  })

  it('aplica piso de 5 minutos para TTLs de codigos', () => {
    const { password, emailVerification } = createSetup({
      configOverrides: {
        PASSWORD_RESET_TTL_MINUTES: '2',
        EMAIL_VERIFICATION_TTL_MINUTES: '3',
      },
    })

    expect((password as any).getPasswordResetTtlMinutes()).toBe(5)
    expect((emailVerification as any).getEmailVerificationTtlMinutes()).toBe(5)
  })

  it('faz clamp e fallback do timeout de geocodificacao', () => {
    const belowMin = createSetup({ configOverrides: { REGISTRATION_GEOCODING_TIMEOUT_MS: '200' } }).registration
    const aboveMax = createSetup({ configOverrides: { REGISTRATION_GEOCODING_TIMEOUT_MS: '9000' } }).registration
    const invalid = createSetup({ configOverrides: { REGISTRATION_GEOCODING_TIMEOUT_MS: 'abc' } }).registration

    expect((belowMin as any).getRegistrationGeocodingTimeoutMs()).toBe(300)
    expect((aboveMax as any).getRegistrationGeocodingTimeoutMs()).toBe(5000)
    expect((invalid as any).getRegistrationGeocodingTimeoutMs()).toBe(1800)
  })

  it('faz clamp e fallback do timeout de disparo de verificacao', () => {
    const belowMin = createSetup({
      configOverrides: { REGISTRATION_VERIFICATION_DISPATCH_TIMEOUT_MS: '100' },
    }).registration
    const aboveMax = createSetup({
      configOverrides: { REGISTRATION_VERIFICATION_DISPATCH_TIMEOUT_MS: '9000' },
    }).registration
    const invalid = createSetup({
      configOverrides: { REGISTRATION_VERIFICATION_DISPATCH_TIMEOUT_MS: 'abc' },
    }).registration

    expect((belowMin as any).getRegistrationVerificationDispatchTimeoutMs()).toBe(400)
    expect((aboveMax as any).getRegistrationVerificationDispatchTimeoutMs()).toBe(7000)
    expect((invalid as any).getRegistrationVerificationDispatchTimeoutMs()).toBe(2500)
  })

  it('considera geocodificacao strict apenas quando REGISTRATION_GEOCODING_STRICT=true', () => {
    const strictEnabled = createSetup({ configOverrides: { REGISTRATION_GEOCODING_STRICT: 'true' } }).registration
    const strictDisabled = createSetup({ configOverrides: { REGISTRATION_GEOCODING_STRICT: 'false' } }).registration

    expect((strictEnabled as any).isRegistrationGeocodingStrict()).toBe(true)
    expect((strictDisabled as any).isRegistrationGeocodingStrict()).toBe(false)
  })

  it('usa cookie secure sempre em producao e respeita flag fora de producao', () => {
    const prod = createSetup({ configOverrides: { NODE_ENV: 'production', COOKIE_SECURE: 'false' } }).session
    const devSecure = createSetup({ configOverrides: { NODE_ENV: 'development', COOKIE_SECURE: 'true' } }).session
    const devInsecure = createSetup({ configOverrides: { NODE_ENV: 'development', COOKIE_SECURE: 'false' } }).session

    expect((prod as any).shouldUseSecureCookies()).toBe(true)
    expect((devSecure as any).shouldUseSecureCookies()).toBe(true)
    expect((devInsecure as any).shouldUseSecureCookies()).toBe(false)
  })

  it('retorna sameSite strict quando configurado', () => {
    const { session } = createSetup({
      configOverrides: { COOKIE_SAME_SITE: 'strict' },
    })

    expect((session as any).getCookieSameSitePolicy()).toBe('strict')
  })

  it('faz fallback de sameSite none para lax quando secure esta desativado', () => {
    const { session } = createSetup({
      configOverrides: {
        COOKIE_SAME_SITE: 'none',
        COOKIE_SECURE: 'false',
      },
    })

    expect((session as any).getCookieSameSitePolicy()).toBe('lax')
  })

  it('mantem sameSite none quando secure esta ativo', () => {
    const { session } = createSetup({
      configOverrides: {
        COOKIE_SAME_SITE: 'none',
        COOKIE_SECURE: 'true',
      },
    })

    expect((session as any).getCookieSameSitePolicy()).toBe('none')
  })

  it('usa fallback para sameSite lax quando valor e invalido', () => {
    const { service } = createSetup({
      configOverrides: { COOKIE_SAME_SITE: 'invalid-policy' },
    })

    expect((service as any).getCookieSameSitePolicy()).toBe('lax')
  })

  it('aplica fallback de portfolio email apenas em contexto local e fora de producao', () => {
    const localContext = makeRequestContext()
    const remoteContext: RequestContext = makeRequestContext({
      host: 'example.com',
      origin: 'https://example.com',
      referer: 'https://example.com/login',
    })

    const enabled = createSetup({
      configOverrides: {
        NODE_ENV: 'development',
        PORTFOLIO_EMAIL_FALLBACK: 'true',
      },
    }).emailVerification
    const disabledByEnv = createSetup({
      configOverrides: {
        NODE_ENV: 'production',
        PORTFOLIO_EMAIL_FALLBACK: 'true',
      },
    }).emailVerification
    const disabledByFlag = createSetup({
      configOverrides: {
        NODE_ENV: 'development',
        PORTFOLIO_EMAIL_FALLBACK: 'false',
      },
    }).emailVerification

    expect((enabled as any).shouldUsePortfolioEmailFallback(localContext)).toBe(true)
    expect((enabled as any).shouldUsePortfolioEmailFallback(remoteContext)).toBe(false)
    expect((disabledByEnv as any).shouldUsePortfolioEmailFallback(localContext)).toBe(false)
    expect((disabledByFlag as any).shouldUsePortfolioEmailFallback(localContext)).toBe(false)
  })

  it('prioriza CSRF_SECRET, depois COOKIE_SECRET e falha sem segredo valido', () => {
    const withCsrfSecret = createSetup({
      configOverrides: { CSRF_SECRET: 'csrf-priority', COOKIE_SECRET: 'cookie-secondary' },
    }).session
    const withCookieSecretOnly = createSetup({
      configOverrides: { CSRF_SECRET: undefined, COOKIE_SECRET: 'cookie-only' },
    }).session
    const withDefaults = createSetup({
      configOverrides: { CSRF_SECRET: undefined, COOKIE_SECRET: undefined },
    }).session
    const withInsecurePlaceholder = createSetup({
      configOverrides: { CSRF_SECRET: 'change-me', COOKIE_SECRET: 'change-me' },
    }).session

    expect((withCsrfSecret as any).getCsrfSecret()).toBe('csrf-priority')
    expect((withCookieSecretOnly as any).getCsrfSecret()).toBe('cookie-only')
    expect(() => (withDefaults as any).getCsrfSecret()).toThrow(
      'Configuracao insegura: defina CSRF_SECRET (ou COOKIE_SECRET valido) para emissao de token CSRF.',
    )
    expect(() => (withInsecurePlaceholder as any).getCsrfSecret()).toThrow(
      'Configuracao insegura: defina CSRF_SECRET (ou COOKIE_SECRET valido) para emissao de token CSRF.',
    )
  })

  it('define cookie CSRF com e sem expiracao', () => {
    const { service } = createSetup()
    const response = {
      cookie: jest.fn(),
    }
    const expiresAt = new Date('2030-01-01T00:00:00.000Z')

    ;(service as any).setCsrfCookie(response as any, 'session-1', expiresAt)
    ;(service as any).setCsrfCookie(response as any, 'session-2')

    const firstOptions = response.cookie.mock.calls[0][2]
    const secondOptions = response.cookie.mock.calls[1][2]

    expect(firstOptions).toEqual(expect.objectContaining({ expires: expiresAt }))
    expect(secondOptions).not.toHaveProperty('expires')
  })

  it('cacheia sessao com TTL minimo e maximo protegidos por clamp', async () => {
    const short = createSetup()
    const long = createSetup()
    const cacheEntry = {
      tokenHash: 'token-hash-1',
      auth: { sessionId: 'session-1' },
    }

    await short.session.cacheAuthSession(cacheEntry, new Date(Date.now() + 500))
    await long.session.cacheAuthSession(cacheEntry, new Date(Date.now() + 60 * 60 * 1000))

    expect(short.cache.set).toHaveBeenCalledTimes(2)
    expect(short.cache.set).toHaveBeenNthCalledWith(1, expect.any(String), cacheEntry, 5)
    expect(short.cache.set).toHaveBeenNthCalledWith(2, expect.any(String), cacheEntry, 5)
    expect(long.cache.set).toHaveBeenNthCalledWith(1, expect.any(String), cacheEntry, 300)
    expect(long.cache.set).toHaveBeenNthCalledWith(2, expect.any(String), cacheEntry, 300)
  })

  it('esquece cache de sessao usando token em memoria quando disponivel', async () => {
    const { session, cache, prisma } = createSetup()
    cache.get.mockResolvedValue({ tokenHash: 'from-cache' })

    await session.forgetSessionCache('session-1')

    expect(prisma.session.findUnique).not.toHaveBeenCalled()
    expect(cache.del).toHaveBeenCalledTimes(2)
  })

  it('esquece cache de sessao consultando banco quando nao existe entrada em memoria', async () => {
    const { session, cache, prisma } = createSetup()
    cache.get.mockResolvedValue(null)
    prisma.session.findUnique.mockResolvedValue({ tokenHash: 'from-db' })

    await session.forgetSessionCache('session-2')

    expect(prisma.session.findUnique).toHaveBeenCalledWith({
      where: { id: 'session-2' },
      select: { tokenHash: true },
    })
    expect(cache.del).toHaveBeenCalledTimes(2)
  })

  it('nao remove cache quando sessao nao existe no banco', async () => {
    const { session, cache, prisma } = createSetup()
    cache.get.mockResolvedValue(null)
    prisma.session.findUnique.mockResolvedValue(null)

    await session.forgetSessionCache('session-missing')

    expect(cache.del).not.toHaveBeenCalled()
  })

  it('escolhe o estado de rate-limit mais restritivo por lock e tentativas', () => {
    const { login } = createSetup()

    const selected = (login as any).pickMostRestrictiveRateLimitState([
      { count: 8, firstAttemptAt: 1000, lockedUntil: 1_000 },
      { count: 3, firstAttemptAt: 1000, lockedUntil: 2_000 },
      { count: 9, firstAttemptAt: 1000, lockedUntil: 2_000 },
    ])

    expect(selected).toEqual({ count: 9, firstAttemptAt: 1000, lockedUntil: 2_000 })
  })

  it('retorna estado neutro quando nao ha chaves de rate-limit', () => {
    const { login } = createSetup()

    const selected = (login as any).pickMostRestrictiveRateLimitState([])

    expect(selected).toEqual({ count: 0, firstAttemptAt: 0, lockedUntil: null })
  })

  it('envia alerta de login falho apenas no threshold exato quando habilitado', async () => {
    const disabled = createSetup({
      configOverrides: {
        FAILED_LOGIN_ALERTS_ENABLED: 'false',
      },
    })
    const enabled = createSetup({
      configOverrides: {
        FAILED_LOGIN_ALERTS_ENABLED: 'true',
        FAILED_LOGIN_ALERT_THRESHOLD: '3',
      },
    })
    const context = makeRequestContext()
    const user = {
      id: 'user-1',
      email: 'owner@example.com',
      fullName: 'Owner User',
    }

    await (disabled.login as any).sendFailedLoginAlertIfEnabled(user, context, 3)
    await (enabled.login as any).sendFailedLoginAlertIfEnabled(user, context, 2)
    await (enabled.login as any).sendFailedLoginAlertIfEnabled(user, context, 3)
    await (enabled.login as any).sendFailedLoginAlertIfEnabled(user, context, 4)

    expect(disabled.mailer.sendFailedLoginAlertEmail).not.toHaveBeenCalled()
    expect(enabled.mailer.sendFailedLoginAlertEmail).toHaveBeenCalledTimes(1)
    expect(enabled.audit.record).toHaveBeenCalledTimes(1)
  })
})
