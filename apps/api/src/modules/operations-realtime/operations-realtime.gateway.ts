import { HttpException, HttpStatus, Inject, Injectable, Logger, type OnModuleDestroy } from '@nestjs/common'
import {
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  type OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import { createAdapter } from '@socket.io/redis-adapter'
import Redis from 'ioredis'
import type { Namespace, Socket } from 'socket.io'
import { AuthService } from '../auth/auth.service'
import { AuthRateLimitService } from '../auth/auth-rate-limit.service'
import {
  recordOperationsRealtimeRedisAdapterState,
  recordOperationsRealtimeSocketAuthTelemetry,
  recordOperationsRealtimeSocketConnected,
  recordOperationsRealtimeSocketDisconnected,
  recordOperationsRealtimeSocketRejected,
} from '../../common/observability/business-telemetry.util'
import { getAllowedOriginsFromValues, isAllowedOrigin } from '../../common/utils/origin.util'
import { resolveRedisUrl } from '../../common/utils/redis-url.util'
import {
  OPERATIONS_REALTIME_NAMESPACE,
  resolveOperationsRealtimeSocketChannels,
  type OperationsRealtimeNamespaceLike,
} from './operations-realtime.types'
import { OperationsRealtimeService } from './operations-realtime.service'
import { OperationsRealtimeSessionsService } from './operations-realtime-sessions.service'
import { authenticateOperationsRealtimeSocket, extractOperationsRealtimeBearerToken } from './operations-realtime.socket-auth'
import type {
  OperationsRealtimeConnectionContext,
  OperationsRealtimeSocketLike,
} from './operations-realtime.socket.types'

/**
 * Transport bridge for the operations realtime module.
 *
 * The actual Socket.IO gateway decorator is intentionally not used yet because
 * the websocket runtime packages are not installed in this workspace. When they
 * are available, a thin Nest gateway can delegate to this bridge without
 * changing the auth or room logic below.
 */
const ALLOWED_ORIGINS = getAllowedOriginsFromValues(process.env)

@WebSocketGateway({
  namespace: OPERATIONS_REALTIME_NAMESPACE,
  cors: {
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
      if (!origin || isAllowedOrigin(origin, ALLOWED_ORIGINS)) {
        callback(null, true)
        return
      }

      callback(new Error('Origin not allowed by Socket.IO CORS'), false)
    },
    credentials: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Authorization', 'X-Access-Token', 'Content-Type'],
  },
  transports: ['websocket', 'polling'],
  allowEIO3: false,
  pingInterval: 25_000,
  pingTimeout: 20_000,
  maxHttpBufferSize: 1_000_000,
  perMessageDeflate: false,
})
@Injectable()
export class OperationsRealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy
{
  private readonly logger = new Logger(OperationsRealtimeGateway.name)
  private redisPubClient: Redis | null = null
  private redisSubClient: Redis | null = null

  @WebSocketServer()
  server!: Namespace

  constructor(
    @Inject(OperationsRealtimeService) private readonly operationsRealtimeService: OperationsRealtimeService,
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(AuthRateLimitService) private readonly authRateLimitService: AuthRateLimitService,
    @Inject(OperationsRealtimeSessionsService)
    private readonly realtimeSessions: OperationsRealtimeSessionsService,
  ) {}

  afterInit(server: Namespace) {
    if (process.env.NODE_ENV === 'production' && ALLOWED_ORIGINS.length === 0) {
      this.logger.warn(
        'Nenhuma origem permitida foi configurada para realtime. Defina APP_URL/NEXT_PUBLIC_APP_URL para evitar conexões indevidas.',
      )
    }

    const redisUrl = resolveRedisUrl(process.env)
    if (redisUrl) {
      try {
        const pubClient = new Redis(redisUrl)
        const subClient = pubClient.duplicate()
        this.redisPubClient = pubClient
        this.redisSubClient = subClient
        pubClient.on('error', (error) => this.logger.error(`Redis pub/sub erro (pub): ${error.message}`))
        subClient.on('error', (error) => this.logger.error(`Redis pub/sub erro (sub): ${error.message}`))
        server.server.adapter(createAdapter(pubClient, subClient))
        recordOperationsRealtimeRedisAdapterState(true, 'configured')
        this.logger.log('Redis adapter ativo — Socket.IO pronto para escalonamento horizontal.')
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        recordOperationsRealtimeRedisAdapterState(false, 'initialization_error')
        this.logger.warn(`Redis adapter não inicializado — usando adapter padrão em memória: ${msg}`)
      }
    } else {
      recordOperationsRealtimeRedisAdapterState(false, 'missing_redis_url')
      this.logger.log(
        'Redis não definido (REDIS_URL/REDIS_PRIVATE_URL/REDIS_PUBLIC_URL) — Socket.IO usando adapter em memória (instância única).',
      )
    }

    this.bindNamespace(server)
  }

  bindNamespace(namespace: OperationsRealtimeNamespaceLike) {
    this.operationsRealtimeService.attachNamespace(namespace)
    this.logger.log(`Realtime operacional pronto em ${OPERATIONS_REALTIME_NAMESPACE}`)
  }

  async authenticateConnection(socket: OperationsRealtimeSocketLike): Promise<OperationsRealtimeConnectionContext> {
    return authenticateOperationsRealtimeSocket(socket, (rawToken) => this.authService.validateSessionToken(rawToken))
  }

  async handleConnection(socket: Socket) {
    const socketOriginHeader = socket.handshake.headers.origin
    const socketOrigin = Array.isArray(socketOriginHeader) ? socketOriginHeader[0] : socketOriginHeader
    if (socketOrigin && !isAllowedOrigin(socketOrigin, ALLOWED_ORIGINS)) {
      recordOperationsRealtimeSocketRejected('origin_not_allowed', {
        'desk.operations.realtime.has_origin': true,
      })
      this.logger.warn(`Socket ${socket.id} recusado por origem não autorizada: ${socketOrigin}`)
      socket.disconnect(true)
      return
    }

    const startedAt = performance.now()

    try {
      const rawToken = extractOperationsRealtimeBearerToken(socket.handshake)
      const rateLimitKey = this.authRateLimitService.buildRealtimeSocketKey(rawToken, resolveSocketIpAddress(socket))
      await this.authRateLimitService.assertRealtimeSocketAllowed(rateLimitKey)
      await this.authRateLimitService.recordRealtimeSocketAttempt(rateLimitKey)

      const connection = await this.authenticateConnection(socket)
      const scopedChannels = resolveOperationsRealtimeSocketChannels({
        workspaceOwnerUserId: connection.workspaceOwnerUserId,
        role: connection.auth.role,
        employeeId: connection.auth.employeeId,
      })
      recordOperationsRealtimeSocketAuthTelemetry(performance.now() - startedAt, {
        'desk.operations.realtime.auth_result': 'accepted',
        'desk.operations.realtime.actor_role': connection.auth.role,
        'desk.operations.realtime.has_workspace': Boolean(connection.workspaceOwnerUserId),
      })
      for (const channel of scopedChannels) {
        await socket.join(channel)
      }
      this.realtimeSessions.trackSessionSocket(connection.auth.sessionId, socket.id, () => socket.disconnect(true))
      recordOperationsRealtimeSocketConnected({
        'desk.operations.realtime.actor_role': connection.auth.role,
        'desk.operations.realtime.has_workspace': Boolean(connection.workspaceOwnerUserId),
      })

      this.logger.debug(
        `Socket ${socket.id} conectado em ${scopedChannels.join(', ')} (${connection.auth.userId} -> ${connection.workspaceOwnerUserId})`,
      )
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Falha ao autenticar socket operacional.'
      const rejectionMessage =
        error instanceof HttpException && error.getStatus() === HttpStatus.TOO_MANY_REQUESTS
          ? 'Muitas tentativas de conexao realtime. Aguarde instantes.'
          : 'Falha ao autenticar sessao realtime.'
      recordOperationsRealtimeSocketAuthTelemetry(performance.now() - startedAt, {
        'desk.operations.realtime.auth_result': 'rejected',
        'desk.operations.realtime.has_auth_error': true,
      })
      recordOperationsRealtimeSocketRejected('auth_failed', {
        'desk.operations.realtime.has_auth_error': true,
      })
      this.logger.warn(`Falha ao autenticar socket ${socket.id}: ${reason}`)
      socket.emit('operations.error', { message: rejectionMessage })
      socket.disconnect(true)
    }
  }

  handleDisconnect(socket: Pick<Socket, 'id' | 'data'>) {
    const sessionId = socket.data.auth?.sessionId
    if (sessionId) {
      this.realtimeSessions.untrackSessionSocket(sessionId, socket.id)
    }

    const workspaceChannel = socket.data.workspaceChannel
    if (workspaceChannel) {
      recordOperationsRealtimeSocketDisconnected({
        'desk.operations.realtime.had_workspace': true,
      })
      this.logger.debug(`Socket ${socket.id} desconectado de ${workspaceChannel}`)
      return
    }

    this.logger.debug(`Socket ${socket.id} desconectado sem workspace resolvido`)
  }

  async onModuleDestroy() {
    const clients = [this.redisPubClient, this.redisSubClient].filter((client): client is Redis => Boolean(client))
    this.redisPubClient = null
    this.redisSubClient = null

    await Promise.all(
      clients.map(async (client) => {
        try {
          await client.quit()
        } catch {
          client.disconnect()
        }
      }),
    )
  }
}

function resolveSocketIpAddress(socket: Pick<Socket, 'handshake'>) {
  const forwardedForHeader = socket.handshake.headers['x-forwarded-for']
  const rawForwardedFor = Array.isArray(forwardedForHeader) ? forwardedForHeader[0] : forwardedForHeader
  if (rawForwardedFor) {
    const firstForwardedIp = rawForwardedFor.split(',')[0]?.trim()
    if (firstForwardedIp) {
      return firstForwardedIp
    }
  }

  return typeof socket.handshake.address === 'string' ? socket.handshake.address : null
}
