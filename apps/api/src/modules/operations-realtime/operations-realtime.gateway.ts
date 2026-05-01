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

  private static readonly SESSION_REVOKE_CHANNEL = 'operations:realtime:session-revoke'
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

        // C3: canal dedicado de revogação de sessão cross-pod (clientes separados para não interferir no adapter)
        const revokeSub = pubClient.duplicate()
        const revokePub = pubClient.duplicate()
        this.redisSessionRevokeClient = revokeSub
        this.redisSessionRevokePubClient = revokePub
        revokeSub.on('error', (error) => this.logger.error(`Redis session-revoke erro (sub): ${error.message}`))
        revokePub.on('error', (error) => this.logger.error(`Redis session-revoke erro (pub): ${error.message}`))
        void revokeSub.subscribe(OperationsRealtimeGateway.SESSION_REVOKE_CHANNEL)
        revokeSub.on('message', (_channel: string, message: string) => {
          try {
            const { sessionIds } = JSON.parse(message) as { sessionIds: string[] }
            if (Array.isArray(sessionIds) && sessionIds.length > 0) {
              // Apenas executa localmente — sem re-publicar para evitar loop
              this.realtimeSessions.disconnectSessionsLocally(sessionIds)
            }
          } catch {
            this.logger.warn('session-revoke: mensagem inválida recebida do Redis.')
          }
        })
        this.logger.log('Redis session-revoke channel ativo — revogação cross-pod habilitada.')
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        recordOperationsRealtimeRedisAdapterState(false, 'initialization_error')
        this.logger.warn(`Redis adapter não inicializado — usando adapter padrão em memória: ${msg}`)
      }
    } else {
      recordOperationsRealtimeRedisAdapterState(false, 'missing_redis_url')
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'REDIS_URL obrigatório em produção: defina REDIS_URL/REDIS_PRIVATE_URL/REDIS_PUBLIC_URL para que o adapter Socket.IO atravesse instâncias.',
        )
      }
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
    const rawToken = (socket.handshake as { auth?: { token?: string } }).auth?.token
    const normalizedToken = rawToken ? rawToken.replace(/^Bearer\s+/i, '').trim() : null

    if (normalizedToken) {
      const cached = this.tokenAuthCache.get(normalizedToken)
      if (cached) {
        // Reusa contexto em cache — preenche socket.data para o caller
        socket.data.auth = cached.context.auth
        socket.data.workspaceOwnerUserId = cached.context.workspaceOwnerUserId
        socket.data.workspaceChannel = cached.context.workspaceChannel
        return cached.context
      }
    }

    const context = await authenticateOperationsRealtimeSocket(socket, (token) =>
      this.authService.validateSessionToken(token),
    )

    // Popula cache com TTL — entrada expirará automaticamente.
    if (normalizedToken) {
      const timer = setTimeout(() => {
        this.tokenAuthCache.delete(normalizedToken)
      }, OperationsRealtimeGateway.TOKEN_AUTH_CACHE_TTL_MS)
      if (typeof timer === 'object' && 'unref' in timer && typeof timer.unref === 'function') {
        timer.unref()
      }
      this.tokenAuthCache.set(normalizedToken, { context, timer })
      socket.data.rawToken = normalizedToken
    }

    return context
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

      // C9: ACK de entrega para eventos terminais — cliente emite este evento após receber comanda.closed / cash.closure.updated.
      socket.on('operations.ack', (payload: unknown) => {
        const ackPayload = payload as { envelopeId?: string; event?: string } | null
        this.logger.debug(
          `Socket ${socket.id} confirmou entrega: ${ackPayload?.event ?? 'desconhecido'} envelope=${ackPayload?.envelopeId ?? 'sem-id'}`,
        )
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
    this.realtimeSessions.disconnectSessionsLocally(sessionIds)

    // Publicação cross-pod (fire-and-forget)
    const revokePub = this.redisSessionRevokePubClient
    if (revokePub) {
      try {
        await revokePub.publish(OperationsRealtimeGateway.SESSION_REVOKE_CHANNEL, JSON.stringify({ sessionIds }))
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        this.logger.warn(`session-revoke: falha ao publicar revogação cross-pod: ${msg}`)
      }
    }
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
