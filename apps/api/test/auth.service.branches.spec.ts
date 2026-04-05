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
    sendFailedLoginAlertEmail: jest.fn(async () => ({ mode: 'preview' })),
  }

  const audit = {
    record: jest.fn(async () => {}),
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
    set: jest.fn(async () => {}),
    get: jest.fn(async (): Promise<any> => null),
    del: jest.fn(async () => {}),
  }

  const service = new AuthService(
    prisma as any,
    config as unknown as ConfigService,
    consent as any,
    geocoding as any,
    mailer as any,
    audit as any,
    rateLimit as any,
    demo as any,
    cache as any,
  )

  return {
    service,
    prisma,
    config,
    mailer,
    audit,
    rateLimit,
    cache,
  }
}

describe('AuthService branch internals', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('aplica TTL minimo de 1 hora para sessao', () => {
    const { service } = createSetup({
      configOverrides: { SESSION_TTL_HOURS: '0' },
    })

    expect((service as any).getSessionMaxAgeMs()).toBe(60 * 60 * 1000)
  })

  it('aplica piso de 5 minutos para TTLs de codigos', () => {
    const { service } = createSetup({
      configOverrides: {
        PASSWORD_RESET_TTL_MINUTES: '2',
        EMAIL_VERIFICATION_TTL_MINUTES: '3',
      },
    })

    expect((service as any).getPasswordResetTtlMinutes()).toBe(5)
    expect((service as any).getEmailVerificationTtlMinutes()).toBe(5)
  })

  it('faz clamp e fallback do timeout de geocodificacao', () => {
    const belowMin = createSetup({ configOverrides: { REGISTRATION_GEOCODING_TIMEOUT_MS: '200' } }).service
    const aboveMax = createSetup({ configOverrides: { REGISTRATION_GEOCODING_TIMEOUT_MS: '9000' } }).service
    const invalid = createSetup({ configOverrides: { REGISTRATION_GEOCODING_TIMEOUT_MS: 'abc' } }).service

    expect((belowMin as any).getRegistrationGeocodingTimeoutMs()).toBe(300)
    expect((aboveMax as any).getRegistrationGeocodingTimeoutMs()).toBe(5000)
    expect((invalid as any).getRegistrationGeocodingTimeoutMs()).toBe(1800)
  })

  it('faz clamp e fallback do timeout de disparo de verificacao', () => {
    const belowMin = createSetup({
      configOverrides: { REGISTRATION_VERIFICATION_DISPATCH_TIMEOUT_MS: '100' },
    }).service
    const aboveMax = createSetup({
      configOverrides: { REGISTRATION_VERIFICATION_DISPATCH_TIMEOUT_MS: '9000' },
    }).service
    const invalid = createSetup({
      configOverrides: { REGISTRATION_VERIFICATION_DISPATCH_TIMEOUT_MS: 'abc' },
    }).service

    expect((belowMin as any).getRegistrationVerificationDispatchTimeoutMs()).toBe(400)
    expect((aboveMax as any).getRegistrationVerificationDispatchTimeoutMs()).toBe(7000)
    expect((invalid as any).getRegistrationVerificationDispatchTimeoutMs()).toBe(2500)
  })

  it('considera geocodificacao strict apenas quando REGISTRATION_GEOCODING_STRICT=true', () => {
    const strictEnabled = createSetup({ configOverrides: { REGISTRATION_GEOCODING_STRICT: 'true' } }).service
    const strictDisabled = createSetup({ configOverrides: { REGISTRATION_GEOCODING_STRICT: 'false' } }).service

    expect((strictEnabled as any).isRegistrationGeocodingStrict()).toBe(true)
    expect((strictDisabled as any).isRegistrationGeocodingStrict()).toBe(false)
  })

  it('usa cookie secure sempre em producao e respeita flag fora de producao', () => {
    const prod = createSetup({ configOverrides: { NODE_ENV: 'production', COOKIE_SECURE: 'false' } }).service
    const devSecure = createSetup({ configOverrides: { NODE_ENV: 'development', COOKIE_SECURE: 'true' } }).service
    const devInsecure = createSetup({ configOverrides: { NODE_ENV: 'development', COOKIE_SECURE: 'false' } }).service

    expect((prod as any).shouldUseSecureCookies()).toBe(true)
    expect((devSecure as any).shouldUseSecureCookies()).toBe(true)
    expect((devInsecure as any).shouldUseSecureCookies()).toBe(false)
  })

  it('retorna sameSite strict quando configurado', () => {
    const { service } = createSetup({
      configOverrides: { COOKIE_SAME_SITE: 'strict' },
    })

    expect((service as any).getCookieSameSitePolicy()).toBe('strict')
  })

  it('faz fallback de sameSite none para lax quando secure esta desativado', () => {
    const { service } = createSetup({
      configOverrides: {
        COOKIE_SAME_SITE: 'none',
        COOKIE_SECURE: 'false',
      },
    })
    const warn = jest.fn()
    ;(service as any).logger = { warn }

    expect((service as any).getCookieSameSitePolicy()).toBe('lax')
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('mantem sameSite none quando secure esta ativo', () => {
    const { service } = createSetup({
      configOverrides: {
        COOKIE_SAME_SITE: 'none',
        COOKIE_SECURE: 'true',
      },
    })

    expect((service as any).getCookieSameSitePolicy()).toBe('none')
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
    }).service
    const disabledByEnv = createSetup({
      configOverrides: {
        NODE_ENV: 'production',
        PORTFOLIO_EMAIL_FALLBACK: 'true',
      },
    }).service
    const disabledByFlag = createSetup({
      configOverrides: {
        NODE_ENV: 'development',
        PORTFOLIO_EMAIL_FALLBACK: 'false',
      },
    }).service

    expect((enabled as any).shouldUsePortfolioEmailFallback(localContext)).toBe(true)
    expect((enabled as any).shouldUsePortfolioEmailFallback(remoteContext)).toBe(false)
    expect((disabledByEnv as any).shouldUsePortfolioEmailFallback(localContext)).toBe(false)
    expect((disabledByFlag as any).shouldUsePortfolioEmailFallback(localContext)).toBe(false)
  })

  it('prioriza CSRF_SECRET, depois COOKIE_SECRET e falha sem segredo valido', () => {
    const withCsrfSecret = createSetup({
      configOverrides: { CSRF_SECRET: 'csrf-priority', COOKIE_SECRET: 'cookie-secondary' },
    }).service
    const withCookieSecretOnly = createSetup({
      configOverrides: { CSRF_SECRET: undefined, COOKIE_SECRET: 'cookie-only' },
    }).service
    const withDefaults = createSetup({
      configOverrides: { CSRF_SECRET: undefined, COOKIE_SECRET: undefined },
    }).service
    const withInsecurePlaceholder = createSetup({
      configOverrides: { CSRF_SECRET: 'change-me', COOKIE_SECRET: 'change-me' },
    }).service

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

    await (short.service as any).cacheAuthSession(cacheEntry, new Date(Date.now() + 500))
    await (long.service as any).cacheAuthSession(cacheEntry, new Date(Date.now() + 60 * 60 * 1000))

    expect(short.cache.set).toHaveBeenCalledTimes(2)
    expect(short.cache.set).toHaveBeenNthCalledWith(1, expect.any(String), cacheEntry, 5)
    expect(short.cache.set).toHaveBeenNthCalledWith(2, expect.any(String), cacheEntry, 5)
    expect(long.cache.set).toHaveBeenNthCalledWith(1, expect.any(String), cacheEntry, 300)
    expect(long.cache.set).toHaveBeenNthCalledWith(2, expect.any(String), cacheEntry, 300)
  })

  it('esquece cache de sessao usando token em memoria quando disponivel', async () => {
    const { service, cache, prisma } = createSetup()
    cache.get.mockResolvedValue({ tokenHash: 'from-cache' })

    await (service as any).forgetSessionCache('session-1')

    expect(prisma.session.findUnique).not.toHaveBeenCalled()
    expect(cache.del).toHaveBeenCalledTimes(2)
  })

  it('esquece cache de sessao consultando banco quando nao existe entrada em memoria', async () => {
    const { service, cache, prisma } = createSetup()
    cache.get.mockResolvedValue(null)
    prisma.session.findUnique.mockResolvedValue({ tokenHash: 'from-db' })

    await (service as any).forgetSessionCache('session-2')

    expect(prisma.session.findUnique).toHaveBeenCalledWith({
      where: { id: 'session-2' },
      select: { tokenHash: true },
    })
    expect(cache.del).toHaveBeenCalledTimes(2)
  })

  it('nao remove cache quando sessao nao existe no banco', async () => {
    const { service, cache, prisma } = createSetup()
    cache.get.mockResolvedValue(null)
    prisma.session.findUnique.mockResolvedValue(null)

    await (service as any).forgetSessionCache('session-missing')

    expect(cache.del).not.toHaveBeenCalled()
  })

  it('escolhe o estado de rate-limit mais restritivo por lock e tentativas', () => {
    const { service } = createSetup()

    const selected = (service as any).pickMostRestrictiveRateLimitState([
      { count: 8, firstAttemptAt: 1000, lockedUntil: 1_000 },
      { count: 3, firstAttemptAt: 1000, lockedUntil: 2_000 },
      { count: 9, firstAttemptAt: 1000, lockedUntil: 2_000 },
    ])

    expect(selected).toEqual({ count: 9, firstAttemptAt: 1000, lockedUntil: 2_000 })
  })

  it('retorna estado neutro quando nao ha chaves de rate-limit', () => {
    const { service } = createSetup()

    const selected = (service as any).pickMostRestrictiveRateLimitState([])

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

    await (disabled.service as any).sendFailedLoginAlertIfEnabled(user, context, 3)
    await (enabled.service as any).sendFailedLoginAlertIfEnabled(user, context, 2)
    await (enabled.service as any).sendFailedLoginAlertIfEnabled(user, context, 3)
    await (enabled.service as any).sendFailedLoginAlertIfEnabled(user, context, 4)

    expect(disabled.mailer.sendFailedLoginAlertEmail).not.toHaveBeenCalled()
    expect(enabled.mailer.sendFailedLoginAlertEmail).toHaveBeenCalledTimes(1)
    expect(enabled.audit.record).toHaveBeenCalledTimes(1)
  })
})
