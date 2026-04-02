import { ForbiddenException, UnauthorizedException } from '@nestjs/common'
import { DEV_SESSION_COOKIE_NAME, PROD_SESSION_COOKIE_NAME } from '../src/modules/auth/auth.constants'
import {
  authenticateOperationsRealtimeSocket,
  extractOperationsRealtimeBearerToken,
} from '../src/modules/operations-realtime/operations-realtime.socket-auth'

describe('operations-realtime.socket-auth', () => {
  it('extrai token com prioridade para handshake.auth.token', () => {
    const token = extractOperationsRealtimeBearerToken({
      auth: {
        token: '  Bearer abc-123  ',
        bearer: 'Bearer ignored',
      },
      headers: {
        authorization: 'Bearer also-ignored',
      },
    })

    expect(token).toBe('abc-123')
  })

  it('extrai token de authorization e x-access-token', () => {
    const authorizationToken = extractOperationsRealtimeBearerToken({
      headers: {
        authorization: ['  Bearer auth-header-token  '],
      },
    })
    const xAccessToken = extractOperationsRealtimeBearerToken({
      headers: {
        'x-access-token': ' x-access-token-value ',
      },
    })

    expect(authorizationToken).toBe('auth-header-token')
    expect(xAccessToken).toBe('x-access-token-value')
  })

  it('extrai token dos cookies com fallback prod/dev', () => {
    const prodCookieToken = extractOperationsRealtimeBearerToken({
      headers: {
        cookie: `foo=bar; ${PROD_SESSION_COOKIE_NAME}=prod-token%2B1; ${DEV_SESSION_COOKIE_NAME}=dev-token`,
      },
    })

    const devCookieToken = extractOperationsRealtimeBearerToken({
      headers: {
        cookie: `foo=bar; ${DEV_SESSION_COOKIE_NAME}=dev-only-token`,
      },
    })

    expect(prodCookieToken).toBe('prod-token+1')
    expect(devCookieToken).toBe('dev-only-token')
  })

  it('retorna null quando nao existe token valido', () => {
    expect(
      extractOperationsRealtimeBearerToken({
        auth: { token: '   ' },
        headers: { authorization: '   ' },
      }),
    ).toBeNull()
  })

  it('falha autenticacao sem token', async () => {
    const socket = {
      id: 'socket-1',
      handshake: {},
      data: {},
    }

    await expect(
      authenticateOperationsRealtimeSocket(socket as any, async () => ({ userId: 'u1' } as any)),
    ).rejects.toThrow(UnauthorizedException)
  })

  it('falha autenticacao com token invalido', async () => {
    const socket = {
      id: 'socket-1',
      handshake: {
        auth: {
          token: 'Bearer invalid-token',
        },
      },
      data: {},
    }

    await expect(authenticateOperationsRealtimeSocket(socket as any, async () => null)).rejects.toThrow(
      UnauthorizedException,
    )
  })

  it('falha autenticacao para sessao inativa', async () => {
    const socket = {
      id: 'socket-1',
      handshake: {
        auth: {
          accessToken: 'inactive-token',
        },
      },
      data: {},
    }

    await expect(
      authenticateOperationsRealtimeSocket(socket as any, async () => ({
        userId: 'owner-1',
        role: 'OWNER',
        status: 'INACTIVE',
        workspaceOwnerUserId: 'owner-1',
        companyOwnerUserId: 'owner-1',
      } as any)),
    ).rejects.toThrow(ForbiddenException)
  })

  it('autentica socket e popula contexto de conexao', async () => {
    const socket = {
      id: 'socket-1',
      handshake: {
        auth: {
          bearer: 'Bearer valid-token',
        },
      },
      data: {},
    }

    const result = await authenticateOperationsRealtimeSocket(
      socket as any,
      async () =>
        ({
          userId: 'staff-1',
          role: 'STAFF',
          status: 'ACTIVE',
          workspaceOwnerUserId: undefined,
          companyOwnerUserId: 'owner-1',
        }) as any,
    )

    expect(result).toEqual({
      auth: expect.objectContaining({ userId: 'staff-1' }),
      workspaceOwnerUserId: 'owner-1',
      workspaceChannel: 'workspace:owner-1',
      rawToken: 'valid-token',
    })

    expect(socket.data).toEqual(
      expect.objectContaining({
        workspaceOwnerUserId: 'owner-1',
        workspaceChannel: 'workspace:owner-1',
        auth: expect.objectContaining({ userId: 'staff-1' }),
      }),
    )
  })
})
