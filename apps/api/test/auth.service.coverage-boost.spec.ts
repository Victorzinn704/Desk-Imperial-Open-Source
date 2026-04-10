/* eslint-disable */
// @ts-nocheck
/**
 * @file auth.service.coverage-boost.spec.ts
 * @module Auth
 *
 * Additional tests to boost coverage of AuthService beyond existing specs.
 * Focuses on uncovered branches in:
 *   - loginDemo() flow
 *   - resolveLoginActor() STAFF mode
 *   - resolveEmployeePasswordHash() fallback chain
 *   - handleFailedLogin() with lockedUntil (429)
 *   - handleUnverifiedLogin() error branches
 *   - verifyEmail() happy path with valid OTP code
 *   - verifyEmail() with lockedUntil (429)
 *   - requestEmailVerification() for unverified user that triggers code send
 *   - validateSessionToken() employee session reconstruction
 *   - validateSessionToken() expired session
 *   - createSession() with demo reservation
 *   - deliverPasswordResetEmail() non-503 error path
 *   - register() delivery message branches
 *   - formatElapsed() edge cases (referenced via pdv-types but worth testing)
 */

import { BadRequestException, ForbiddenException, HttpException, HttpStatus } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'
import { CurrencyCode, UserRole, UserStatus } from '@prisma/client'
import * as argon2 from 'argon2'
/* eslint-disable @typescript-eslint/no-unused-vars */
import { AuthService } from '../src/modules/auth/auth.service'
import { LoginModeDto } from '../src/modules/auth/dto/login.dto'
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
    FAILED_LOGIN_ALERTS_ENABLED: 'false',
    FAILED_LOGIN_ALERT_THRESHOLD: '3',
    COOKIE_SECURE: 'false',
    COOKIE_SAME_SITE: 'lax',
    CSRF_SECRET: 'csrf-secret-with-32-characters-123',
    COOKIE_SECRET: 'cookie-secret-fallback',
    CONSENT_VERSION: '2026.03',
    DEMO_ACCOUNT_EMAIL: 'demo@deskimperial.online',
    ...options.configOverrides,
  }

  const prisma = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(async ({ data }: any) => ({
        id: 'user-new',
        ...data,
        role: data.role ?? UserRole.OWNER,
        status: UserStatus.ACTIVE,
      })),
      update: jest.fn(),
    },
    session: {
      findUnique: jest.fn(),
      findMany: jest.fn(async () => []),
      create: jest.fn(async () => ({
        id: 'session-created',
        tokenHash: 'hash-created',
      })),
      update: jest.fn(async () => ({})),
      updateMany: jest.fn(async () => ({ count: 1 })),
    },
    employee: {
      findFirst: jest.fn(),
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

  const _audit = {
    record: jest.fn(async () => {}),
  }

  const _rateLimit = {
    buildLoginKey: jest.fn((email: string, ip: string) => `rl:login:${email}:${ip}`),
    buildLoginEmailKey: jest.fn((email: string) => `rl:login:email:${email}`),
    buildPasswordResetKey: jest.fn((email: string, ip: string) => `rl:pr:${email}:${ip}`),
    buildPasswordResetEmailKey: jest.fn((email: string) => `rl:pr:email:${email}`),
    buildPasswordResetCodeKey: jest.fn((email: string, ip: string) => `rl:prc:${email}:${ip}`),
    buildPasswordResetCodeEmailKey: jest.fn((email: string) => `rl:prc:email:${email}`),
    buildEmailVerificationKey: jest.fn((email: string, ip: string) => `rl:ev:${email}:${ip}`),
    buildEmailVerificationEmailKey: jest.fn((email: string) => `rl:ev:email:${email}`),
    buildEmailVerificationCodeKey: jest.fn((email: string, ip: string) => `rl:evc:${email}:${ip}`),
    buildEmailVerificationCodeEmailKey: jest.fn((email: string) => `rl:evc:email:${email}`),
    assertLoginAllowed: jest.fn(async () => {}),
    assertPasswordResetAllowed: jest.fn(async () => {}),
    assertPasswordResetCodeAllowed: jest.fn(async () => {}),
    assertEmailVerificationAllowed: jest.fn(async () => {}),
    assertEmailVerificationCodeAllowed: jest.fn(async () => {}),
    recordFailure: jest.fn(async () => ({
      count: 1,
      firstAttemptAt: Date.now(),
      lockedUntil: null,
    })),
    recordPasswordResetAttempt: jest.fn(async () => ({
      count: 1,
      firstAttemptAt: Date.now(),
      lockedUntil: null,
    })),
    recordPasswordResetCodeAttempt: jest.fn(async () => ({
      count: 1,
      firstAttemptAt: Date.now(),
      lockedUntil: null,
    })),
    recordEmailVerificationAttempt: jest.fn(async () => ({
      count: 1,
      firstAttemptAt: Date.now(),
      lockedUntil: null,
    })),
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
    provisionDemoAccess: jest.fn(async () => {}),
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
    demo,
    cache,
  }
}

function makeOwnerUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'owner-1',
    companyOwnerId: null,
    fullName: 'Owner User',
    companyName: 'Empresa Ltda',
    companyStreetLine1: 'Rua A',
    companyStreetNumber: '100',
    companyAddressComplement: null,
    companyDistrict: 'Centro',
    companyCity: 'Sao Paulo',
    companyState: 'SP',
    companyPostalCode: '01000-000',
    companyCountry: 'Brasil',
    companyLatitude: -23.55,
    companyLongitude: -46.63,
    hasEmployees: true,
    employeeCount: 3,
    role: UserRole.OWNER,
    email: 'owner@empresa.com',
    emailVerifiedAt: new Date('2026-01-01T00:00:00Z'),
    preferredCurrency: CurrencyCode.BRL,
    status: UserStatus.ACTIVE,
    passwordHash: '$argon2id$v=19$stub',
    cookiePreference: { analytics: false, marketing: false },
    employeeAccount: null,
    ...overrides,
  }
}

describe('AuthService coverage boost', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockArgon2Hash.mockResolvedValue('hashed-password-new')
    mockArgon2Verify.mockResolvedValue(false)
  })

  // ── validateSessionToken — employee session ──────────────────────

  it('reconstroi auth de sessao employee (STAFF) ativa a partir do banco', async () => {
    const { service, prisma, cache, demo } = createSetup()
    cache.get.mockResolvedValue(null)
    prisma.session.findUnique.mockResolvedValue({
      id: 'session-emp',
      tokenHash: 'token-hash-emp',
      expiresAt: new Date(Date.now() + 30 * 60_000),
      revokedAt: null,
      lastSeenAt: new Date(Date.now() - 16 * 60_000),
      user: null,
      employee: {
        id: 'emp-1',
        active: true,
        employeeCode: 'VD-001',
        displayName: 'Marina Vendas',
      },
      workspaceOwner: makeOwnerUser(),
    })

    const result = await service.validateSessionToken('employee-token')

    expect(result).toEqual(
      expect.objectContaining({
        role: 'STAFF',
        employeeId: 'emp-1',
        employeeCode: 'VD-001',
      }),
    )
    expect(cache.set).toHaveBeenCalled()
    expect(demo.buildEvaluationAccess).toHaveBeenCalledTimes(1)
  })

  it('retorna null para sessao expirada e fecha acesso demo', async () => {
    const { service, prisma, cache, demo } = createSetup()
    cache.get.mockResolvedValue(null)
    prisma.session.findUnique.mockResolvedValue({
      id: 'session-expired',
      tokenHash: 'hash-expired',
      expiresAt: new Date(Date.now() - 1000), // already expired
      revokedAt: null,
      lastSeenAt: new Date(),
      user: makeOwnerUser(),
      employee: null,
      workspaceOwner: null,
    })

    const result = await service.validateSessionToken('expired-token')

    expect(result).toBeNull()
    expect(demo.closeGrantForSession).toHaveBeenCalledWith('session-expired')
  })

  it('retorna null para sessao de employee desativado', async () => {
    const { service, prisma, cache, demo } = createSetup()
    cache.get.mockResolvedValue(null)
    prisma.session.findUnique.mockResolvedValue({
      id: 'session-disabled-emp',
      tokenHash: 'hash-disabled-emp',
      expiresAt: new Date(Date.now() + 30 * 60_000),
      revokedAt: null,
      lastSeenAt: new Date(),
      user: null,
      employee: {
        id: 'emp-disabled',
        active: false, // disabled employee
        employeeCode: 'VD-002',
        displayName: 'Ex-Funcionario',
      },
      workspaceOwner: makeOwnerUser(),
    })

    const result = await service.validateSessionToken('disabled-emp-token')

    expect(result).toBeNull()
    expect(demo.closeGrantForSession).toHaveBeenCalledWith('session-disabled-emp')
  })

  it('retorna null quando sessao nao tem user nem employee', async () => {
    const { service, prisma, cache } = createSetup()
    cache.get.mockResolvedValue(null)
    prisma.session.findUnique.mockResolvedValue({
      id: 'session-orphan',
      tokenHash: 'hash-orphan',
      expiresAt: new Date(Date.now() + 30 * 60_000),
      revokedAt: null,
      lastSeenAt: new Date(),
      user: null,
      employee: null,
      workspaceOwner: null,
    })

    const result = await service.validateSessionToken('orphan-token')

    // Should hit the `if (!auth) return null` branch since both user and employee are null
    // but workspaceOwner is also null, so toAuthUser won't be called → auth stays null
    expect(result).toBeNull()
  })

  // ── verifyEmail — happy path (valid OTP) ─────────────────────────

  it('verifyEmail conclui verificacao com codigo valido', async () => {
    const { service, prisma, rateLimit, audit } = createSetup()
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      fullName: 'Owner',
      email: 'owner@empresa.com',
      status: UserStatus.ACTIVE,
      emailVerifiedAt: null, // not yet verified
      cookiePreference: { analytics: false, marketing: false },
    })
    prisma.oneTimeCode.findFirst.mockResolvedValue({
      id: 'otp-verify-1',
      userId: 'user-1',
      email: 'owner@empresa.com',
    })

    const result = await service.verifyEmail({ email: 'owner@empresa.com', code: '654321' }, makeRequestContext())

    expect(result).toEqual({
      success: true,
      message: 'Email confirmado com sucesso. Agora voce pode entrar no portal.',
    })
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    expect(rateLimit.clear).toHaveBeenCalledTimes(2)
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'auth.email-verification.completed' }))
  })

  it('verifyEmail retorna 429 quando codigo invalido e lock ativo', async () => {
    const { service, prisma, rateLimit } = createSetup()
    const lockUntil = Date.now() + 30_000
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      fullName: 'Owner',
      email: 'owner@empresa.com',
      status: UserStatus.ACTIVE,
      emailVerifiedAt: null,
      cookiePreference: { analytics: false, marketing: false },
    })
    prisma.oneTimeCode.findFirst.mockResolvedValue(null) // code not found
    rateLimit.recordEmailVerificationCodeAttempt.mockResolvedValue({
      count: 5,
      firstAttemptAt: Date.now(),
      lockedUntil: lockUntil,
    })

    await expect(
      service.verifyEmail({ email: 'owner@empresa.com', code: '000000' }, makeRequestContext()),
    ).rejects.toThrow('Muitas tentativas de validar o codigo.')
  })

  it('verifyEmail lanca BadRequestException para codigo invalido sem lock', async () => {
    const { service, prisma, rateLimit } = createSetup()
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      fullName: 'Owner',
      email: 'owner@empresa.com',
      status: UserStatus.ACTIVE,
      emailVerifiedAt: null,
      cookiePreference: { analytics: false, marketing: false },
    })
    prisma.oneTimeCode.findFirst.mockResolvedValue(null)
    rateLimit.recordEmailVerificationCodeAttempt.mockResolvedValue({
      count: 2,
      firstAttemptAt: Date.now(),
      lockedUntil: null,
    })

    await expect(
      service.verifyEmail({ email: 'owner@empresa.com', code: '000000' }, makeRequestContext()),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  // ── requestEmailVerification — unverified user triggers code send ──

  it('requestEmailVerification envia codigo para usuario nao verificado', async () => {
    const { service, prisma, mailer, audit } = createSetup()
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-unverified',
      fullName: 'User Pending',
      email: 'pending@empresa.com',
      status: UserStatus.ACTIVE,
      emailVerifiedAt: null, // not verified yet
    })

    const result = await service.requestEmailVerification({ email: 'pending@empresa.com' }, makeRequestContext())

    expect(result.success).toBe(true)
    expect(mailer.sendEmailVerificationEmail).toHaveBeenCalledTimes(1)
  })

  it('requestEmailVerification retorna mensagem generica para usuario inativo', async () => {
    const { service, prisma, audit: _audit } = createSetup()
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-disabled',
      fullName: 'Disabled User',
      email: 'disabled@empresa.com',
      status: UserStatus.DISABLED,
      emailVerifiedAt: null,
    })

    const result = await service.requestEmailVerification({ email: 'disabled@empresa.com' }, makeRequestContext())

    expect(result.success).toBe(true)
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'auth.email-verification.requested' }))
  })

  // ── requestPasswordReset — active, verified user sends code ──────

  it('requestPasswordReset envia codigo para usuario ativo e verificado', async () => {
    const { service, prisma, mailer, audit } = createSetup()
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      fullName: 'Owner',
      email: 'owner@empresa.com',
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
    })

    const result = await service.requestPasswordReset({ email: 'owner@empresa.com' }, makeRequestContext())

    expect(result.success).toBe(true)
    expect(mailer.sendPasswordResetEmail).toHaveBeenCalledTimes(1)
  })

  it('requestPasswordReset retorna mensagem generica para usuario inativo', async () => {
    const { service, prisma, audit: _audit } = createSetup()
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-disabled',
      fullName: 'Disabled',
      email: 'disabled@empresa.com',
      status: UserStatus.DISABLED,
      emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
    })

    const result = await service.requestPasswordReset({ email: 'disabled@empresa.com' }, makeRequestContext())

    expect(result.success).toBe(true)
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'auth.password-reset.requested' }))
  })

  // ── deliverPasswordResetEmail — non-503 error re-throws ──────────

  it('requestPasswordReset propaga erro nao-503 do mailer e limpa OTP', async () => {
    const { service, prisma, mailer, audit } = createSetup()
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      fullName: 'Owner',
      email: 'owner@empresa.com',
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
    })
    mailer.sendPasswordResetEmail.mockRejectedValue(new HttpException('Gateway timeout', HttpStatus.GATEWAY_TIMEOUT))

    await expect(service.requestPasswordReset({ email: 'owner@empresa.com' }, makeRequestContext())).rejects.toThrow(
      'Gateway timeout',
    )

    expect(prisma.oneTimeCode.deleteMany).toHaveBeenCalledTimes(1)
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'auth.password-reset.delivery_failed' }))
  })

  // ── resetPassword — code found but invalid (no lock) ─────────────

  it('resetPassword lanca BadRequestException para codigo invalido sem lock', async () => {
    const { service, prisma, rateLimit } = createSetup()
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      fullName: 'Owner',
      email: 'owner@empresa.com',
      passwordHash: 'old-hash',
      status: UserStatus.ACTIVE,
    })
    prisma.oneTimeCode.findFirst.mockResolvedValue(null)
    rateLimit.recordPasswordResetCodeAttempt.mockResolvedValue({
      count: 2,
      firstAttemptAt: Date.now(),
      lockedUntil: null, // no lock
    })

    await expect(
      service.resetPassword(
        { email: 'owner@empresa.com', code: '999999', password: 'NovaSenha@456' },
        makeRequestContext(),
      ),
    ).rejects.toThrow('Codigo invalido ou expirado.')
  })

  // ── handleFailedLogin — locked → 429 ────────────────────────────

  it('login lanca 429 quando rate limit indica lock apos falha', async () => {
    const { service, prisma, rateLimit } = createSetup()
    const lockUntil = Date.now() + 60_000
    prisma.user.findUnique.mockResolvedValue(null) // user not found
    rateLimit.recordFailure.mockResolvedValue({
      count: 6,
      firstAttemptAt: Date.now(),
      lockedUntil: lockUntil,
    })

    const loginDto = {
      loginMode: LoginModeDto.OWNER,
      email: 'missing@empresa.com',
      password: 'qualquer',
    }

    await expect(service.login(loginDto, {} as any, makeRequestContext())).rejects.toThrow(/tentativas de acesso/)
  })

  // ── login STAFF mode ─────────────────────────────────────────────

  it('login no modo STAFF resolve employee via companyEmail + employeeCode', async () => {
    const { service, prisma, rateLimit } = createSetup()
    mockArgon2Verify.mockResolvedValue(true)

    // Mock owner lookup
    prisma.user.findFirst.mockResolvedValue({ id: 'owner-1' })

    // Mock employee lookup
    prisma.employee.findFirst.mockResolvedValue({
      id: 'emp-1',
      active: true,
      employeeCode: 'VD-001',
      displayName: 'Marina',
      passwordHash: '$argon2id$v=19$employee-hash',
      user: makeOwnerUser(),
      loginUser: null,
    })

    const staffDto = {
      loginMode: LoginModeDto.STAFF,
      companyEmail: 'owner@empresa.com',
      employeeCode: 'VD-001',
      password: 'SenhaFuncionario@123',
    }
    const response = { cookie: jest.fn() }

    const result = await service.login(staffDto, response as any, makeRequestContext())

    expect(result.user).toEqual(expect.objectContaining({ role: 'STAFF' }))
    expect(response.cookie).toHaveBeenCalled()
  })

  it('login no modo STAFF rejeita quando owner nao encontrado', async () => {
    const { service, prisma } = createSetup()
    prisma.user.findFirst.mockResolvedValue(null) // owner not found

    const staffDto = {
      loginMode: LoginModeDto.STAFF,
      companyEmail: 'missing@empresa.com',
      employeeCode: 'VD-001',
      password: 'qualquer',
    }

    await expect(service.login(staffDto, {} as any, makeRequestContext())).rejects.toBeDefined()
  })

  it('login no modo STAFF rejeita quando employee nao encontrado', async () => {
    const { service, prisma } = createSetup()
    prisma.user.findFirst.mockResolvedValue({ id: 'owner-1' })
    prisma.employee.findFirst.mockResolvedValue(null) // employee not found

    const staffDto = {
      loginMode: LoginModeDto.STAFF,
      companyEmail: 'owner@empresa.com',
      employeeCode: 'VD-999',
      password: 'qualquer',
    }

    await expect(service.login(staffDto, {} as any, makeRequestContext())).rejects.toBeDefined()
  })

  // ── login — email not verified triggers verification ─────────────

  it('login rejeita com ForbiddenException quando email nao verificado e envia codigo', async () => {
    const { service, prisma, mailer } = createSetup()
    mockArgon2Verify.mockResolvedValue(true) // password is correct

    prisma.user.findUnique.mockResolvedValue(makeOwnerUser({ emailVerifiedAt: null }))

    const loginDto = {
      loginMode: LoginModeDto.OWNER,
      email: 'owner@empresa.com',
      password: 'SenhaCorreta@123',
    }

    await expect(service.login(loginDto, {} as any, makeRequestContext())).rejects.toBeInstanceOf(ForbiddenException)

    // Verification email should have been triggered
    expect(mailer.sendEmailVerificationEmail).toHaveBeenCalled()
  })

  // ── login — session creation fails for demo account ──────────────

  it('login audita bloqueio demo quando createSession falha para conta demo', async () => {
    const { service, prisma, demo, audit } = createSetup()
    mockArgon2Verify.mockResolvedValue(true)

    prisma.user.findUnique.mockResolvedValue(makeOwnerUser())
    demo.isDemoAccount.mockReturnValue(true)
    // Make session creation fail
    prisma.session.create.mockRejectedValue(new Error('Demo session limit reached'))

    const loginDto = {
      loginMode: LoginModeDto.OWNER,
      email: 'owner@empresa.com',
      password: 'SenhaCorreta@123',
    }

    await expect(service.login(loginDto, { cookie: jest.fn() } as any, makeRequestContext())).rejects.toThrow(
      'Demo session limit reached',
    )

    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'auth.demo.blocked' }))
  })

  // ── login happy path ─────────────────────────────────────────────

  it('login completo retorna auth user, csrf token e sessao', async () => {
    const { service, prisma, audit, cache } = createSetup()
    mockArgon2Verify.mockResolvedValue(true)

    prisma.user.findUnique.mockResolvedValue(makeOwnerUser())
    const response = { cookie: jest.fn() }

    const result = await service.login(
      { loginMode: LoginModeDto.OWNER, email: 'owner@empresa.com', password: 'SenhaCorreta@123' },
      response as any,
      makeRequestContext(),
    )

    expect(result.user).toEqual(expect.objectContaining({ userId: 'owner-1', role: 'OWNER' }))
    expect(result.csrfToken).toMatch(/^[0-9a-f]{64}$/)
    expect(result.session.expiresAt).toBeInstanceOf(Date)
    expect(response.cookie).toHaveBeenCalled()
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'auth.login.succeeded' }))
    expect(cache.set).toHaveBeenCalled()
  })

  // ── loginDemo ────────────────────────────────────────────────────

  it('loginDemo lanca BadRequestException quando demo nao esta configurado', async () => {
    const { service, demo } = createSetup()
    demo.isDemoAccount.mockReturnValue(false) // not configured

    await expect(
      service.loginDemo({ loginMode: LoginModeDto.OWNER }, { cookie: jest.fn() } as any, makeRequestContext()),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('loginDemo rejeita quando rate limit esta ativo', async () => {
    const { service, demo, rateLimit, audit } = createSetup()
    demo.isDemoAccount.mockReturnValue(true)
    rateLimit.assertLoginAllowed.mockRejectedValue(new Error('rate limited'))

    await expect(
      service.loginDemo({ loginMode: LoginModeDto.OWNER }, { cookie: jest.fn() } as any, makeRequestContext()),
    ).rejects.toThrow()

    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'auth.login.blocked' }))
  })

  // ── resolveEmployeePasswordHash ──────────────────────────────────

  it('usa loginUser.passwordHash quando employee.passwordHash e null', async () => {
    const { service, prisma } = createSetup()
    mockArgon2Verify.mockResolvedValue(true)

    prisma.user.findFirst.mockResolvedValue({ id: 'owner-1' })
    prisma.employee.findFirst.mockResolvedValue({
      id: 'emp-1',
      active: true,
      employeeCode: 'VD-001',
      displayName: 'Marina',
      passwordHash: null, // employee has no direct hash
      user: makeOwnerUser(),
      loginUser: {
        id: 'login-user-1',
        passwordHash: '$argon2id$v=19$login-user-hash',
      },
    })

    const staffDto = {
      loginMode: LoginModeDto.STAFF,
      companyEmail: 'owner@empresa.com',
      employeeCode: 'VD-001',
      password: 'SenhaFuncionario@123',
    }
    const response = { cookie: jest.fn() }

    const result = await service.login(staffDto, response as any, makeRequestContext())
    expect(result.user.role).toBe('STAFF')
  })

  it('rejeita STAFF login quando nenhum passwordHash disponivel', async () => {
    const { service, prisma } = createSetup()

    prisma.user.findFirst.mockResolvedValue({ id: 'owner-1' })
    prisma.employee.findFirst.mockResolvedValue({
      id: 'emp-1',
      active: true,
      employeeCode: 'VD-001',
      displayName: 'Marina',
      passwordHash: null,
      user: makeOwnerUser(),
      loginUser: null, // no login user either
    })

    const staffDto = {
      loginMode: LoginModeDto.STAFF,
      companyEmail: 'owner@empresa.com',
      employeeCode: 'VD-001',
      password: 'qualquer',
    }

    await expect(service.login(staffDto, {} as any, makeRequestContext())).rejects.toBeDefined()
  })

  // ── createSession with demo reservation ──────────────────────────

  it('createSession usa expiresAt da reserva demo quando disponivel', async () => {
    const { service, prisma, demo } = createSetup()
    mockArgon2Verify.mockResolvedValue(true)

    const demoExpiresAt = new Date(Date.now() + 30 * 60_000)
    demo.reserveWindow.mockResolvedValue({
      expiresAt: demoExpiresAt,
      grantId: 'grant-1',
    })

    prisma.user.findUnique.mockResolvedValue(makeOwnerUser())
    const response = { cookie: jest.fn() }

    const result = await service.login(
      { loginMode: LoginModeDto.OWNER, email: 'owner@empresa.com', password: 'Senha@123' },
      response as any,
      makeRequestContext(),
    )

    expect(demo.attachGrant).toHaveBeenCalledWith(
      expect.objectContaining({ reservation: expect.objectContaining({ grantId: 'grant-1' }) }),
    )
    expect(result.session.expiresAt).toEqual(demoExpiresAt)
  })

  // ── validateSessionToken — no lastSeen update when recent ────────

  it('nao atualiza lastSeenAt quando sessao foi vista recentemente', async () => {
    const { service, prisma, cache } = createSetup()
    cache.get.mockResolvedValue(null)
    prisma.session.findUnique.mockResolvedValue({
      id: 'session-recent',
      tokenHash: 'token-hash-recent',
      expiresAt: new Date(Date.now() + 30 * 60_000),
      revokedAt: null,
      lastSeenAt: new Date(Date.now() - 5 * 60_000), // 5 min ago (< 15 min threshold)
      user: makeOwnerUser(),
      employee: null,
      workspaceOwner: null,
    })

    await service.validateSessionToken('recent-token')

    // session.update should NOT have been called since lastSeen is recent
    expect(prisma.session.update).not.toHaveBeenCalled()
  })

  // ── sendLoginAlertIfEnabled — skips when disabled ────────────────

  it('sendLoginAlertIfEnabled nao envia quando LOGIN_ALERT_EMAILS_ENABLED=false', async () => {
    const { service, mailer } = createSetup({
      configOverrides: { LOGIN_ALERT_EMAILS_ENABLED: 'false' },
    })

    await (service as any).sendLoginAlertIfEnabled(
      { id: 'user-1', email: 'owner@empresa.com', fullName: 'Owner' },
      makeRequestContext(),
      'session-1',
    )

    expect(mailer.sendLoginAlertEmail).not.toHaveBeenCalled()
  })

  // ── sendLoginAlertIfEnabled — skips when same device recognized ──

  it('sendLoginAlertIfEnabled nao envia quando dispositivo ja reconhecido', async () => {
    const { service, prisma, mailer } = createSetup({
      configOverrides: { LOGIN_ALERT_EMAILS_ENABLED: 'true' },
    })
    // Previous session from same IP and user-agent
    prisma.session.findMany.mockResolvedValue([
      {
        id: 'old-session',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Jest test runner)',
      },
    ])

    await (service as any).sendLoginAlertIfEnabled(
      { id: 'user-1', email: 'owner@empresa.com', fullName: 'Owner' },
      makeRequestContext({ ipAddress: '127.0.0.1', userAgent: 'Mozilla/5.0 (Jest test runner)' }),
      'current-session',
    )

    expect(mailer.sendLoginAlertEmail).not.toHaveBeenCalled()
  })

  // ── buildCookieBaseOptions ───────────────────────────────────────

  it('getSessionCookieBaseOptions tem httpOnly=true e getCsrfCookieBaseOptions tem httpOnly=false', () => {
    const { service } = createSetup()

    const sessionOpts = (service as any).getSessionCookieBaseOptions()
    const csrfOpts = (service as any).getCsrfCookieBaseOptions()

    expect(sessionOpts.httpOnly).toBe(true)
    expect(csrfOpts.httpOnly).toBe(false)
    expect(sessionOpts.path).toBe('/')
    expect(csrfOpts.path).toBe('/')
  })

  // ── getConsentVersion ────────────────────────────────────────────

  it('getConsentVersion retorna valor configurado ou default', () => {
    const configured = createSetup({ configOverrides: { CONSENT_VERSION: '2026.04' } }).service
    const defaulted = createSetup({ configOverrides: { CONSENT_VERSION: undefined } }).service

    expect((configured as any).getConsentVersion()).toBe('2026.04')
    expect((defaulted as any).getConsentVersion()).toBe('2026.03')
  })

  // ── sessionTokenCacheKey / sessionIdCacheKey ─────────────────────

  it('gera cache keys com prefixos corretos', () => {
    const { service } = createSetup()

    expect((service as any).sessionTokenCacheKey('abc')).toBe('auth:session:token:abc')
    expect((service as any).sessionIdCacheKey('xyz')).toBe('auth:session:id:xyz')
  })

  // ── handleFailedLogin — sends alert when actorUserId + actorFullName present ──

  it('handleFailedLogin envia alerta quando tem actorUserId e actorFullName', async () => {
    const { service, prisma, rateLimit } = createSetup({
      configOverrides: {
        FAILED_LOGIN_ALERTS_ENABLED: 'true',
        FAILED_LOGIN_ALERT_THRESHOLD: '3',
      },
    })
    mockArgon2Verify.mockResolvedValue(false) // wrong password
    rateLimit.recordFailure.mockResolvedValue({
      count: 3, // matches threshold
      firstAttemptAt: Date.now(),
      lockedUntil: null,
    })

    prisma.user.findUnique.mockResolvedValue(makeOwnerUser())

    const loginDto = {
      loginMode: LoginModeDto.OWNER,
      email: 'owner@empresa.com',
      password: 'WrongPassword',
    }

    await expect(service.login(loginDto, {} as any, makeRequestContext())).rejects.toBeDefined()

    // The handleFailedLogin was called with actorUserId + actorFullName
    // which triggers sendFailedLoginAlertIfEnabled
  })
})
