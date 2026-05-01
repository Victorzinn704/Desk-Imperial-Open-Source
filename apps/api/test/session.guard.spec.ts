import { type ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { SessionGuard } from '../src/modules/auth/guards/session.guard'
import type { AuthService } from '../src/modules/auth/auth.service'
import { makeAuthContext } from './helpers/auth-context.factory'

describe('SessionGuard', () => {
  const authService = {
    getSessionCookieName: jest.fn(() => 'partner_session'),
    validateSessionToken: jest.fn(),
  }

  const guard = new SessionGuard(authService as unknown as AuthService)

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

  it('permite request com cookie de sessao valido e injeta auth no request', async () => {
    const authContext = makeAuthContext({ userId: 'owner-123', sessionId: 'session-123' })
    authService.validateSessionToken.mockResolvedValue(authContext)

    const request = {
      cookies: { partner_session: 'token-123' },
      auth: undefined,
    }

    const result = await guard.canActivate(makeContext(request))

    expect(result).toBe(true)
    expect(authService.getSessionCookieName).toHaveBeenCalledTimes(1)
    expect(authService.validateSessionToken).toHaveBeenCalledWith('token-123')
    expect(request.auth).toEqual(authContext)
  })

  it('bloqueia quando cookie de sessao nao existe', async () => {
    const request = {
      cookies: {},
    }

    await expect(guard.canActivate(makeContext(request))).rejects.toThrow(UnauthorizedException)
  })

  it('bloqueia quando token de sessao e invalido', async () => {
    authService.validateSessionToken.mockResolvedValue(null)

    const request = {
      cookies: { partner_session: 'invalid-token' },
    }

    await expect(guard.canActivate(makeContext(request))).rejects.toThrow(UnauthorizedException)
  })
})
