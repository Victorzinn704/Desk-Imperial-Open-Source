import { UnauthorizedException } from '@nestjs/common'
import type { AuthContext } from '../auth/auth.types'
import { DEV_SESSION_COOKIE_NAME, PROD_SESSION_COOKIE_NAME } from '../auth/auth.constants'
import { resolveWorkspaceOwnerUserId } from '../../common/utils/workspace-access.util'
import { assertOperationsRealtimeWorkspaceAccess } from './operations-realtime.auth'
import { buildWorkspaceChannel } from './operations-realtime.types'
import type {
  OperationsRealtimeConnectionContext,
  OperationsRealtimeSocketHandshakeLike,
  OperationsRealtimeSocketLike,
  OperationsRealtimeSocketTokenValidator,
} from './operations-realtime.socket.types'

function normalizeBearerToken(rawToken: string | undefined | null) {
  if (!rawToken) {
    return null
  }

  const trimmedToken = rawToken.trim()
  if (!trimmedToken) {
    return null
  }

  if (trimmedToken.toLowerCase().startsWith('bearer ')) {
    return trimmedToken.slice(7).trim() || null
  }

  return trimmedToken
}

export function extractOperationsRealtimeBearerToken(handshake: OperationsRealtimeSocketHandshakeLike) {
  const directToken = normalizeBearerToken(handshake.auth?.token)
  if (directToken) {
    return directToken
  }

  const bearerToken = normalizeBearerToken(handshake.auth?.bearer)
  if (bearerToken) {
    return bearerToken
  }

  const accessToken = normalizeBearerToken(handshake.auth?.accessToken)
  if (accessToken) {
    return accessToken
  }

  const authorizationHeader = handshake.headers?.authorization
  const rawAuthorization = Array.isArray(authorizationHeader) ? authorizationHeader[0] : authorizationHeader
  const headerToken = normalizeBearerToken(rawAuthorization)
  if (headerToken) {
    return headerToken
  }

  const xAccessTokenHeader = handshake.headers?.['x-access-token']
  const rawXAccessToken = Array.isArray(xAccessTokenHeader) ? xAccessTokenHeader[0] : xAccessTokenHeader
  const xAccessToken = normalizeBearerToken(rawXAccessToken)
  if (xAccessToken) {
    return xAccessToken
  }

  const cookieHeader = handshake.headers?.cookie
  const rawCookieHeader = Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader
  const parsedCookies = parseCookieHeader(rawCookieHeader)

  return parsedCookies[PROD_SESSION_COOKIE_NAME] ?? parsedCookies[DEV_SESSION_COOKIE_NAME] ?? null
}

export async function authenticateOperationsRealtimeSocket(
  socket: Pick<OperationsRealtimeSocketLike, 'data' | 'handshake' | 'id'>,
  validateSessionToken: OperationsRealtimeSocketTokenValidator,
): Promise<OperationsRealtimeConnectionContext> {
  const rawToken = extractOperationsRealtimeBearerToken(socket.handshake)

  if (!rawToken) {
    throw new UnauthorizedException('Sessao nao encontrada para o realtime operacional.')
  }

  const auth = await validateSessionToken(rawToken)

  if (!auth) {
    throw new UnauthorizedException('Sessao invalida ou expirada.')
  }

  const workspaceOwnerUserId = resolveWorkspaceOwnerUserId(auth)
  const workspaceChannel = buildWorkspaceChannel(workspaceOwnerUserId)

  assertOperationsRealtimeWorkspaceAccess(
    auth as Pick<AuthContext, 'userId' | 'companyOwnerUserId' | 'role' | 'status'>,
    workspaceOwnerUserId,
  )

  socket.data.auth = auth
  socket.data.workspaceOwnerUserId = workspaceOwnerUserId
  socket.data.workspaceChannel = workspaceChannel

  return {
    auth,
    workspaceOwnerUserId,
    workspaceChannel,
    rawToken,
  }
}

function parseCookieHeader(rawCookieHeader: string | undefined) {
  if (!rawCookieHeader) {
    return {} as Record<string, string>
  }

  return rawCookieHeader.split(';').reduce<Record<string, string>>((cookies, chunk) => {
    const separatorIndex = chunk.indexOf('=')
    if (separatorIndex <= 0) {
      return cookies
    }

    const key = chunk.slice(0, separatorIndex).trim()
    const value = chunk.slice(separatorIndex + 1).trim()
    if (!key) {
      return cookies
    }

    cookies[key] = decodeURIComponent(value)
    return cookies
  }, {})
}
