import { Injectable, Logger } from '@nestjs/common'
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import { createAdapter } from '@socket.io/redis-adapter'
import Redis from 'ioredis'
import type { Namespace, Socket } from 'socket.io'
import { AuthService } from '../auth/auth.service'
import { resolveWorkspaceOwnerUserId } from '../../common/utils/workspace-access.util'
import {
  buildWorkspaceChannel,
  OPERATIONS_REALTIME_NAMESPACE,
  type OperationsRealtimeNamespaceLike,
} from './operations-realtime.types'
import { OperationsRealtimeService } from './operations-realtime.service'
import { authenticateOperationsRealtimeSocket } from './operations-realtime.socket-auth'
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
const ALLOWED_ORIGINS = [
  'https://app.deskimperial.online',
  ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:3000'] : []),
]

@WebSocketGateway({
  namespace: OPERATIONS_REALTIME_NAMESPACE,
  cors: {
    origin: ALLOWED_ORIGINS,
    credentials: true,
  },
})
@Injectable()
export class OperationsRealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(OperationsRealtimeGateway.name)
  private namespace: OperationsRealtimeNamespaceLike | null = null

  @WebSocketServer()
  server!: Namespace

  constructor(
    private readonly operationsRealtimeService: OperationsRealtimeService,
    private readonly authService: AuthService,
  ) {}

  afterInit(server: Namespace) {
    const redisUrl = process.env.REDIS_URL
    if (redisUrl) {
      try {
        const pubClient = new Redis(redisUrl)
        const subClient = pubClient.duplicate()
        server.server.adapter(createAdapter(pubClient, subClient))
        this.logger.log('Redis adapter ativo — Socket.IO pronto para escalonamento horizontal.')
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        this.logger.warn(`Redis adapter não inicializado — usando adapter padrão em memória: ${msg}`)
      }
    } else {
      this.logger.log('REDIS_URL não definido — Socket.IO usando adapter em memória (instância única).')
    }

    this.bindNamespace(server)
  }

  bindNamespace(namespace: OperationsRealtimeNamespaceLike) {
    this.namespace = namespace
    this.operationsRealtimeService.attachNamespace(namespace)
    this.logger.log(`Bridge realtime operacional pronta em ${OPERATIONS_REALTIME_NAMESPACE}`)
  }

  async authenticateConnection(socket: OperationsRealtimeSocketLike): Promise<OperationsRealtimeConnectionContext> {
    return authenticateOperationsRealtimeSocket(socket, (rawToken) => this.authService.validateSessionToken(rawToken))
  }

  async handleConnection(socket: Socket) {
    try {
      const connection = await this.authenticateConnection(socket)
      await socket.join(connection.workspaceChannel)

      this.logger.debug(
        `Socket ${socket.id} conectado em ${connection.workspaceChannel} (${connection.auth.userId} -> ${resolveWorkspaceOwnerUserId(connection.auth)})`,
      )
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Falha ao autenticar socket operacional.'
      socket.emit('operations.error', { message: reason })
      socket.disconnect(true)
    }
  }

  handleDisconnect(socket: Pick<Socket, 'id' | 'data'>) {
    const workspaceChannel = socket.data.workspaceChannel
    if (workspaceChannel) {
      this.logger.debug(`Socket ${socket.id} desconectado de ${workspaceChannel}`)
      return
    }

    this.logger.debug(`Socket ${socket.id} desconectado sem workspace resolvido`)
  }

  emitWorkspaceSync<TPayload>(workspaceOwnerUserId: string, event: string, payload: TPayload) {
    const namespace = this.namespace
    const channel = buildWorkspaceChannel(workspaceOwnerUserId)

    namespace?.to(channel).emit(event, payload)
  }
}
