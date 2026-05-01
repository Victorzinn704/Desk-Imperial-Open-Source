import type { AuthContext } from '../auth/auth.types'

export type OperationsRealtimeSocketHandshakeLike = {
  auth?: {
    token?: string
    bearer?: string
    accessToken?: string
  }
  headers?: Record<string, string | string[] | undefined>
}

export type OperationsRealtimeSocketData = {
  auth?: AuthContext
  workspaceOwnerUserId?: string
  workspaceChannel?: string
  /** Token bruto normalizado — armazenado para invalidação do auth cache no disconnect. */
  rawToken?: string
}

export interface OperationsRealtimeSocketLike {
  id: string
  handshake: OperationsRealtimeSocketHandshakeLike
  data: OperationsRealtimeSocketData
  join(room: string): unknown
  leave?(room: string): unknown
  disconnect?(close?: boolean): unknown
  emit?(event: string, payload: unknown): unknown
}

export type OperationsRealtimeSocketTokenValidator = (rawToken: string) => Promise<AuthContext | null>

export type OperationsRealtimeConnectionContext = {
  auth: AuthContext
  workspaceOwnerUserId: string
  workspaceChannel: string
  rawToken: string
}
