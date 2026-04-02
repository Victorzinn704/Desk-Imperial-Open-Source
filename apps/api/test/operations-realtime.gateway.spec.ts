/**
 * @file operations-realtime.gateway.spec.ts
 * @module OperationsRealtime/Gateway
 *
 * Documenta autenticacao de socket, validacao de origem, bind de namespace
 * e ciclo de vida do adapter redis no gateway realtime.
 */

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

    const gateway = new OperationsRealtimeGateway(operationsRealtimeService as any, authService as any)
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

  it('afterInit sem redis usa adapter em memoria e vincula namespace', async () => {
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
    const { gateway, logger } = makeGateway()
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
    expect(socket.disconnect).toHaveBeenCalledWith(true)
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('origem'))
  })

  it('handleConnection conecta socket autenticado e entra no workspaceChannel', async () => {
    const { gateway, logger } = makeGateway()

    jest.spyOn(gateway, 'authenticateConnection').mockResolvedValue({
      auth: {
        userId: 'owner-1',
      } as any,
      workspaceOwnerUserId: 'owner-1',
      workspaceChannel: 'workspace:owner-1',
      rawToken: 'valid-token',
    })

    const socket = {
      id: 'socket-ok',
      handshake: {
        headers: {},
      },
      join: jest.fn(async () => {}),
      emit: jest.fn(),
      disconnect: jest.fn(),
      data: {},
    }

    await gateway.handleConnection(socket as any)

    expect(socket.join).toHaveBeenCalledWith('workspace:owner-1')
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('conectado em workspace:owner-1'))
    expect(socket.disconnect).not.toHaveBeenCalled()
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

  it('handleDisconnect registra com e sem workspace resolvido', () => {
    const { gateway, logger } = makeGateway()

    gateway.handleDisconnect({
      id: 'socket-with-room',
      data: {
        workspaceChannel: 'workspace:owner-1',
      },
    } as any)

    gateway.handleDisconnect({
      id: 'socket-no-room',
      data: {},
    } as any)

    expect(logger.debug).toHaveBeenCalledWith('Socket socket-with-room desconectado de workspace:owner-1')
    expect(logger.debug).toHaveBeenCalledWith('Socket socket-no-room desconectado sem workspace resolvido')
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
})
