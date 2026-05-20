import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common'
import { UserStatus } from '@prisma/client'
import {
  AUTH_TEST_EMAILS,
  createAuthServiceSetup,
  INVALID_EMAIL_CODE,
  mockActiveUnverifiedOwner,
  mockEmailVerificationAttempt,
  mockInactiveUserLookup,
  mockMissingOneTimeCode,
  mockOwnerUserLookup,
  VALID_EMAIL_CODE,
} from './helpers/auth-service-test-setup'
import { makeRequestContext } from './helpers/request-context.factory'

describe('AuthService email and recovery coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('verifyEmail conclui verificacao com codigo valido', async () => {
    const setup = createAuthServiceSetup()
    const { service, prisma, rateLimit, audit } = setup
    mockActiveUnverifiedOwner(setup)
    setup.prisma.oneTimeCode.findFirst.mockResolvedValue({
      id: 'otp-verify-1',
      userId: 'user-1',
      email: AUTH_TEST_EMAILS.owner,
    })

    const result = await service.verifyEmail(
      { email: AUTH_TEST_EMAILS.owner, code: VALID_EMAIL_CODE },
      makeRequestContext(),
    )

    expect(result).toEqual({
      success: true,
      message: 'Email confirmado com sucesso. Agora voce pode entrar no portal.',
    })
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    expect(rateLimit.clear).toHaveBeenCalledTimes(2)
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'auth.email-verification.completed' }))
  })

  it('verifyEmail diferencia codigo invalido com e sem lock ativo', async () => {
    const locked = createAuthServiceSetup()
    const unlocked = createAuthServiceSetup()
    const lockUntil = Date.now() + 30_000

    mockActiveUnverifiedOwner(locked)
    mockMissingOneTimeCode(locked)
    mockEmailVerificationAttempt({ setup: locked, lockedUntil: lockUntil })
    mockActiveUnverifiedOwner(unlocked)
    mockMissingOneTimeCode(unlocked)
    mockEmailVerificationAttempt({ setup: unlocked, lockedUntil: null })

    await expect(
      locked.service.verifyEmail({ email: AUTH_TEST_EMAILS.owner, code: INVALID_EMAIL_CODE }, makeRequestContext()),
    ).rejects.toThrow('Muitas tentativas de validar o codigo.')
    await expect(
      unlocked.service.verifyEmail({ email: AUTH_TEST_EMAILS.owner, code: INVALID_EMAIL_CODE }, makeRequestContext()),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('requestEmailVerification envia codigo para usuario nao verificado e mascara usuario inativo', async () => {
    const active = createAuthServiceSetup()
    const inactive = createAuthServiceSetup()
    mockOwnerUserLookup(active, {
      id: 'user-unverified',
      fullName: 'User Pending',
      email: AUTH_TEST_EMAILS.pending,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: null,
    })
    mockInactiveUserLookup({ setup: inactive })

    const activeResult = await active.service.requestEmailVerification(
      { email: AUTH_TEST_EMAILS.pending },
      makeRequestContext(),
    )
    const inactiveResult = await inactive.service.requestEmailVerification(
      { email: AUTH_TEST_EMAILS.disabled },
      makeRequestContext(),
    )

    expect(activeResult.success).toBe(true)
    expect(active.mailer.sendEmailVerificationEmail).toHaveBeenCalledTimes(1)
    expect(inactiveResult.success).toBe(true)
    expect(inactive.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'auth.email-verification.requested' }),
    )
  })

  it('requestPasswordReset envia codigo para usuario ativo e mascara usuario inativo', async () => {
    const active = createAuthServiceSetup()
    const inactive = createAuthServiceSetup()
    mockOwnerUserLookup(active, {
      id: 'user-1',
      fullName: 'Owner',
      email: AUTH_TEST_EMAILS.owner,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
    })
    mockInactiveUserLookup({ setup: inactive })

    const activeResult = await active.service.requestPasswordReset(
      { email: AUTH_TEST_EMAILS.owner },
      makeRequestContext(),
    )
    const inactiveResult = await inactive.service.requestPasswordReset(
      { email: AUTH_TEST_EMAILS.disabled },
      makeRequestContext(),
    )

    expect(activeResult.success).toBe(true)
    expect(active.mailer.sendPasswordResetEmail).toHaveBeenCalledTimes(1)
    expect(inactiveResult.success).toBe(true)
    expect(inactive.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'auth.password-reset.requested' }),
    )
  })

  it('requestPasswordReset propaga erro nao-503 do mailer e limpa OTP', async () => {
    const setup = createAuthServiceSetup()
    const { service, prisma, mailer, audit } = setup
    mockOwnerUserLookup(setup, {
      id: 'user-1',
      fullName: 'Owner',
      email: AUTH_TEST_EMAILS.owner,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
    })
    mailer.sendPasswordResetEmail.mockRejectedValue(new HttpException('Gateway timeout', HttpStatus.GATEWAY_TIMEOUT))

    await expect(service.requestPasswordReset({ email: AUTH_TEST_EMAILS.owner }, makeRequestContext())).rejects.toThrow(
      'Gateway timeout',
    )
    expect(prisma.oneTimeCode.deleteMany).toHaveBeenCalledTimes(1)
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: 'auth.password-reset.delivery_failed' }))
  })

  it('resetPassword lanca BadRequestException para codigo invalido sem lock', async () => {
    const { service, prisma, rateLimit } = createAuthServiceSetup()
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      fullName: 'Owner',
      email: AUTH_TEST_EMAILS.owner,
      passwordHash: 'old-hash',
      status: UserStatus.ACTIVE,
    })
    prisma.oneTimeCode.findFirst.mockResolvedValue(null)
    rateLimit.recordPasswordResetCodeAttempt.mockResolvedValue({
      count: 2,
      firstAttemptAt: Date.now(),
      lockedUntil: null,
    })

    await expect(
      service.resetPassword(
        { email: AUTH_TEST_EMAILS.owner, code: '999999', password: 'NovaSenha@456' },
        makeRequestContext(),
      ),
    ).rejects.toThrow('Codigo invalido ou expirado.')
  })

  it('rejeita payloads de injection antes de consultar usuario ou codigo', async () => {
    const maliciousEmail = "owner@empresa.com' OR '1'='1"
    const maliciousCode = "000000' OR '1'='1"
    const emailSetup = createAuthServiceSetup()
    const codeSetup = createAuthServiceSetup()
    mockActiveUnverifiedOwner(codeSetup)

    await expect(
      emailSetup.service.requestPasswordReset({ email: maliciousEmail }, makeRequestContext()),
    ).rejects.toBeInstanceOf(BadRequestException)
    await expect(
      codeSetup.service.verifyEmail({ email: AUTH_TEST_EMAILS.owner, code: maliciousCode }, makeRequestContext()),
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(emailSetup.prisma.user.findUnique).not.toHaveBeenCalled()
    expect(codeSetup.prisma.oneTimeCode.findFirst).not.toHaveBeenCalled()
  })
})
