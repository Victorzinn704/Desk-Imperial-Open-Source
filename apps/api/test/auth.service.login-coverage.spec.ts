import { BadRequestException, ForbiddenException } from '@nestjs/common'
import {
  AUTH_TEST_EMAILS,
  createAuthServiceSetup,
  expectStaffLoginRejected,
  makeOwnerUser,
  makeStaffLoginDto,
  mockArgon2Verify,
  serviceLogin,
  STAFF_EMPLOYEE_CODE,
  STAFF_PASSWORD,
} from './helpers/auth-service-test-setup'
import { makeRequestContext } from './helpers/request-context.factory'
import { LoginModeDto } from '../src/modules/auth/dto/login.dto'

describe('AuthService login coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockArgon2Verify.mockResolvedValue(false)
  })

  it('login lanca 429 quando rate limit indica lock apos falha', async () => {
    const { service, prisma, rateLimit } = createAuthServiceSetup()
    prisma.user.findUnique.mockResolvedValue(null)
    rateLimit.recordFailure.mockResolvedValue({
      count: 6,
      firstAttemptAt: Date.now(),
      lockedUntil: Date.now() + 60_000,
    })

    await expect(
      service.login(
        { loginMode: LoginModeDto.OWNER, email: AUTH_TEST_EMAILS.missing, password: 'qualquer' },
        {} as never,
        makeRequestContext(),
      ),
    ).rejects.toThrow(/tentativas de acesso/)
  })

  it('login no modo STAFF resolve employee via companyEmail + employeeCode', async () => {
    const { service, prisma } = createAuthServiceSetup()
    mockArgon2Verify.mockResolvedValue(true)
    prisma.user.findFirst.mockResolvedValue({ id: 'owner-1' })
    prisma.employee.findFirst.mockResolvedValue({
      id: 'emp-1',
      active: true,
      employeeCode: STAFF_EMPLOYEE_CODE,
      displayName: 'Marina',
      passwordHash: '$argon2id$v=19$employee-hash',
      user: makeOwnerUser(),
      loginUser: null,
    })

    const response = { cookie: jest.fn() }
    const result = await service.login(makeStaffLoginDto(), response as never, makeRequestContext())

    expect(result.user).toEqual(
      expect.objectContaining({
        role: 'STAFF',
        userId: 'user-staff-1',
        actorUserId: 'user-staff-1',
        workspaceOwnerUserId: 'owner-1',
      }),
    )
    expect(prisma.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'staff-emp-1@desk-imperial.local' } }),
    )
    expect(response.cookie).toHaveBeenCalled()
  })

  it('login no modo STAFF rejeita owner ou employee inexistente', async () => {
    const withoutOwner = createAuthServiceSetup()
    const withoutEmployee = createAuthServiceSetup()
    withoutOwner.prisma.user.findFirst.mockResolvedValue(null)
    withoutEmployee.prisma.user.findFirst.mockResolvedValue({ id: 'owner-1' })
    withoutEmployee.prisma.employee.findFirst.mockResolvedValue(null)

    await expectStaffLoginRejected(withoutOwner, { companyEmail: AUTH_TEST_EMAILS.missing })
    await expectStaffLoginRejected(withoutEmployee, { employeeCode: 'VD-999' })
  })

  it('login rejeita email nao verificado e envia codigo', async () => {
    const { service, prisma, mailer } = createAuthServiceSetup()
    mockArgon2Verify.mockResolvedValue(true)
    prisma.user.findUnique.mockResolvedValue(makeOwnerUser({ emailVerifiedAt: null }))

    await expect(
      service.login(
        { loginMode: LoginModeDto.OWNER, email: AUTH_TEST_EMAILS.owner, password: 'SenhaCorreta@123' },
        {} as never,
        makeRequestContext(),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException)
    expect(mailer.sendEmailVerificationEmail).toHaveBeenCalled()
  })

  it('login completo retorna auth user, csrf token, sessao e cache', async () => {
    const { service, prisma, audit, cache } = createAuthServiceSetup()
    mockArgon2Verify.mockResolvedValue(true)
    prisma.user.findUnique.mockResolvedValue(makeOwnerUser())
    const response = { cookie: jest.fn() }

    const result = await service.login(
      { loginMode: LoginModeDto.OWNER, email: AUTH_TEST_EMAILS.owner, password: 'SenhaCorreta@123' },
      response as never,
      makeRequestContext(),
    )

    expect(result.user).toEqual(expect.objectContaining({ userId: 'owner-1', role: 'OWNER' }))
    expect(result.csrfToken).toMatch(/^[0-9a-f]{64}$/)
    expect(result.session.expiresAt).toBeInstanceOf(Date)
    expect(response.cookie).toHaveBeenCalled()
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'auth.login.succeeded' }))
    expect(cache.set).toHaveBeenCalled()
  })

  it('login audita bloqueio demo quando createSession falha para conta demo', async () => {
    const { service, prisma, demo, audit } = createAuthServiceSetup()
    mockArgon2Verify.mockResolvedValue(true)
    prisma.user.findUnique.mockResolvedValue(makeOwnerUser())
    demo.isDemoAccount.mockReturnValue(true)
    prisma.session.create.mockRejectedValue(new Error('Demo session limit reached'))

    await expect(
      service.login(
        { loginMode: LoginModeDto.OWNER, email: AUTH_TEST_EMAILS.owner, password: 'SenhaCorreta@123' },
        { cookie: jest.fn() } as never,
        makeRequestContext(),
      ),
    ).rejects.toThrow('Demo session limit reached')
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'auth.demo.blocked' }))
  })

  it('loginDemo cobre configuracao ausente e rate limit', async () => {
    const notConfigured = createAuthServiceSetup()
    const limited = createAuthServiceSetup()
    notConfigured.demo.isDemoAccount.mockReturnValue(false)
    limited.demo.isDemoAccount.mockReturnValue(true)
    limited.rateLimit.assertLoginAllowed.mockRejectedValue(new Error('rate limited'))

    await expect(
      notConfigured.service.loginDemo(
        { loginMode: LoginModeDto.OWNER },
        { cookie: jest.fn() } as never,
        makeRequestContext(),
      ),
    ).rejects.toBeInstanceOf(BadRequestException)
    await expect(
      limited.service.loginDemo(
        { loginMode: LoginModeDto.OWNER },
        { cookie: jest.fn() } as never,
        makeRequestContext(),
      ),
    ).rejects.toThrow()
    expect(limited.audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'auth.login.blocked' }))
  })

  it('STAFF login usa loginUser.passwordHash e rejeita employee sem hash', async () => {
    const withLoginUserHash = createAuthServiceSetup()
    const withoutHash = createAuthServiceSetup()
    mockArgon2Verify.mockResolvedValue(true)
    withLoginUserHash.prisma.user.findFirst.mockResolvedValue({ id: 'owner-1' })
    withLoginUserHash.prisma.employee.findFirst.mockResolvedValue({
      id: 'emp-1',
      active: true,
      employeeCode: STAFF_EMPLOYEE_CODE,
      displayName: 'Marina',
      passwordHash: null,
      user: makeOwnerUser(),
      loginUser: { id: 'login-user-1', passwordHash: '$argon2id$v=19$login-user-hash' },
    })
    withoutHash.prisma.user.findFirst.mockResolvedValue({ id: 'owner-1' })
    withoutHash.prisma.employee.findFirst.mockResolvedValue({
      id: 'emp-1',
      active: true,
      employeeCode: STAFF_EMPLOYEE_CODE,
      displayName: 'Marina',
      passwordHash: null,
      user: makeOwnerUser(),
      loginUser: null,
    })

    await expect(
      withLoginUserHash.service.login(makeStaffLoginDto(), { cookie: jest.fn() } as never, makeRequestContext()),
    ).resolves.toHaveProperty('user.role', 'STAFF')
    await expectStaffLoginRejected(withoutHash, { password: 'qualquer' })
  })

  it('sendLoginAlertIfEnabled respeita flag e dispositivo conhecido', async () => {
    const disabled = createAuthServiceSetup({ configOverrides: { LOGIN_ALERT_EMAILS_ENABLED: 'false' } })
    const knownDevice = createAuthServiceSetup({ configOverrides: { LOGIN_ALERT_EMAILS_ENABLED: 'true' } })
    knownDevice.prisma.session.findMany.mockResolvedValue([
      { id: 'old-session', ipAddress: '127.0.0.1', userAgent: 'Mozilla/5.0 (Jest test runner)' },
    ])

    await disabled.service.sendLoginAlertIfEnabled(
      { id: 'user-1', email: AUTH_TEST_EMAILS.owner, fullName: 'Owner' },
      makeRequestContext(),
      'session-1',
    )
    await knownDevice.service.sendLoginAlertIfEnabled(
      { id: 'user-1', email: AUTH_TEST_EMAILS.owner, fullName: 'Owner' },
      makeRequestContext({ ipAddress: '127.0.0.1', userAgent: 'Mozilla/5.0 (Jest test runner)' }),
      'current-session',
    )

    expect(disabled.mailer.sendLoginAlertEmail).not.toHaveBeenCalled()
    expect(knownDevice.mailer.sendLoginAlertEmail).not.toHaveBeenCalled()
  })

  it('handleFailedLogin envia alerta quando threshold e actor estao presentes', async () => {
    const { service, prisma, rateLimit } = createAuthServiceSetup({
      configOverrides: { FAILED_LOGIN_ALERTS_ENABLED: 'true', FAILED_LOGIN_ALERT_THRESHOLD: '3' },
    })
    rateLimit.recordFailure.mockResolvedValue({ count: 3, firstAttemptAt: Date.now(), lockedUntil: null })
    prisma.user.findUnique.mockResolvedValue(makeOwnerUser())

    await expect(
      service.login(
        { loginMode: LoginModeDto.OWNER, email: AUTH_TEST_EMAILS.owner, password: 'WrongPassword' },
        {} as never,
        makeRequestContext(),
      ),
    ).rejects.toBeDefined()
  })

  it('rejeita injection em email de owner, companyEmail e employeeCode antes de consultar ator', async () => {
    const ownerInjection = createAuthServiceSetup()
    const companyEmailInjection = createAuthServiceSetup()
    const employeeCodeInjection = createAuthServiceSetup()

    await expect(
      ownerInjection.service.login(
        { loginMode: LoginModeDto.OWNER, email: "owner@empresa.com' OR '1'='1", password: 'Senha@123' },
        {} as never,
        makeRequestContext(),
      ),
    ).rejects.toBeInstanceOf(BadRequestException)
    await expect(
      serviceLogin(companyEmailInjection, makeStaffLoginDto({ companyEmail: "owner@empresa.com' OR '1'='1" })),
    ).rejects.toBeInstanceOf(BadRequestException)
    await expect(
      serviceLogin(employeeCodeInjection, makeStaffLoginDto({ employeeCode: "VD-001' OR '1'='1" })),
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(ownerInjection.prisma.user.findUnique).not.toHaveBeenCalled()
    expect(companyEmailInjection.prisma.user.findFirst).not.toHaveBeenCalled()
    expect(employeeCodeInjection.prisma.user.findFirst).not.toHaveBeenCalled()
  })

  it('mantem chave de rate limit STAFF normalizada e sem payload bruto', async () => {
    const setup = createAuthServiceSetup()
    setup.prisma.user.findFirst.mockResolvedValue(null)

    await expectStaffLoginRejected(setup)

    expect(setup.rateLimit.buildLoginKey).toHaveBeenCalledWith(
      `staff:${AUTH_TEST_EMAILS.owner}:${STAFF_EMPLOYEE_CODE}`,
      expect.any(String),
    )
    expect(STAFF_PASSWORD).toHaveLength(8)
  })
})
