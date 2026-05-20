import { UserStatus } from '@prisma/client'
import { createAuthServiceSetup, makeOwnerUser, mockArgon2Verify } from './helpers/auth-service-test-setup'
import { makeRequestContext } from './helpers/request-context.factory'
import { LoginModeDto } from '../src/modules/auth/dto/login.dto'

describe('AuthService session coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockArgon2Verify.mockResolvedValue(false)
  })

  it('reconstroi auth de sessao employee ativa a partir do banco', async () => {
    const { service, prisma, cache, demo } = createAuthServiceSetup()
    cache.get.mockResolvedValue(null)
    prisma.session.findUnique.mockResolvedValue({
      id: 'session-emp',
      tokenHash: 'token-hash-emp',
      expiresAt: new Date(Date.now() + 30 * 60_000),
      revokedAt: null,
      lastSeenAt: new Date(Date.now() - 16 * 60_000),
      user: null,
      employee: { id: 'emp-1', active: true, employeeCode: 'VD-001', displayName: 'Marina Vendas' },
      workspaceOwner: makeOwnerUser(),
    })

    const result = await service.validateSessionToken('employee-token')

    expect(result).toEqual(expect.objectContaining({ role: 'STAFF', employeeId: 'emp-1', employeeCode: 'VD-001' }))
    expect(cache.set).toHaveBeenCalled()
    expect(demo.buildEvaluationAccess).toHaveBeenCalledTimes(1)
  })

  it('retorna null para sessoes expiradas, orfas ou de employee desativado', async () => {
    const { service, prisma, cache, demo } = createAuthServiceSetup()
    cache.get.mockResolvedValue(null)
    const activeExpiration = new Date(Date.now() + 30 * 60_000)

    prisma.session.findUnique
      .mockResolvedValueOnce({
        id: 'session-expired',
        tokenHash: 'hash-expired',
        expiresAt: new Date(Date.now() - 1000),
        revokedAt: null,
        lastSeenAt: new Date(),
        user: makeOwnerUser(),
        employee: null,
        workspaceOwner: null,
      })
      .mockResolvedValueOnce({
        id: 'session-disabled-emp',
        tokenHash: 'hash-disabled-emp',
        expiresAt: activeExpiration,
        revokedAt: null,
        lastSeenAt: new Date(),
        user: null,
        employee: { id: 'emp-disabled', active: false, employeeCode: 'VD-002', displayName: 'Ex-Funcionario' },
        workspaceOwner: makeOwnerUser(),
      })
      .mockResolvedValueOnce({
        id: 'session-orphan',
        tokenHash: 'hash-orphan',
        expiresAt: activeExpiration,
        revokedAt: null,
        lastSeenAt: new Date(),
        user: null,
        employee: null,
        workspaceOwner: null,
      })

    await expect(service.validateSessionToken('expired-token')).resolves.toBeNull()
    await expect(service.validateSessionToken('disabled-emp-token')).resolves.toBeNull()
    await expect(service.validateSessionToken('orphan-token')).resolves.toBeNull()
    expect(demo.closeGrantForSession).toHaveBeenCalledWith('session-expired')
    expect(demo.closeGrantForSession).toHaveBeenCalledWith('session-disabled-emp')
  })

  it('nao atualiza lastSeenAt quando sessao foi vista recentemente', async () => {
    const { service, prisma, cache } = createAuthServiceSetup()
    cache.get.mockResolvedValue(null)
    prisma.session.findUnique.mockResolvedValue({
      id: 'session-recent',
      tokenHash: 'token-hash-recent',
      expiresAt: new Date(Date.now() + 30 * 60_000),
      revokedAt: null,
      lastSeenAt: new Date(Date.now() - 5 * 60_000),
      user: makeOwnerUser(),
      employee: null,
      workspaceOwner: null,
    })

    await service.validateSessionToken('recent-token')

    expect(prisma.session.update).not.toHaveBeenCalled()
  })

  it('createSession usa expiresAt da reserva demo quando disponivel', async () => {
    const { service, prisma, demo } = createAuthServiceSetup()
    mockArgon2Verify.mockResolvedValue(true)
    const demoExpiresAt = new Date(Date.now() + 30 * 60_000)
    demo.reserveWindow.mockResolvedValue({ expiresAt: demoExpiresAt, grantId: 'grant-1' })
    prisma.user.findUnique.mockResolvedValue(makeOwnerUser())

    const result = await service.login(
      { loginMode: LoginModeDto.OWNER, email: 'owner@empresa.com', password: 'Senha@123' },
      { cookie: jest.fn() } as never,
      makeRequestContext(),
    )

    expect(demo.attachGrant).toHaveBeenCalledWith(
      expect.objectContaining({ reservation: expect.objectContaining({ grantId: 'grant-1' }) }),
    )
    expect(result.session.expiresAt).toEqual(demoExpiresAt)
  })

  it('expoe helpers de cookies, csrf e versao de consentimento', () => {
    const configured = createAuthServiceSetup({ configOverrides: { CONSENT_VERSION: '2026.04' } }).service
    const { service, sessionService } = createAuthServiceSetup({ configOverrides: { CONSENT_VERSION: undefined } })

    expect(service.getSessionCookieBaseOptions().httpOnly).toBe(true)
    expect(service.getCsrfCookieBaseOptions().httpOnly).toBe(false)
    expect((configured as never as { getConsentVersion: () => string }).getConsentVersion()).toBe('2026.04')
    expect((service as never as { getConsentVersion: () => string }).getConsentVersion()).toBe('2026.03')
    expect(
      (sessionService as never as { sessionTokenCacheKey: (token: string) => string }).sessionTokenCacheKey('abc'),
    ).toBe('auth:session:token:abc')
    expect((sessionService as never as { sessionIdCacheKey: (id: string) => string }).sessionIdCacheKey('xyz')).toBe(
      'auth:session:id:xyz',
    )
  })

  it('mantem status ativo do usuario base nos cenarios de sessao owner', () => {
    expect(makeOwnerUser().status).toBe(UserStatus.ACTIVE)
  })
})
