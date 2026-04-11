import { type ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common'
import { CsrfGuard } from '../src/modules/auth/guards/csrf.guard'
import type { AuthService } from '../src/modules/auth/auth.service'
import type { ConfigService } from '@nestjs/config'
import { makeAuthContext } from './helpers/auth-context.factory'

describe('CsrfGuard', () => {
  const authService = {
    getCsrfCookieName: jest.fn(() => 'partner_csrf'),
    buildCsrfToken: jest.fn(() => 'csrf-token-123'),
  }

  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'APP_URL') {
        return 'http://localhost:3000'
      }
      if (key === 'NEXT_PUBLIC_APP_URL') {
        return 'http://localhost:3000'
      }
      if (key === 'NODE_ENV') {
        return 'development'
      }
      return undefined
    }),
  }

  const guard = new CsrfGuard(authService as unknown as AuthService, configService as unknown as ConfigService)

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

  it('permite request com sessao, origem e tokens validos', () => {
    const request = {
      auth: makeAuthContext({ sessionId: 'session-1' }),
      cookies: { partner_csrf: 'csrf-token-123' },
      headers: { 'x-csrf-token': 'csrf-token-123' },
      get: (header: string) => {
        if (header === 'origin') {
          return 'http://localhost:3000'
        }
        return undefined
      },
    }

    const result = guard.canActivate(makeContext(request))

    expect(result).toBe(true)
    expect(authService.buildCsrfToken).toHaveBeenCalledWith('session-1')
  })

  it('bloqueia quando sessao nao existe', () => {
    const request = {
      auth: null,
      cookies: {},
      headers: {},
      get: () => undefined,
    }

    expect(() => guard.canActivate(makeContext(request))).toThrow(UnauthorizedException)
  })

  it('bloqueia quando token CSRF esta ausente', () => {
    const request = {
      auth: makeAuthContext({ sessionId: 'session-1' }),
      cookies: {},
      headers: {},
      get: (header: string) => {
        if (header === 'origin') {
          return 'http://localhost:3000'
        }
        return undefined
      },
    }

    expect(() => guard.canActivate(makeContext(request))).toThrow(ForbiddenException)
  })

  it('bloqueia quando origem nao esta na allowlist', () => {
    const request = {
      auth: makeAuthContext({ sessionId: 'session-1' }),
      cookies: { partner_csrf: 'csrf-token-123' },
      headers: { 'x-csrf-token': 'csrf-token-123' },
      get: (header: string) => {
        if (header === 'origin') {
          return 'https://malicious.example.com'
        }
        return undefined
      },
    }

    expect(() => guard.canActivate(makeContext(request))).toThrow(ForbiddenException)
  })

  it('permite quando origin ausente mas referer permitido', () => {
    const request = {
      auth: makeAuthContext({ sessionId: 'session-1' }),
      cookies: { partner_csrf: 'csrf-token-123' },
      headers: { 'x-csrf-token': 'csrf-token-123' },
      get: (header: string) => {
        if (header === 'origin') {
          return undefined
        }
        if (header === 'referer') {
          return 'http://localhost:3000/dashboard'
        }
        return undefined
      },
    }

    const result = guard.canActivate(makeContext(request))

    expect(result).toBe(true)
  })

  it('bloqueia referer que apenas compartilha prefixo textual com a origem permitida', () => {
    const strictConfig = {
      get: jest.fn((key: string) => {
        if (key === 'APP_URL') {
          return 'https://example.com'
        }
        if (key === 'NEXT_PUBLIC_APP_URL') {
          return 'https://example.com'
        }
        if (key === 'NODE_ENV') {
          return 'production'
        }
        return undefined
      }),
    }
    const strictGuard = new CsrfGuard(authService as unknown as AuthService, strictConfig as unknown as ConfigService)
    const request = {
      auth: makeAuthContext({ sessionId: 'session-1' }),
      cookies: { partner_csrf: 'csrf-token-123' },
      headers: { 'x-csrf-token': 'csrf-token-123' },
      get: (header: string) => {
        if (header === 'origin') {
          return undefined
        }
        if (header === 'referer') {
          return 'https://example.com.evil.test/path'
        }
        return undefined
      },
    }

    expect(() => strictGuard.canActivate(makeContext(request))).toThrow(ForbiddenException)
  })

  it('bloqueia referer invalido ou malformado', () => {
    const request = {
      auth: makeAuthContext({ sessionId: 'session-1' }),
      cookies: { partner_csrf: 'csrf-token-123' },
      headers: { 'x-csrf-token': 'csrf-token-123' },
      get: (header: string) => {
        if (header === 'origin') {
          return undefined
        }
        if (header === 'referer') {
          return 'not-a-url'
        }
        return undefined
      },
    }

    expect(() => guard.canActivate(makeContext(request))).toThrow(ForbiddenException)
  })

  it('bloqueia quando header CSRF nao confere com cookie', () => {
    const request = {
      auth: makeAuthContext({ sessionId: 'session-1' }),
      cookies: { partner_csrf: 'csrf-token-123' },
      headers: { 'x-csrf-token': 'csrf-token-999' },
      get: (header: string) => {
        if (header === 'origin') {
          return 'http://localhost:3000'
        }
        return undefined
      },
    }

    expect(() => guard.canActivate(makeContext(request))).toThrow(ForbiddenException)
  })
})
