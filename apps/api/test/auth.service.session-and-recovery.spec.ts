import { HttpException, HttpStatus } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'
import { CurrencyCode, UserRole, UserStatus } from '@prisma/client'
import * as argon2 from 'argon2'
import { AuthService } from '../src/modules/auth/auth.service'
import { AuthSessionService } from '../src/modules/auth/auth-session.service'
import { AuthLoginService } from '../src/modules/auth/auth-login.service'
import { AuthRegistrationService } from '../src/modules/auth/auth-registration.service'
import { AuthPasswordService } from '../src/modules/auth/auth-password.service'
import { AuthEmailVerificationService } from '../src/modules/auth/auth-email-verification.service'
import { makeOwnerAuthContext, makeStaffAuthContext } from './helpers/auth-context.factory'
import { makeRequestContext } from './helpers/request-context.factory'

jest.mock('argon2', () => ({
  __esModule: true,
  default: {
    hash: jest.fn(async () => 'hashed-password-new'),
    verify: jest.fn(async () => false),
    argon2id: 2,
  },
  hash: jest.fn(async () => 'hashed-password-new'),
  verify: jest.fn(async () => false),
  argon2id: 2,
}))

const mockArgon2Hash = argon2.hash as jest.Mock
const mockArgon2Verify = argon2.verify as jest.Mock

type SetupOptions = {
  configOverrides?: Record<string, string | undefined>
}

type RateLimitStateMock = {
  count: number
  firstAttemptAt: number
  lockedUntil: number | null
}

type SessionSummaryMock = {
  id: string
  tokenHash?: string
  ipAddress?: string | null
  userAgent?: string | null
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
    LOGIN_ALERT_EMAILS_ENABLED: 'false',
    COOKIE_SECURE: 'false',
    COOKIE_SAME_SITE: 'lax',
    CSRF_SECRET: 'csrf-secret-with-32-characters-123',
    COOKIE_SECRET: 'cookie-secret-fallback',
    CONSENT_VERSION: '2026.03',
    ...options.configOverrides,
  }

  const prisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    session: {
      findUnique: jest.fn(),
      findMany: jest.fn(async (): Promise<SessionSummaryMock[]> => []),
      create: jest.fn(async () => ({ id: 'session-created' })),
      update: jest.fn(async () => ({})),
      updateMany: jest.fn(async () => ({ count: 1 })),
    },
    oneTimeCode: {
      updateMany: jest.fn(async () => ({ count: 0 })),
      create: jest.fn(async () => ({
        id: 'code-1',
        codeHash: 'hash',
        expiresAt: new Date(Date.now() + 15 * 60_000),
      })),
      deleteMany: jest.fn(async () => ({ count: 1 })),
      findFirst: jest.fn(),
      update: jest.fn(async () => ({})),
    },
    $transaction: jest.fn(async (operations: Array<Promise<unknown>>) => Promise.all(operations)),
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
    sendPasswordResetEmail: jest.fn(async () => ({ mode: 'email' as const })),
    sendEmailVerificationEmail: jest.fn(async () => ({ mode: 'email' as const })),
    sendPasswordChangedEmail: jest.fn(async () => ({ mode: 'email' as const })),
    sendLoginAlertEmail: jest.fn(async () => ({ mode: 'email' as const })),
    sendFailedLoginAlertEmail: jest.fn(async () => ({ mode: 'email' as const })),
  }

  const audit = {
    record: jest.fn(async () => {}),
  }

  const rateLimit = {
    buildPasswordResetKey: jest.fn((email: string, ip: string | null) => `rl:pr:${email}:${ip ?? 'unknown'}`),
    buildPasswordResetEmailKey: jest.fn((email: string) => `rl:pr:email:${email}`),
    buildPasswordResetCodeKey: jest.fn((email: string, ip: string | null) => `rl:prc:${email}:${ip ?? 'unknown'}`),
    buildPasswordResetCodeEmailKey: jest.fn((email: string) => `rl:prc:email:${email}`),
    buildEmailVerificationKey: jest.fn((email: string, ip: string | null) => `rl:ev:${email}:${ip ?? 'unknown'}`),
    buildEmailVerificationEmailKey: jest.fn((email: string) => `rl:ev:email:${email}`),
    buildEmailVerificationCodeKey: jest.fn((email: string, ip: string | null) => `rl:evc:${email}:${ip ?? 'unknown'}`),
    buildEmailVerificationCodeEmailKey: jest.fn((email: string) => `rl:evc:email:${email}`),
    assertPasswordResetAllowed: jest.fn(async () => {}),
    assertPasswordResetCodeAllowed: jest.fn(async () => {}),
    assertEmailVerificationAllowed: jest.fn(async () => {}),
    assertEmailVerificationCodeAllowed: jest.fn(async () => {}),
    recordPasswordResetAttempt: jest.fn(
      async (): Promise<RateLimitStateMock> => ({
        count: 1,
        firstAttemptAt: Date.now(),
        lockedUntil: null,
      }),
    ),
    recordPasswordResetCodeAttempt: jest.fn(
      async (): Promise<RateLimitStateMock> => ({
        count: 1,
        firstAttemptAt: Date.now(),
        lockedUntil: null,
      }),
    ),
    recordEmailVerificationAttempt: jest.fn(
      async (): Promise<RateLimitStateMock> => ({
        count: 1,
        firstAttemptAt: Date.now(),
        lockedUntil: null,
      }),
    ),
    recordEmailVerificationCodeAttempt: jest.fn(async () => ({
      count: 1,
      firstAttemptAt: Date.now(),
      lockedUntil: null,
    })),
    clear: jest.fn(async () => {}),
  }

  const demo = {
    isDemoAccount: jest.fn(() => false),
    reserveWindow: jest.fn(async () => null),
    attachGrant: jest.fn(async () => {}),
    closeGrantForSession: jest.fn(async () => {}),
    closeGrantsForUser: jest.fn(async () => {}),
    buildEvaluationAccess: jest.fn(() => null),
  }

  const cache = {
    set: jest.fn(async () => {}),
    get: jest.fn(async (): Promise<any> => null),
    del: jest.fn(async () => {}),
    delByPrefix: jest.fn(async () => {}),
    isReady: jest.fn(() => true),
  }

  const realtimeSessions = {
    disconnectSessions: jest.fn(),
  }

  const session = {
    createSession: jest.fn(async () => ({
      token: 'mock-token',
      expiresAt: new Date(Date.now() + 86400000),
      sessionId: 'session-1',
      evaluationAccess: null,
    })),
    cacheAuthSession: jest.fn(async () => {}),
    validateSessionToken: jest.fn(async () => null),
    forgetSessionCache: jest.fn(async () => {}),
    refreshWorkspaceSessionCaches: jest.fn(async () => {}),
    invalidateWorkspaceDerivedCaches: jest.fn(async () => {}),
    setSessionCookies: jest.fn(),
    setCsrfCookie: jest.fn(),
    getSessionCookieName: jest.fn(() => 'dev-session'),
    getCsrfCookieName: jest.fn(() => 'dev-csrf'),
    buildCsrfToken: jest.fn(() => 'mock-csrf'),
    getSessionCookieBaseOptions: jest.fn(() => ({})),
    getCsrfCookieBaseOptions: jest.fn(() => ({})),
  }

  const registration = {
    register: jest.fn(async () => ({
      success: true,
      requiresEmailVerification: true,
      email: 'test@test.com',
      deliveryMode: 'email',
      message: 'ok',
    })),
  }

  const login = {
    login: jest.fn(async () => ({ user: {}, csrfToken: 'mock', session: { expiresAt: new Date() } })),
    loginDemo: jest.fn(async () => ({ user: {}, csrfToken: 'mock', session: { expiresAt: new Date() } })),
  }

  const password = {
    requestPasswordReset: jest.fn(async () => ({ success: true, message: 'ok' })),
    resetPassword: jest.fn(async () => ({ success: true, message: 'ok' })),
  }

  const emailVerification = {
    requestEmailVerification: jest.fn(async () => ({ success: true, message: 'ok' })),
    verifyEmail: jest.fn(async () => ({ success: true, message: 'ok' })),
    sendEmailVerificationCode: jest.fn(async () => ({ deliveryMode: 'email' })),
  }

  const sessionService = new AuthSessionService(
    prisma as any,
    config as unknown as ConfigService,
    demo as any,
    realtimeSessions as any,
    cache as any,
  )
  const emailVerificationService = new AuthEmailVerificationService(
    prisma as any,
    config as unknown as ConfigService,
    mailer as any,
    audit as any,
    rateLimit as any,
  )
  const consentSvc = {
    recordLegalAcceptances: jest.fn(async () => {}),
    updateCookiePreferences: jest.fn(async () => {}),
    getVersion: jest.fn(() => '2026.03'),
  }
  const geocodingSvc = { geocodeAddressLocation: jest.fn(async () => null) }
  const registrationService = new AuthRegistrationService(
    prisma as any,
    config as unknown as ConfigService,
    consentSvc as any,
    geocodingSvc as any,
    mailer as any,
    audit as any,
    emailVerificationService,
  )
  const passwordService = new AuthPasswordService(
    prisma as any,
    config as unknown as ConfigService,
    mailer as any,
    audit as any,
    rateLimit as any,
    sessionService,
    demo as any,
  )
  const loginService = new AuthLoginService(
    prisma as any,
    config as unknown as ConfigService,
    mailer as any,
    audit as any,
    rateLimit as any,
    demo as any,
    sessionService,
    emailVerificationService,
  )

  const service = new AuthService(
    prisma as any,
    config as unknown as ConfigService,
    mailer as any,
    audit as any,
    rateLimit as any,
    demo as any,
    sessionService,
    registrationService,
    loginService,
    passwordService,
    emailVerificationService,
  )

  return {
    service,
    prisma,
    config,
    mailer,
    audit,
    rateLimit,
    demo,
    cache,
    sessionService,
    passwordService,
    emailVerificationService,
  }
}

describe('AuthService session and recovery flows', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockArgon2Hash.mockResolvedValue('hashed-password-new')
    mockArgon2Verify.mockResolvedValue(false)
  })

  it('retorna sessao em cache sem consultar banco', async () => {
    const { service, prisma, cache } = createSetup()
    const auth = makeOwnerAuthContext({ sessionId: 'session-cached' })
    cache.get.mockResolvedValue({
      tokenHash: 'cached-hash',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      auth,
    })

    const result = await service.validateSessionToken('raw-token')

    expect(result).toEqual(auth)
    expect(cache.get).toHaveBeenCalledWith(expect.stringMatching(/^auth:session:token:/))
    expect(prisma.session.findUnique).not.toHaveBeenCalled()
  })

  it('retorna null quando token nao existe', async () => {
    const { service, prisma, cache } = createSetup()
    cache.get.mockResolvedValue(null)
    prisma.session.findUnique.mockResolvedValue(null)

    await expect(service.validateSessionToken('missing-token')).resolves.toBeNull()
  })

  it('fecha acesso demo e retorna null quando sessao esta revogada', async () => {
    const { service, prisma, demo, cache } = createSetup()
    cache.get.mockResolvedValue(null)
    prisma.session.findUnique.mockResolvedValue({
      id: 'session-revoked',
      tokenHash: 'hash-revoked',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: new Date(),
      lastSeenAt: new Date(),
      user: null,
      employee: null,
      workspaceOwner: null,
    })

    await expect(service.validateSessionToken('revoked-token')).resolves.toBeNull()
    expect(demo.closeGrantForSession).toHaveBeenCalledWith('session-revoked')
  })

  it('reconstroi auth de sessao owner ativa e renova cache/lastSeen', async () => {
    const { service, prisma, cache, demo } = createSetup()
    cache.get.mockResolvedValue(null)
    prisma.session.findUnique.mockResolvedValue({
      id: 'session-1',
      tokenHash: 'token-hash-1',
      expiresAt: new Date(Date.now() + 30 * 60_000),
      revokedAt: null,
      lastSeenAt: new Date(Date.now() - 16 * 60_000),
      user: {
        id: 'owner-1',
        companyOwnerId: null,
        fullName: 'Owner One',
        companyName: 'Empresa Imperial',
        companyStreetLine1: 'Rua A',
        companyStreetNumber: '123',
        companyAddressComplement: null,
        companyDistrict: 'Centro',
        companyCity: 'Sao Paulo',
        companyState: 'SP',
        companyPostalCode: '01000-000',
        companyCountry: 'Brasil',
        companyLatitude: -23.55,
        companyLongitude: -46.63,
        hasEmployees: true,
        employeeCount: 5,
        role: UserRole.OWNER,
        email: 'owner@empresa.com',
        emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        preferredCurrency: CurrencyCode.BRL,
        status: UserStatus.ACTIVE,
        cookiePreference: { analytics: true, marketing: false },
        employeeAccount: null,
      },
      employee: null,
      workspaceOwner: null,
    })

    const result = await service.validateSessionToken('active-token')

    expect(result).toEqual(
      expect.objectContaining({
        userId: 'owner-1',
        sessionId: 'session-1',
        role: 'OWNER',
      }),
    )
    expect(demo.buildEvaluationAccess).toHaveBeenCalledTimes(1)
    expect(prisma.session.update).toHaveBeenCalledTimes(1)
    expect(cache.set).toHaveBeenCalledTimes(2)
  })

  it('reconstroi sessao STAFF usando loginUser vinculado quando session.user esta vazio', async () => {
    const { service, prisma, cache } = createSetup()
    cache.get.mockResolvedValue(null)
    prisma.session.findUnique.mockResolvedValue({
      id: 'session-staff-rebuild',
      tokenHash: 'token-hash-staff-rebuild',
      expiresAt: new Date(Date.now() + 30 * 60_000),
      revokedAt: null,
      lastSeenAt: new Date(Date.now() - 16 * 60_000),
      user: null,
      employee: {
        id: 'emp-1',
        active: true,
        employeeCode: 'VD-001',
        displayName: 'Marina Vendas',
        loginUser: {
          id: 'staff-user-1',
        },
      },
      workspaceOwner: {
        id: 'owner-1',
        companyOwnerId: null,
        fullName: 'Owner One',
        companyName: 'Empresa Imperial',
        companyStreetLine1: 'Rua A',
        companyStreetNumber: '123',
        companyAddressComplement: null,
        companyDistrict: 'Centro',
        companyCity: 'Sao Paulo',
        companyState: 'SP',
        companyPostalCode: '01000-000',
        companyCountry: 'Brasil',
        companyLatitude: -23.55,
        companyLongitude: -46.63,
        hasEmployees: true,
        employeeCount: 5,
        email: 'owner@empresa.com',
        emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        preferredCurrency: CurrencyCode.BRL,
        status: UserStatus.ACTIVE,
        cookiePreference: { analytics: true, marketing: false },
      },
    })

    const result = await service.validateSessionToken('staff-session-token')

    expect(result).toEqual(
      expect.objectContaining({
        role: 'STAFF',
        userId: 'staff-user-1',
        actorUserId: 'staff-user-1',
        workspaceOwnerUserId: 'owner-1',
        employeeId: 'emp-1',
        employeeCode: 'VD-001',
      }),
    )
  })

  it('logout revoga sessao, limpa cookies e invalida cache', async () => {
    const { service, prisma, demo, audit, cache } = createSetup()
    const auth = makeOwnerAuthContext({ sessionId: 'session-logout' })
    const context = makeRequestContext()
    const response = {
      clearCookie: jest.fn(),
    }
    cache.get.mockResolvedValue({ tokenHash: 'from-cache' })

    const result = await service.logout(auth, response as any, context)

    expect(result).toEqual({ success: true })
    expect(demo.closeGrantForSession).toHaveBeenCalledWith('session-logout')
    expect(prisma.session.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'session-logout', revokedAt: null },
      }),
    )
    expect(response.clearCookie).toHaveBeenCalledTimes(3)
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'auth.logout.succeeded' }))
    expect(cache.del).toHaveBeenCalledTimes(8)
    expect(cache.del).toHaveBeenCalledWith('auth:session:token:from-cache')
    expect(cache.del).toHaveBeenCalledWith('auth:session:id:session-logout')
    expect(cache.del).toHaveBeenCalledWith('auth:session:negative:from-cache')
  })

  it('getCurrentUser emite csrf cookie e retorna payload de sessao', async () => {
    const { service } = createSetup()
    const auth = makeOwnerAuthContext({ sessionId: 'session-current-user' })
    const response = {
      cookie: jest.fn(),
    }

    const result = await service.getCurrentUser(auth, response as any)

    expect(response.cookie).toHaveBeenCalledTimes(1)
    expect(result.user).toEqual(auth)
    expect(result.csrfToken).toMatch(/^[0-9a-f]{64}$/)
  })

  it('updateProfile persiste dados, audita evento e invalida caches do workspace', async () => {
    const { service, prisma, audit, cache } = createSetup()
    const auth = makeOwnerAuthContext({ sessionId: 'session-profile' })
    const context = makeRequestContext()
    prisma.session.findMany.mockResolvedValue([
      { id: 'session-profile', tokenHash: 'profile-token' },
      { id: 'session-other', tokenHash: 'profile-other' },
    ])
    prisma.session.findUnique.mockResolvedValue({ tokenHash: 'profile-token' })
    prisma.user.update.mockResolvedValue({
      id: auth.userId,
      companyOwnerId: null,
      fullName: 'Novo Nome',
      companyName: 'Nova Empresa',
      companyStreetLine1: 'Rua Nova',
      companyStreetNumber: '200',
      companyAddressComplement: null,
      companyDistrict: 'Centro',
      companyCity: 'Sao Paulo',
      companyState: 'SP',
      companyPostalCode: '01000-000',
      companyCountry: 'Brasil',
      companyLatitude: -23.55,
      companyLongitude: -46.63,
      hasEmployees: true,
      employeeCount: 5,
      role: UserRole.OWNER,
      email: auth.email,
      emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
      preferredCurrency: CurrencyCode.BRL,
      status: UserStatus.ACTIVE,
      cookiePreference: {
        analytics: true,
        marketing: false,
      },
      employeeAccount: null,
    })

    const result = await service.updateProfile(
      auth,
      {
        fullName: 'Novo Nome',
        companyName: 'Nova Empresa',
        preferredCurrency: CurrencyCode.BRL,
      },
      context,
    )

    expect(result.user.fullName).toBe('Novo Nome')
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: auth.userId },
      }),
    )
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'auth.profile.updated' }))
    // refreshWorkspaceSessionCaches limpa as sessoes do workspace e o update invalida caches derivados
    expect(cache.del).toHaveBeenCalledWith('auth:session:token:profile-token')
    expect(cache.del).toHaveBeenCalledWith('auth:session:id:session-profile')
    expect(cache.del).toHaveBeenCalledWith('auth:session:token:profile-other')
    expect(cache.del).toHaveBeenCalledWith('auth:session:id:session-other')
    expect(cache.del).toHaveBeenCalledWith('finance:summary:owner-1')
    expect(cache.del).toHaveBeenCalledWith('finance:pillars:owner-1')
  })

  it('updateProfile rejeita sessao STAFF', async () => {
    const { service, prisma } = createSetup()
    const auth = makeStaffAuthContext({ sessionId: 'session-staff-profile' })

    await expect(
      service.updateProfile(
        auth,
        {
          fullName: 'Nome indevido',
          companyName: 'Empresa indevida',
          preferredCurrency: CurrencyCode.BRL,
        },
        makeRequestContext(),
      ),
    ).rejects.toThrow('Apenas o dono da empresa pode atualizar o perfil.')

    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('revokeEmployeeSessions revoga as sessoes do funcionario e limpa cache', async () => {
    const { service, prisma, cache, demo } = createSetup()
    prisma.session.findMany.mockResolvedValue([
      { id: 'session-employee-1', tokenHash: 'employee-token-1' },
      { id: 'session-employee-2', tokenHash: 'employee-token-2' },
    ])

    await service.revokeEmployeeSessions('employee-1')

    expect(prisma.session.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          employeeId: 'employee-1',
          revokedAt: null,
        },
        data: {
          revokedAt: expect.any(Date),
        },
      }),
    )
    expect(cache.del).toHaveBeenCalledWith('auth:session:token:employee-token-1')
    expect(cache.del).toHaveBeenCalledWith('auth:session:id:session-employee-1')
    expect(cache.del).toHaveBeenCalledWith('auth:session:token:employee-token-2')
    expect(cache.del).toHaveBeenCalledWith('auth:session:id:session-employee-2')
    expect(demo.closeGrantForSession).toHaveBeenCalledWith('session-employee-1')
    expect(demo.closeGrantForSession).toHaveBeenCalledWith('session-employee-2')
  })

  it('requestPasswordReset retorna mensagem generica quando usuario nao existe', async () => {
    const { service, prisma, audit, rateLimit } = createSetup()
    prisma.user.findUnique.mockResolvedValue(null)
    const context = makeRequestContext()

    const result = await service.requestPasswordReset({ email: 'missing@empresa.com' }, context)

    expect(result).toEqual({
      success: true,
      message: 'Se o email estiver cadastrado e ativo, enviaremos um codigo de redefinicao em instantes.',
    })
    expect(rateLimit.recordPasswordResetAttempt).toHaveBeenCalledTimes(2)
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'auth.password-reset.requested' }))
  })

  it('requestPasswordReset retorna mensagem generica quando email nao foi verificado', async () => {
    const { service, prisma, audit, rateLimit } = createSetup()
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      fullName: 'Owner',
      email: 'owner@empresa.com',
      status: UserStatus.ACTIVE,
      emailVerifiedAt: null,
    })

    const result = await service.requestPasswordReset({ email: 'owner@empresa.com' }, makeRequestContext())

    expect(result.success).toBe(true)
    expect(rateLimit.recordPasswordResetAttempt).toHaveBeenCalledTimes(2)
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'auth.password-reset.requested' }))
  })

  it('requestPasswordReset aplica fallback quando envio falha com 503 em contexto local', async () => {
    const { service, prisma, mailer, audit } = createSetup({
      configOverrides: {
        NODE_ENV: 'development',
        PORTFOLIO_EMAIL_FALLBACK: 'true',
      },
    })
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      fullName: 'Owner',
      email: 'owner@empresa.com',
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
    })
    mailer.sendPasswordResetEmail.mockRejectedValue(new HttpException('provider down', HttpStatus.SERVICE_UNAVAILABLE))

    const result = await service.requestPasswordReset({ email: 'owner@empresa.com' }, makeRequestContext())

    expect(result.success).toBe(true)
    expect(mailer.sendPasswordResetEmail).toHaveBeenCalledTimes(1)
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'auth.password-reset.preview_enabled' }))
  })

  it('requestEmailVerification retorna mensagem generica quando email ja esta verificado', async () => {
    const { service, prisma, audit } = createSetup()
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      fullName: 'Owner',
      email: 'owner@empresa.com',
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
    })

    const result = await service.requestEmailVerification({ email: 'owner@empresa.com' }, makeRequestContext())

    expect(result).toEqual({
      success: true,
      message: 'Se o email estiver cadastrado e pendente de confirmacao, enviaremos um novo codigo em instantes.',
    })
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'auth.email-verification.requested' }))
  })

  it('requestEmailVerification retorna mensagem generica quando email nao existe', async () => {
    const { service, prisma, audit } = createSetup()
    prisma.user.findUnique.mockResolvedValue(null)

    const result = await service.requestEmailVerification({ email: 'naoexiste@empresa.com' }, makeRequestContext())

    expect(result).toEqual({
      success: true,
      message: 'Se o email estiver cadastrado e pendente de confirmacao, enviaremos um novo codigo em instantes.',
    })
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'auth.email-verification.requested' }))
  })

  it('verifyEmail incrementa tentativas e falha para email inexistente', async () => {
    const { service, prisma, rateLimit } = createSetup()
    prisma.user.findUnique.mockResolvedValue(null)

    await expect(
      service.verifyEmail(
        {
          email: 'missing@empresa.com',
          code: '123456',
        },
        makeRequestContext(),
      ),
    ).rejects.toThrow('Email invalido ou nao cadastrado.')

    expect(rateLimit.recordEmailVerificationCodeAttempt).toHaveBeenCalledTimes(2)
  })

  it('verifyEmail retorna sucesso quando email ja foi confirmado', async () => {
    const { service, prisma, rateLimit } = createSetup()
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      fullName: 'Owner',
      email: 'owner@empresa.com',
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
      cookiePreference: { analytics: false, marketing: false },
    })

    const result = await service.verifyEmail(
      {
        email: 'owner@empresa.com',
        code: '123456',
      },
      makeRequestContext(),
    )

    expect(result).toEqual({
      success: true,
      message: 'Email ja confirmado. Agora voce pode entrar normalmente.',
    })
    expect(rateLimit.clear).toHaveBeenCalledTimes(2)
  })

  it('resetPassword retorna 429 quando codigo falha e lock esta ativo', async () => {
    const { service, prisma, rateLimit } = createSetup()
    const lockUntil = Date.now() + 30_000
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      fullName: 'Owner',
      email: 'owner@empresa.com',
      passwordHash: 'old-hash',
      status: UserStatus.ACTIVE,
    })
    prisma.oneTimeCode.findFirst.mockResolvedValue(null)
    rateLimit.recordPasswordResetCodeAttempt.mockResolvedValue({
      count: 5,
      firstAttemptAt: Date.now(),
      lockedUntil: lockUntil,
    })

    await expect(
      service.resetPassword(
        {
          email: 'owner@empresa.com',
          code: '123456',
          password: 'NovaSenha@123',
        },
        makeRequestContext(),
      ),
    ).rejects.toThrow('Muitas tentativas de validar o codigo.')

    expect(rateLimit.recordPasswordResetCodeAttempt).toHaveBeenCalledTimes(2)
  })

  it('resetPassword falha para email inexistente e registra tentativas', async () => {
    const { service, prisma, rateLimit } = createSetup()
    prisma.user.findUnique.mockResolvedValue(null)

    await expect(
      service.resetPassword(
        {
          email: 'missing@empresa.com',
          code: '123456',
          password: 'NovaSenha@123',
        },
        makeRequestContext(),
      ),
    ).rejects.toThrow('Email invalido ou nao cadastrado.')

    expect(rateLimit.recordPasswordResetCodeAttempt).toHaveBeenCalledTimes(2)
  })

  it('resetPassword conclui fluxo completo e revoga sessoes ativas', async () => {
    const { service, prisma, cache, rateLimit, audit, demo } = createSetup()
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      fullName: 'Owner',
      email: 'owner@empresa.com',
      passwordHash: 'old-hash',
      status: UserStatus.ACTIVE,
    })
    prisma.oneTimeCode.findFirst.mockResolvedValue({
      id: 'otp-1',
      userId: 'user-1',
      email: 'owner@empresa.com',
    })
    prisma.session.findMany.mockResolvedValue([
      {
        id: 'session-1',
        tokenHash: 'token-hash-1',
      },
    ])
    prisma.session.findUnique.mockResolvedValue({ tokenHash: 'token-hash-1' })
    mockArgon2Verify.mockResolvedValue(false)
    mockArgon2Hash.mockResolvedValue('new-password-hash')

    const result = await service.resetPassword(
      {
        email: 'owner@empresa.com',
        code: '123456',
        password: 'NovaSenha@123',
      },
      makeRequestContext(),
    )

    expect(result).toEqual({
      success: true,
      message: 'Senha redefinida com sucesso. Entre novamente para continuar.',
    })
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    expect(cache.del).toHaveBeenCalledTimes(3)
    expect(cache.del).toHaveBeenCalledWith('auth:session:token:token-hash-1')
    expect(cache.del).toHaveBeenCalledWith('auth:session:id:session-1')
    expect(cache.del).toHaveBeenCalledWith('auth:session:negative:token-hash-1')
    expect(rateLimit.clear).toHaveBeenCalledTimes(2)
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'auth.password-reset.completed' }))
    expect(demo.closeGrantsForUser).toHaveBeenCalledWith('user-1', expect.any(Date))
  })

  it('resetPassword rejeita quando nova senha e igual a senha atual', async () => {
    const { service, prisma } = createSetup()
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      fullName: 'Owner',
      email: 'owner@empresa.com',
      passwordHash: 'old-hash',
      status: UserStatus.ACTIVE,
    })
    prisma.oneTimeCode.findFirst.mockResolvedValue({
      id: 'otp-1',
      userId: 'user-1',
      email: 'owner@empresa.com',
    })
    mockArgon2Verify.mockResolvedValue(true)

    await expect(
      service.resetPassword(
        {
          email: 'owner@empresa.com',
          code: '123456',
          password: 'SenhaAtual@123',
        },
        makeRequestContext(),
      ),
    ).rejects.toThrow('Escolha uma senha diferente da senha atual.')
  })

  it('sendPasswordChangedNotice envia notificacao e audita entrega', async () => {
    const { passwordService, mailer, audit } = createSetup()

    await (passwordService as any).sendPasswordChangedNotice(
      {
        id: 'user-1',
        email: 'owner@empresa.com',
        fullName: 'Owner',
      },
      makeRequestContext(),
      new Date('2026-04-03T00:00:00.000Z'),
    )

    expect(mailer.sendPasswordChangedEmail).toHaveBeenCalledTimes(1)
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'auth.password-reset.notification_sent',
      }),
    )
  })

  it('sendLoginAlertIfEnabled envia alerta para dispositivo nao reconhecido', async () => {
    const { service, prisma, mailer, audit } = createSetup({
      configOverrides: {
        LOGIN_ALERT_EMAILS_ENABLED: 'true',
      },
    })
    prisma.session.findMany.mockResolvedValue([
      {
        id: 'old-session',
        ipAddress: '203.0.113.10',
        userAgent: 'Mozilla/5.0 (Old Browser)',
      },
    ])

    await (service as any).sendLoginAlertIfEnabled(
      {
        id: 'user-1',
        email: 'owner@empresa.com',
        fullName: 'Owner',
      },
      makeRequestContext({ ipAddress: '127.0.0.1', userAgent: 'Mozilla/5.0 (New Browser)' }),
      'current-session',
    )

    expect(mailer.sendLoginAlertEmail).toHaveBeenCalledTimes(1)
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'auth.login.notification_sent' }))
  })
})
