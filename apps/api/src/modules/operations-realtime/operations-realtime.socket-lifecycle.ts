import { HttpException, HttpStatus } from '@nestjs/common'
import type { Socket } from 'socket.io'
import type { AuthRateLimitService } from '../auth/auth-rate-limit.service'
import {
  recordOperationsRealtimeSocketAuthTelemetry,
  recordOperationsRealtimeSocketConnected,
  recordOperationsRealtimeSocketRejected,
} from '../../common/observability/business-telemetry.util'
import { isAllowedOrigin } from '../../common/utils/origin.util'
import type { OperationsRealtimeSessionsService } from './operations-realtime-sessions.service'
import { extractOperationsRealtimeBearerToken } from './operations-realtime.socket-auth'
import type { OperationsRealtimeConnectionContext } from './operations-realtime.socket.types'

const SOCKET_AUTH_FAILED_MESSAGE = 'Falha ao autenticar sessao realtime.'
const SOCKET_RATE_LIMITED_MESSAGE = 'Muitas tentativas de conexao realtime. Aguarde instantes.'

type RealtimeLifecycleLogger = {
  warn(message: string): unknown
  debug(message: string): unknown
}

export function rejectUnauthorizedOperationsSocketOrigin(
  socket: Socket,
  allowedOrigins: string[],
  logger: RealtimeLifecycleLogger,
) {
  const socketOrigin = resolveSocketOrigin(socket)
  if (!socketOrigin || isAllowedOrigin(socketOrigin, allowedOrigins)) {
    return false
  }

  recordOperationsRealtimeSocketRejected('origin_not_allowed', {
    'desk.operations.realtime.has_origin': true,
  })
  logger.warn(`Socket ${socket.id} recusado por origem não autorizada: ${socketOrigin}`)
  socket.disconnect(true)
  return true
}

export async function assertOperationsRealtimeSocketRateLimit(
  socket: Socket,
  authRateLimitService: AuthRateLimitService,
) {
  const rawToken = extractOperationsRealtimeBearerToken(socket.handshake)
  const rateLimitKey = authRateLimitService.buildRealtimeSocketKey(rawToken, resolveSocketIpAddress(socket))
  await authRateLimitService.assertRealtimeSocketAllowed(rateLimitKey)
  await authRateLimitService.recordRealtimeSocketAttempt(rateLimitKey)
}

export function recordOperationsRealtimeSocketAccepted(
  startedAt: number,
  connection: OperationsRealtimeConnectionContext,
) {
  recordOperationsRealtimeSocketAuthTelemetry(performance.now() - startedAt, {
    'desk.operations.realtime.auth_result': 'accepted',
    'desk.operations.realtime.actor_role': connection.auth.role,
    'desk.operations.realtime.has_workspace': Boolean(connection.workspaceOwnerUserId),
  })
  recordOperationsRealtimeSocketConnected({
    'desk.operations.realtime.actor_role': connection.auth.role,
    'desk.operations.realtime.has_workspace': Boolean(connection.workspaceOwnerUserId),
  })
}

export async function joinOperationsRealtimeSocketChannels(socket: Socket, scopedChannels: string[]) {
  for (const channel of scopedChannels) {
    await socket.join(channel)
  }
}

export function trackOperationsRealtimeSessionSocket(
  socket: Socket,
  connection: OperationsRealtimeConnectionContext,
  realtimeSessions: OperationsRealtimeSessionsService,
) {
  realtimeSessions.trackSessionSocket(connection.auth.sessionId, socket.id, () => socket.disconnect(true))
}

export function registerOperationsRealtimeAckHandler(socket: Socket, logger: RealtimeLifecycleLogger) {
  socket.on('operations.ack', (payload: unknown) => {
    const ackPayload = payload as { envelopeId?: string; event?: string } | null
    logger.debug(
      `Socket ${socket.id} confirmou entrega: ${ackPayload?.event ?? 'desconhecido'} envelope=${ackPayload?.envelopeId ?? 'sem-id'}`,
    )
  })
}

export function logOperationsRealtimeSocketConnected(
  socket: Socket,
  connection: OperationsRealtimeConnectionContext,
  scopedChannels: string[],
  logger: RealtimeLifecycleLogger,
) {
  logger.debug(
    `Socket ${socket.id} conectado em ${scopedChannels.join(', ')} (${connection.auth.userId} -> ${connection.workspaceOwnerUserId})`,
  )
}

export function rejectOperationsRealtimeSocketAuth(
  socket: Socket,
  startedAt: number,
  error: unknown,
  logger: RealtimeLifecycleLogger,
) {
  const reason = getErrorMessage(error, 'Falha ao autenticar socket operacional.')
  recordOperationsRealtimeSocketAuthTelemetry(performance.now() - startedAt, {
    'desk.operations.realtime.auth_result': 'rejected',
    'desk.operations.realtime.has_auth_error': true,
  })
  recordOperationsRealtimeSocketRejected('auth_failed', {
    'desk.operations.realtime.has_auth_error': true,
  })
  logger.warn(`Falha ao autenticar socket ${socket.id}: ${reason}`)
  socket.emit('operations.error', { message: resolveSocketAuthRejectionMessage(error) })
  socket.disconnect(true)
}

function resolveSocketOrigin(socket: Pick<Socket, 'handshake'>) {
  const socketOriginHeader = socket.handshake.headers.origin
  return Array.isArray(socketOriginHeader) ? socketOriginHeader[0] : socketOriginHeader
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

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function resolveSocketAuthRejectionMessage(error: unknown) {
  return error instanceof HttpException && error.getStatus() === HttpStatus.TOO_MANY_REQUESTS
    ? SOCKET_RATE_LIMITED_MESSAGE
    : SOCKET_AUTH_FAILED_MESSAGE
}
