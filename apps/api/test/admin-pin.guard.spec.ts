import { ForbiddenException } from '@nestjs/common'
import type { ExecutionContext } from '@nestjs/common'
import { AdminPinGuard } from '../src/modules/admin-pin/admin-pin.guard'
import type { AdminPinService } from '../src/modules/admin-pin/admin-pin.service'
import { makeAuthContext, makeStaffAuthContext } from './helpers/auth-context.factory'

describe('AdminPinGuard', () => {
  const adminPinService = {
    hasPinConfigured: jest.fn(),
    extractVerificationProof: jest.fn(() => 'proof-token'),
    validateVerificationProof: jest.fn(),
  }

  const guard = new AdminPinGuard(adminPinService as unknown as AdminPinService)

  function makeContext(request: any): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('bloqueia quando nao existe sessao valida', async () => {
    const request = { auth: null }

    await expect(guard.canActivate(makeContext(request))).rejects.toThrow(ForbiddenException)
  })

  it('permite quando workspace nao tem PIN configurado', async () => {
    adminPinService.hasPinConfigured.mockResolvedValue(false)

    const auth = makeAuthContext({ userId: 'owner-1', role: 'OWNER' })
    const request = { auth }

    const allowed = await guard.canActivate(makeContext(request))

    expect(allowed).toBe(true)
    expect(adminPinService.hasPinConfigured).toHaveBeenCalledWith('owner-1')
    expect(adminPinService.extractVerificationProof).not.toHaveBeenCalled()
  })

  it('usa companyOwnerUserId para STAFF ao consultar configuracao de PIN', async () => {
    adminPinService.hasPinConfigured.mockResolvedValue(false)

    const auth = makeStaffAuthContext({
      userId: 'staff-1',
      companyOwnerUserId: 'owner-9',
    })
    const request = { auth }

    const allowed = await guard.canActivate(makeContext(request))

    expect(allowed).toBe(true)
    expect(adminPinService.hasPinConfigured).toHaveBeenCalledWith('owner-9')
  })

  it('permite quando PIN existe e prova de verificacao e valida', async () => {
    adminPinService.hasPinConfigured.mockResolvedValue(true)
    adminPinService.validateVerificationProof.mockResolvedValue(true)

    const auth = makeAuthContext({ userId: 'owner-1' })
    const request = { auth, headers: { 'x-admin-pin-proof': 'proof-token' } }

    const allowed = await guard.canActivate(makeContext(request))

    expect(allowed).toBe(true)
    expect(adminPinService.extractVerificationProof).toHaveBeenCalledWith(request)
    expect(adminPinService.validateVerificationProof).toHaveBeenCalledWith(auth, 'proof-token')
  })

  it('bloqueia quando PIN existe e prova e invalida', async () => {
    adminPinService.hasPinConfigured.mockResolvedValue(true)
    adminPinService.validateVerificationProof.mockResolvedValue(false)

    const auth = makeAuthContext({ userId: 'owner-1' })
    const request = { auth }

    await expect(guard.canActivate(makeContext(request))).rejects.toThrow(ForbiddenException)
  })
})
