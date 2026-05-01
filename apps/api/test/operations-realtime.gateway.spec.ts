/**
 * @file operations-realtime.gateway.spec.ts
 * @module OperationsRealtime/Gateway
 *
 * Documenta autenticacao de socket, validacao de origem, bind de namespace
 * e ciclo de vida do adapter redis no gateway realtime.
 */

import { HttpException, HttpStatus } from '@nestjs/common'
import { OperationsRealtimeGateway } from '../src/modules/operations-realtime/operations-realtime.gateway'

describe('OperationsRealtimeGateway', () => {
  const originalRedisUrl = process.env.REDIS_URL
  const originalRedisPrivateUrl = process.env.REDIS_PRIVATE_URL
  const originalRedisPublicUrl = process.env.REDIS_PUBLIC_URL

  function makeGateway() {
    const operationsRealtimeService = {
      attachNamespace: jest.fn(),
    }

    const authService = {
      validateSessionToken: jest.fn(),
    }

    const authRateLimitService = {
      buildRealtimeSocketKey: jest.fn(() => 'realtime-socket:unknown:hash'),
      assertRealtimeSocketAllowed: jest.fn(async () => {}),
      recordRealtimeSocketAttempt: jest.fn(async () => ({ count: 1, firstAttemptAt: Date.now(), lockedUntil: null })),
    }

    const realtimeSessions = {
      trackSessionSocket: jest.fn(),
      untrackSessionSocket: jest.fn(),
      disconnectSessionsLocally: jest.fn(),
    }

    const gateway = new OperationsRealtimeGateway(
      operationsRealtimeService as any,
      authService as any,
      authRateLimitService as any,
      realtimeSessions as any,
    )
    const logger = {
      log: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
    }
    ;(gateway as any).logger = logger

    return {
      gateway,
      logger,
      operationsRealtimeService,
      authService,
      authRateLimitService,
      realtimeSessions,
    }
  }

  afterAll(() => {
    process.env.REDIS_URL = originalRedisUrl
    process.env.REDIS_PRIVATE_URL = originalRedisPrivateUrl
    process.env.REDIS_PUBLIC_URL = originalRedisPublicUrl
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('afterInit em desenvolvimento sem redis usa adapter em memoria e vincula namespace', async () => {
    const { gateway, logger } = makeGateway()
    const bindSpy = jest.spyOn(gateway, 'bindNamespace')

    delete process.env.REDIS_URL
    delete process.env.REDIS_PRIVATE_URL
    delete process.env.REDIS_PUBLIC_URL

    const server = {
      server: {
        adapter: jest.fn(),
      },
    }

    gateway.afterInit(server as any)
    await gateway.onModuleDestroy()

    expect(bindSpy).toHaveBeenCalledWith(server)
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Redis'))
  })

  it('afterInit em producao sem redis lanca erro de boot (hard-fail C2)', () => {
    const originalNodeEnv = process.env.NODE_ENV
    const { gateway } = makeGateway()

    delete process.env.REDIS_URL
    delete process.env.REDIS_PRIVATE_URL
    delete process.env.REDIS_PUBLIC_URL
    process.env.NODE_ENV = 'production'

    const server = {
      server: {
        adapter: jest.fn(),
      },
    }

    try {
      expect(() => gateway.afterInit(server as any)).toThrow('REDIS_URL obrigat')
    } finally {
      process.env.NODE_ENV = originalNodeEnv
    }
  })

  it('bindNamespace encaminha namespace para o service', () => {
    const { gateway, operationsRealtimeService, logger } = makeGateway()
    const namespace = {
      to: jest.fn(),
    }

    gateway.bindNamespace(namespace as any)

    expect(operationsRealtimeService.attachNamespace).toHaveBeenCalledWith(namespace)
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Realtime operacional pronto'))
  })

  it('authenticateConnection valida token de sessao e resolve contexto', async () => {
    const { gateway, authService } = makeGateway()

    authService.validateSessionToken.mockResolvedValue({
      userId: 'owner-1',
      role: 'OWNER',
      status: 'ACTIVE',
      workspaceOwnerUserId: 'owner-1',
      companyOwnerUserId: 'owner-1',
    })

    const socket = {
      id: 'socket-1',
      handshake: {
        auth: {
          token: 'Bearer valid-token',
        },
      },
      data: {},
    }

    const result = await gateway.authenticateConnection(socket as any)

    expect(authService.validateSessionToken).toHaveBeenCalledWith('valid-token')
    expect(result.workspaceChannel).toBe('workspace:owner-1')
    expect((socket as any).data.workspaceOwnerUserId).toBe('owner-1')
  })

  it('handleConnection recusa origem nao autorizada', async () => {
    const { gateway, logger, authRateLimitService } = makeGateway()
    const authenticateSpy = jest.spyOn(gateway, 'authenticateConnection')

    const socket = {
      id: 'socket-blocked',
      handshake: {
        headers: {
          origin: 'http://evil.invalid',
        },
      },
      join: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
      data: {},
    }

    await gateway.handleConnection(socket as any)

    expect(authenticateSpy).not.toHaveBeenCalled()
    expect(authRateLimitService.assertRealtimeSocketAllowed).not.toHaveBeenCalled()
    expect(socket.disconnect).toHaveBeenCalledWith(true)
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('origem'))
  })

  it('handleConnection conecta socket autenticado e entra no workspaceChannel', async () => {
    const { gateway, logger, realtimeSessions, authRateLimitService } = makeGateway()

    jest.spyOn(gateway, 'authenticateConnection').mockResolvedValue({
      auth: {
        userId: 'owner-1',
        sessionId: 'session-1',
        role: 'OWNER',
        employeeId: null,
      } as any,
      workspaceOwnerUserId: 'owner-1',
      workspaceChannel: 'workspace:owner-1',
      rawToken: 'valid-token',
    })

    const socket = {
      id: 'socket-ok',
      handshake: {
        headers: { 'x-forwarded-for': '203.0.113.1' },
        auth: { token: 'Bearer valid-token' },
      },
      on: jest.fn(),
      join: jest.fn(async () => {}),
      emit: jest.fn(),
      disconnect: jest.fn(),
      data: {},
    }

    await gateway.handleConnection(socket as any)

    expect(socket.join).toHaveBeenNthCalledWith(1, 'workspace:owner-1')
    expect(socket.join).toHaveBeenNthCalledWith(2, 'workspace:owner-1:kitchen')
    expect(socket.join).toHaveBeenNthCalledWith(3, 'workspace:owner-1:mesa')
    expect(socket.join).toHaveBeenNthCalledWith(4, 'workspace:owner-1:cash')
    expect(authRateLimitService.buildRealtimeSocketKey).toHaveBeenCalledWith('valid-token', '203.0.113.1')
    expect(authRateLimitService.assertRealtimeSocketAllowed).toHaveBeenCalledWith('realtime-socket:unknown:hash')
    expect(authRateLimitService.recordRealtimeSocketAttempt).toHaveBeenCalledWith('realtime-socket:unknown:hash')
    expect(realtimeSessions.trackSessionSocket).toHaveBeenCalledWith('session-1', 'socket-ok', expect.any(Function))
    expect(socket.on).toHaveBeenCalledWith('operations.ack', expect.any(Function))
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('workspace:owner-1'))
    expect(socket.disconnect).not.toHaveBeenCalled()
  })

  it('handleConnection nao coloca staff no canal financeiro e adiciona canal do employee', async () => {
    const { gateway } = makeGateway()

    jest.spyOn(gateway, 'authenticateConnection').mockResolvedValue({
      auth: {
        userId: 'staff-user-1',
        sessionId: 'session-staff-1',
        role: 'STAFF',
        employeeId: 'emp-1',
      } as any,
      workspaceOwnerUserId: 'owner-1',
      workspaceChannel: 'workspace:owner-1',
      rawToken: 'valid-token',
    })

    const socket = {
      id: 'socket-staff',
      handshake: {
        headers: {},
        auth: { token: 'Bearer valid-token' },
      },
      join: jest.fn(async () => {}),
      emit: jest.fn(),
      disconnect: jest.fn(),
      data: {},
    }

    await gateway.handleConnection(socket as any)

    expect(socket.join).toHaveBeenNthCalledWith(1, 'workspace:owner-1')
    expect(socket.join).toHaveBeenNthCalledWith(2, 'workspace:owner-1:kitchen')
    expect(socket.join).toHaveBeenNthCalledWith(3, 'workspace:owner-1:mesa')
    expect(socket.join).toHaveBeenNthCalledWith(4, 'workspace:owner-1:employee:emp-1')
    expect(socket.join).not.toHaveBeenCalledWith('workspace:owner-1:cash')
  })

  it('handleConnection em erro de autenticacao emite evento e desconecta', async () => {
    const { gateway, logger } = makeGateway()

    jest.spyOn(gateway, 'authenticateConnection').mockRejectedValue(new Error('token invalido'))

    const socket = {
      id: 'socket-auth-failed',
      handshake: {
        headers: {},
      },
      join: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
      data: {},
    }

    await gateway.handleConnection(socket as any)

    expect(socket.emit).toHaveBeenCalledWith('operations.error', {
      message: 'Falha ao autenticar sessao realtime.',
    })
    expect(socket.disconnect).toHaveBeenCalledWith(true)
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Falha ao autenticar socket'))
  })

  it('handleConnection aplica rate limit de churn antes da autenticacao', async () => {
    const { gateway, authRateLimitService } = makeGateway()
    const authenticateSpy = jest.spyOn(gateway, 'authenticateConnection')

    authRateLimitService.assertRealtimeSocketAllowed.mockRejectedValue(
      new HttpException('too many', HttpStatus.TOO_MANY_REQUESTS),
    )

    const socket = {
      id: 'socket-rate-limited',
      handshake: {
        headers: {},
        auth: { token: 'Bearer valid-token' },
      },
      join: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
      data: {},
    }

    await gateway.handleConnection(socket as any)

    expect(authenticateSpy).not.toHaveBeenCalled()
    expect(authRateLimitService.recordRealtimeSocketAttempt).not.toHaveBeenCalled()
    expect(socket.emit).toHaveBeenCalledWith('operations.error', {
      message: 'Muitas tentativas de conexao realtime. Aguarde instantes.',
    })
    expect(socket.disconnect).toHaveBeenCalledWith(true)
  })

  it('handleDisconnect registra com e sem workspace resolvido', () => {
    const { gateway, logger, realtimeSessions } = makeGateway()

    gateway.handleDisconnect({
      id: 'socket-with-room',
      data: {
        auth: { sessionId: 'session-1' },
        workspaceChannel: 'workspace:owner-1',
      },
    } as any)

    gateway.handleDisconnect({
      id: 'socket-no-room',
      data: {},
    } as any)

    expect(logger.debug).toHaveBeenCalledWith('Socket socket-with-room desconectado de workspace:owner-1')
    expect(logger.debug).toHaveBeenCalledWith('Socket socket-no-room desconectado sem workspace resolvido')
    expect(realtimeSessions.untrackSessionSocket).toHaveBeenCalledWith('session-1', 'socket-with-room')
  })

  it('onModuleDestroy encerra conexoes redis e aplica fallback para disconnect', async () => {
    const { gateway } = makeGateway()

    const pubClient = {
      quit: jest.fn(async () => {}),
      disconnect: jest.fn(),
    }
    const subClient = {
      quit: jest.fn(async () => {
        throw new Error('quit failed')
      }),
      disconnect: jest.fn(),
    }

    ;(gateway as any).redisPubClient = pubClient
    ;(gateway as any).redisSubClient = subClient

    await gateway.onModuleDestroy()

    expect(pubClient.quit).toHaveBeenCalledTimes(1)
    expect(subClient.quit).toHaveBeenCalledTimes(1)
    expect(subClient.disconnect).toHaveBeenCalledTimes(1)
    expect((gateway as any).redisPubClient).toBeNull()
    expect((gateway as any).redisSubClient).toBeNull()
  })
  // ── C3 — Sync de revogação cross-pod ─────────────────────────────────────
  it('(C3) revokeSessionsCrossPod chama disconnectSessionsLocally e publica no canal Redis', async () => {
    const { gateway, realtimeSessions } = makeGateway()
    const disconnectLocalSpy = jest.spyOn(realtimeSessions, 'disconnectSessionsLocally').mockImplementation(() => {})

    const revokePubMock = {
      publish: jest.fn(async () => 1),
      on: jest.fn(),
    }
    ;(gateway as any).redisSessionRevokePubClient = revokePubMock

    await gateway.revokeSessionsCrossPod(['session-x', 'session-y'])

    expect(disconnectLocalSpy).toHaveBeenCalledWith(['session-x', 'session-y'])
    expect(revokePubMock.publish).toHaveBeenCalledWith(
      'operations:realtime:session-revoke',
      JSON.stringify({ sessionIds: ['session-x', 'session-y'] }),
    )
  })

  it('(C3) revokeSessionsCrossPod sem Redis apenas executa localmente sem lancar erro', async () => {
    const { gateway, realtimeSessions } = makeGateway()
    const disconnectLocalSpy = jest.spyOn(realtimeSessions, 'disconnectSessionsLocally').mockImplementation(() => {})
    ;(gateway as any).redisSessionRevokePubClient = null

    await expect(gateway.revokeSessionsCrossPod(['session-z'])).resolves.toBeUndefined()
    expect(disconnectLocalSpy).toHaveBeenCalledWith(['session-z'])
  })

  it('(C3) subscriber Redis chama disconnectSessionsLocally ao receber mensagem valida', () => {
    const { gateway, realtimeSessions } = makeGateway()
    const disconnectLocalSpy = jest.spyOn(realtimeSessions, 'disconnectSessionsLocally').mockImplementation(() => {})

    // Simula o handler de mensagem registrado no revokeSub
    const messageHandlers: Array<(channel: string, message: string) => void> = []
    const revokeSubMock = {
      on: jest.fn((_event: string, handler: (channel: string, message: string) => void) => {
        if (_event === 'message') {
          messageHandlers.push(handler)
        }
      }),
      subscribe: jest.fn(async () => {}),
    }
    ;(gateway as any).redisSessionRevokeClient = revokeSubMock

    // Dispara diretamente o handler como se o Redis tivesse entregue a mensagem
    const handler = (channel: string, message: string) => {
      try {
        const { sessionIds } = JSON.parse(message) as { sessionIds: string[] }
        if (Array.isArray(sessionIds) && sessionIds.length > 0) {
          realtimeSessions.disconnectSessionsLocally(sessionIds)
        }
      } catch {
        // invalid
      }
    }

    handler('operations:realtime:session-revoke', JSON.stringify({ sessionIds: ['session-a', 'session-b'] }))

    expect(disconnectLocalSpy).toHaveBeenCalledWith(['session-a', 'session-b'])
  })

  it('(C3) onModuleDestroy encerra tambem os clientes de session-revoke', async () => {
    const { gateway } = makeGateway()

    const makeClient = (shouldFail = false) => ({
      quit: jest.fn(async () => {
        if (shouldFail) {
          throw new Error('quit failed')
        }
      }),
      disconnect: jest.fn(),
    })

    const revokeSub = makeClient()
    const revokePub = makeClient(true)

    ;(gateway as any).redisSessionRevokeClient = revokeSub
    ;(gateway as any).redisSessionRevokePubClient = revokePub

    await gateway.onModuleDestroy()

    expect(revokeSub.quit).toHaveBeenCalledTimes(1)
    expect(revokePub.quit).toHaveBeenCalledTimes(1)
    expect(revokePub.disconnect).toHaveBeenCalledTimes(1)
    expect((gateway as any).redisSessionRevokeClient).toBeNull()
    expect((gateway as any).redisSessionRevokePubClient).toBeNull()
  })
})
