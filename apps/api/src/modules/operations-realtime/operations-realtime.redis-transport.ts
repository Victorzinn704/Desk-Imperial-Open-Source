import { createAdapter } from '@socket.io/redis-adapter'
import Redis from 'ioredis'
import type { Namespace } from 'socket.io'
import { recordOperationsRealtimeRedisAdapterState } from '../../common/observability/business-telemetry.util'

const SESSION_REVOKE_CHANNEL = 'operations:realtime:session-revoke'
const PRODUCTION_REDIS_REQUIRED_MESSAGE =
  'REDIS_URL obrigatório em produção: defina REDIS_URL/REDIS_PRIVATE_URL/REDIS_PUBLIC_URL para que o adapter Socket.IO atravesse instâncias.'
const MEMORY_ADAPTER_MESSAGE =
  'Redis não definido (REDIS_URL/REDIS_PRIVATE_URL/REDIS_PUBLIC_URL) — Socket.IO usando adapter em memória (instância única).'

type RealtimeLogger = {
  log(message: string): unknown
  warn(message: string): unknown
  error(message: string): unknown
}

export type OperationsRealtimeRedisTransportClients = {
  redisPubClient: Redis | null
  redisSubClient: Redis | null
  redisSessionRevokeClient: Redis | null
  redisSessionRevokePubClient: Redis | null
}

type ConfigureOperationsRealtimeRedisTransportOptions = {
  server: Namespace
  redisUrl: string | null
  nodeEnv: string | undefined
  logger: RealtimeLogger
  disconnectSessionsLocally(sessionIds: string[]): void
}

export function configureOperationsRealtimeRedisTransport({
  server,
  redisUrl,
  nodeEnv,
  logger,
  disconnectSessionsLocally,
}: ConfigureOperationsRealtimeRedisTransportOptions): OperationsRealtimeRedisTransportClients {
  if (!redisUrl) {
    return configureMemoryAdapterFallback(nodeEnv, logger)
  }

  try {
    const pubClient = new Redis(redisUrl)
    const subClient = pubClient.duplicate()
    attachRedisAdapter(server, pubClient, subClient, logger)
    const { revokeSub, revokePub } = attachSessionRevokeChannel(pubClient, logger, disconnectSessionsLocally)

    return {
      redisPubClient: pubClient,
      redisSubClient: subClient,
      redisSessionRevokeClient: revokeSub,
      redisSessionRevokePubClient: revokePub,
    }
  } catch (error) {
    recordOperationsRealtimeRedisAdapterState(false, 'initialization_error')
    logger.warn(`Redis adapter não inicializado — usando adapter padrão em memória: ${getErrorMessage(error)}`)
    return emptyRedisClients()
  }
}

export async function publishOperationsRealtimeSessionRevoke(
  redisSessionRevokePubClient: Redis | null,
  sessionIds: string[],
  logger: RealtimeLogger,
) {
  if (!redisSessionRevokePubClient) {
    return
  }

  try {
    await redisSessionRevokePubClient.publish(SESSION_REVOKE_CHANNEL, JSON.stringify({ sessionIds }))
  } catch (error) {
    logger.warn(`session-revoke: falha ao publicar revogação cross-pod: ${getErrorMessage(error)}`)
  }
}

function configureMemoryAdapterFallback(nodeEnv: string | undefined, logger: RealtimeLogger) {
  recordOperationsRealtimeRedisAdapterState(false, 'missing_redis_url')
  if (nodeEnv === 'production') {
    throw new Error(PRODUCTION_REDIS_REQUIRED_MESSAGE)
  }
  logger.log(MEMORY_ADAPTER_MESSAGE)
  return emptyRedisClients()
}

function attachRedisAdapter(server: Namespace, pubClient: Redis, subClient: Redis, logger: RealtimeLogger) {
  pubClient.on('error', (error) => logger.error(`Redis pub/sub erro (pub): ${error.message}`))
  subClient.on('error', (error) => logger.error(`Redis pub/sub erro (sub): ${error.message}`))
  server.server.adapter(createAdapter(pubClient, subClient))
  recordOperationsRealtimeRedisAdapterState(true, 'configured')
  logger.log('Redis adapter ativo — Socket.IO pronto para escalonamento horizontal.')
}

function attachSessionRevokeChannel(
  pubClient: Redis,
  logger: RealtimeLogger,
  disconnectSessionsLocally: (sessionIds: string[]) => void,
) {
  const revokeSub = pubClient.duplicate()
  const revokePub = pubClient.duplicate()

  revokeSub.on('error', (error) => logger.error(`Redis session-revoke erro (sub): ${error.message}`))
  revokePub.on('error', (error) => logger.error(`Redis session-revoke erro (pub): ${error.message}`))
  void revokeSub.subscribe(SESSION_REVOKE_CHANNEL)
  revokeSub.on('message', (_channel: string, message: string) => {
    const sessionIds = parseSessionRevokeMessage(message)
    if (!sessionIds) {
      logger.warn('session-revoke: mensagem inválida recebida do Redis.')
      return
    }

    disconnectSessionsLocally(sessionIds)
  })
  logger.log('Redis session-revoke channel ativo — revogação cross-pod habilitada.')

  return { revokeSub, revokePub }
}

function parseSessionRevokeMessage(message: string) {
  try {
    const payload = JSON.parse(message) as { sessionIds?: unknown }
    if (!Array.isArray(payload.sessionIds)) {
      return null
    }

    const sessionIds = payload.sessionIds.filter((sessionId): sessionId is string => typeof sessionId === 'string')
    return sessionIds.length > 0 ? sessionIds : null
  } catch {
    return null
  }
}

function emptyRedisClients(): OperationsRealtimeRedisTransportClients {
  return {
    redisPubClient: null,
    redisSubClient: null,
    redisSessionRevokeClient: null,
    redisSessionRevokePubClient: null,
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
