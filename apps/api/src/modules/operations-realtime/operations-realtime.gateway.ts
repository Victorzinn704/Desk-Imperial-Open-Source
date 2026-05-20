import { Inject, Injectable, Logger, type OnModuleDestroy } from '@nestjs/common'
import {
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  type OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import type Redis from 'ioredis'
import type { Namespace, Socket } from 'socket.io'
import { AuthService } from '../auth/auth.service'
import { AuthRateLimitService } from '../auth/auth-rate-limit.service'
import { recordOperationsRealtimeSocketDisconnected } from '../../common/observability/business-telemetry.util'
import { getAllowedOriginsFromValues, isAllowedOrigin } from '../../common/utils/origin.util'
import { resolveRedisUrl } from '../../common/utils/redis-url.util'
import {
  OPERATIONS_REALTIME_NAMESPACE,
  type OperationsRealtimeNamespaceLike,
  resolveOperationsRealtimeSocketChannels,
} from './operations-realtime.types'
import {
  configureOperationsRealtimeRedisTransport,
  publishOperationsRealtimeSessionRevoke,
} from './operations-realtime.redis-transport'
import { OperationsRealtimeService } from './operations-realtime.service'
import { OperationsRealtimeSessionsService } from './operations-realtime-sessions.service'
import {
  assertOperationsRealtimeSocketRateLimit,
  joinOperationsRealtimeSocketChannels,
  logOperationsRealtimeSocketConnected,
  recordOperationsRealtimeSocketAccepted,
  registerOperationsRealtimeAckHandler,
  rejectOperationsRealtimeSocketAuth,
  rejectUnauthorizedOperationsSocketOrigin,
  trackOperationsRealtimeSessionSocket,
} from './operations-realtime.socket-lifecycle'
import {
  authenticateOperationsRealtimeSocket,
  extractOperationsRealtimeBearerToken,
} from './operations-realtime.socket-auth'
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
  /** Cliente dedicado ao canal de revogação de sessão cross-pod. Separado do adapter para evitar interferência. */
  private redisSessionRevokeClient: Redis | null = null
  /** Cliente pub dedicado ao canal de revogação — publica mensagens recebidas do domain. */
  private redisSessionRevokePubClient: Redis | null = null

  /** TTL do cache de validação de token — reduz DB hits em reconexões em massa. */
  private static readonly TOKEN_AUTH_CACHE_TTL_MS = 60_000
  /**
   * Cache in-process de contextos de autenticação de token.
   * Chave: rawToken; Valor: contexto + timer de expiração.
   * Não é compartilhado entre nós — ok em multi-pod (cada nó aquece seu próprio cache).
   */
  private readonly tokenAuthCache = new Map<
    string,
    { context: OperationsRealtimeConnectionContext; timer: ReturnType<typeof setTimeout> }
  >()

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
    this.warnIfProductionOriginsAreMissing()
    this.configureRedisTransport(server)
    this.bindNamespace(server)
  }

  private warnIfProductionOriginsAreMissing() {
    if (process.env.NODE_ENV === 'production' && ALLOWED_ORIGINS.length === 0) {
      this.logger.warn(
        'Nenhuma origem permitida foi configurada para realtime. Defina APP_URL/NEXT_PUBLIC_APP_URL para evitar conexões indevidas.',
      )
    }
  }

  private configureRedisTransport(server: Namespace) {
    const clients = configureOperationsRealtimeRedisTransport({
      server,
      redisUrl: resolveRedisUrl(process.env),
      nodeEnv: process.env.NODE_ENV,
      logger: this.logger,
      disconnectSessionsLocally: (sessionIds) => this.revokeSessionsLocally(sessionIds),
    })
    this.redisPubClient = clients.redisPubClient
    this.redisSubClient = clients.redisSubClient
    this.redisSessionRevokeClient = clients.redisSessionRevokeClient
    this.redisSessionRevokePubClient = clients.redisSessionRevokePubClient
  }

  bindNamespace(namespace: OperationsRealtimeNamespaceLike) {
    this.operationsRealtimeService.attachNamespace(namespace)
    this.logger.log(`Realtime operacional pronto em ${OPERATIONS_REALTIME_NAMESPACE}`)
  }

  async authenticateConnection(socket: OperationsRealtimeSocketLike): Promise<OperationsRealtimeConnectionContext> {
    const normalizedToken = extractOperationsRealtimeBearerToken(socket.handshake)

    if (normalizedToken) {
      const cached = this.getCachedConnectionContext(normalizedToken, socket)
      if (cached) {
        return cached
      }
    }

    const context = await authenticateOperationsRealtimeSocket(socket, (token) =>
      this.authService.validateSessionToken(token),
    )

    // Popula cache com TTL — entrada expirará automaticamente.
    if (normalizedToken) {
      this.cacheConnectionContext(normalizedToken, context, socket)
    }

    return context
  }

  private getCachedConnectionContext(
    normalizedToken: string,
    socket: OperationsRealtimeSocketLike,
  ): OperationsRealtimeConnectionContext | null {
    const cached = this.tokenAuthCache.get(normalizedToken)
    if (!cached) {
      return null
    }

    socket.data.auth = cached.context.auth
    socket.data.workspaceOwnerUserId = cached.context.workspaceOwnerUserId
    socket.data.workspaceChannel = cached.context.workspaceChannel
    socket.data.rawToken = normalizedToken
    return cached.context
  }

  private cacheConnectionContext(
    normalizedToken: string,
    context: OperationsRealtimeConnectionContext,
    socket: OperationsRealtimeSocketLike,
  ) {
    const timer = setTimeout(() => {
      this.tokenAuthCache.delete(normalizedToken)
    }, OperationsRealtimeGateway.TOKEN_AUTH_CACHE_TTL_MS)
    unrefTimer(timer)
    this.tokenAuthCache.set(normalizedToken, { context, timer })
    socket.data.rawToken = normalizedToken
  }

  /** Invalida a entrada de cache de um token após disconnect (evita servir contexto obsoleto). */
  private invalidateTokenAuthCache(rawToken: string | null | undefined) {
    if (!rawToken) {
      return
    }
    const normalizedToken = rawToken.replace(/^Bearer\s+/i, '').trim()
    const cached = this.tokenAuthCache.get(normalizedToken)
    if (cached) {
      clearTimeout(cached.timer)
      this.tokenAuthCache.delete(normalizedToken)
    }
  }

  private invalidateTokenAuthCacheBySessionIds(sessionIds: string[]) {
    const revokedSessionIds = new Set(sessionIds)
    for (const [token, cached] of this.tokenAuthCache.entries()) {
      if (!revokedSessionIds.has(cached.context.auth.sessionId)) {
        continue
      }

      clearTimeout(cached.timer)
      this.tokenAuthCache.delete(token)
    }
  }

  private revokeSessionsLocally(sessionIds: string[]) {
    this.invalidateTokenAuthCacheBySessionIds(sessionIds)
    this.realtimeSessions.disconnectSessionsLocally(sessionIds)
  }

  async handleConnection(socket: Socket) {
    if (rejectUnauthorizedOperationsSocketOrigin(socket, ALLOWED_ORIGINS, this.logger)) {
      return
    }

    const startedAt = performance.now()

    try {
      await assertOperationsRealtimeSocketRateLimit(socket, this.authRateLimitService)
      const connection = await this.authenticateConnection(socket)
      const scopedChannels = resolveOperationsRealtimeSocketChannels({
        workspaceOwnerUserId: connection.workspaceOwnerUserId,
        role: connection.auth.role,
        employeeId: connection.auth.employeeId,
      })
      recordOperationsRealtimeSocketAccepted(startedAt, connection)
      await joinOperationsRealtimeSocketChannels(socket, scopedChannels)
      trackOperationsRealtimeSessionSocket(socket, connection, this.realtimeSessions)
      registerOperationsRealtimeAckHandler(socket, this.logger)
      logOperationsRealtimeSocketConnected(socket, connection, scopedChannels, this.logger)
    } catch (error) {
      rejectOperationsRealtimeSocketAuth(socket, startedAt, error, this.logger)
    }
  }

  handleDisconnect(socket: Pick<Socket, 'id' | 'data'>) {
    const sessionId = socket.data.auth?.sessionId
    if (sessionId) {
      this.realtimeSessions.untrackSessionSocket(sessionId, socket.id)
    }

    // Invalida cache de auth para este token — evita servir contexto obsoleto em re-autenticacao.
    this.invalidateTokenAuthCache(socket.data.rawToken)

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

  /**
   * Revoga sessões localmente E publica cross-pod via Redis pub/sub (C3).
   * Chamar este método nos controllers/services que precisam revogar sessão.
   */
  async revokeSessionsCrossPod(sessionIds: string[]): Promise<void> {
    // Revogação local imediata
    this.revokeSessionsLocally(sessionIds)

    await publishOperationsRealtimeSessionRevoke(this.redisSessionRevokePubClient, sessionIds, this.logger)
  }

  async onModuleDestroy() {
    const clients = [
      this.redisPubClient,
      this.redisSubClient,
      this.redisSessionRevokeClient,
      this.redisSessionRevokePubClient,
    ].filter((client): client is Redis => Boolean(client))
    this.redisPubClient = null
    this.redisSubClient = null
    this.redisSessionRevokeClient = null
    this.redisSessionRevokePubClient = null

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

function unrefTimer(timer: ReturnType<typeof setTimeout>) {
  const maybeTimer = timer as { unref?: unknown }
  if (typeof maybeTimer.unref !== 'function') {
    return
  }

  maybeTimer.unref()
}
