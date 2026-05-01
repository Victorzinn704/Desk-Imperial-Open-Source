import { Injectable } from '@nestjs/common'

type DisconnectSocketFn = () => void

@Injectable()
export class OperationsRealtimeSessionsService {
  private readonly disconnectorsBySessionId = new Map<string, Map<string, DisconnectSocketFn>>()

  trackSessionSocket(sessionId: string, socketId: string, disconnectSocket: DisconnectSocketFn) {
    const sessionSockets = this.disconnectorsBySessionId.get(sessionId) ?? new Map<string, DisconnectSocketFn>()
    sessionSockets.set(socketId, disconnectSocket)
    this.disconnectorsBySessionId.set(sessionId, sessionSockets)
  }

  untrackSessionSocket(sessionId: string, socketId: string) {
    const sessionSockets = this.disconnectorsBySessionId.get(sessionId)
    if (!sessionSockets) {
      return
    }

    sessionSockets.delete(socketId)
    if (sessionSockets.size === 0) {
      this.disconnectorsBySessionId.delete(sessionId)
    }
  }

  disconnectSession(sessionId: string) {
    this.disconnectSessions([sessionId])
  }

  disconnectSessions(sessionIds: string[]) {
    this.disconnectSessionsLocally(sessionIds)
  }

  /**
   * Variante local-only de disconnectSessions — chamada pelo subscriber Redis (C3) para evitar loop.
   * Não deve ser chamada diretamente por código de domínio; use revokeSessionsCrossPod no gateway.
   */
  disconnectSessionsLocally(sessionIds: string[]) {
    for (const sessionId of new Set(sessionIds)) {
      const sessionSockets = this.disconnectorsBySessionId.get(sessionId)
      if (!sessionSockets) {
        continue
      }

      this.disconnectorsBySessionId.delete(sessionId)

      for (const disconnectSocket of sessionSockets.values()) {
        try {
          disconnectSocket()
        } catch {
          // O socket já pode ter sido fechado por outra transição de lifecycle.
        }
      }
    }
  }

  countTrackedSockets(sessionId: string) {
    return this.disconnectorsBySessionId.get(sessionId)?.size ?? 0
  }
}
