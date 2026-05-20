'use client'

import { useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { recordOperationsSocketLifecycleEvent } from '@/lib/operations/operations-performance-diagnostics'

export type RealtimeStatus = 'connecting' | 'connected' | 'disconnected'

export type OperationsRealtimeEnvelope = {
  id?: string
  event: (typeof OPERATIONS_EVENTS)[number]
  workspaceOwnerUserId?: string
  actorUserId?: string | null
  actorRole?: 'OWNER' | 'STAFF' | null
  createdAt?: string
  payload: Record<string, unknown>
}

export const OPERATIONS_EVENTS = [
  'cash.opened',
  'cash.updated',
  'comanda.opened',
  'comanda.updated',
  'comanda.closed',
  'cash.closure.updated',
  'kitchen.item.queued',
  'kitchen.item.updated',
  'mesa.upserted',
] as const

/**
 * Eventos terminais que enviam ACK de volta ao servidor após entrega (C9).
 * Permite ao servidor correlacionar entrega sem bloquear o consumer.
 */
const TERMINAL_EVENTS_FOR_ACK = new Set<string>(['comanda.closed', 'cash.closure.updated'])

export function useOperationsSocket(
  enabled: boolean,
  onEvent: (envelope?: OperationsRealtimeEnvelope) => void,
  onReconnect?: () => void | Promise<void>,
  onSocketError?: (message: string) => void,
): { status: RealtimeStatus } {
  const [status, setStatus] = useState<RealtimeStatus>(() => (enabled ? 'connecting' : 'disconnected'))
  const socketRef = useRef<Socket | null>(null)
  const shouldRefreshBaselineRef = useRef(false)
  const reconnectRefreshInFlightRef = useRef<Promise<void> | null>(null)

  const onEventRef = useRef(onEvent)
  const onReconnectRef = useRef(onReconnect)
  const onSocketErrorRef = useRef(onSocketError)

  useEffect(() => {
    onEventRef.current = onEvent
    onReconnectRef.current = onReconnect
    onSocketErrorRef.current = onSocketError
  }, [onEvent, onReconnect, onSocketError])

  useEffect(() => {
    if (!enabled) {
      setStatus('disconnected') // eslint-disable-line react-hooks/set-state-in-effect -- sync with prop
      shouldRefreshBaselineRef.current = false
      reconnectRefreshInFlightRef.current = null
      return
    }

    setStatus('connecting')

    const socket = io(buildOperationsSocketUrl(), {
      transports: ['websocket', 'polling'],
      upgrade: true,
      withCredentials: true,
      timeout: 8_000,
      reconnectionDelay: 2_000,
      reconnectionDelayMax: 10_000,
      randomizationFactor: 0.5,
    })
    socketRef.current = socket
    const listenerCount = OPERATIONS_EVENTS.length + 4
    recordOperationsSocketLifecycleEvent('opened', listenerCount)

    const runReconnectRefresh = () => {
      if (reconnectRefreshInFlightRef.current) {
        return reconnectRefreshInFlightRef.current
      }

      if (!onReconnectRef.current) {
        return null
      }

      const refreshPromise = Promise.resolve(onReconnectRef.current()).finally(() => {
        reconnectRefreshInFlightRef.current = null
        if (shouldRefreshBaselineRef.current && socket.connected) {
          shouldRefreshBaselineRef.current = false
          void runReconnectRefresh()
        }
      })

      reconnectRefreshInFlightRef.current = refreshPromise
      return refreshPromise
    }

    const requestBaselineRefresh = () => {
      shouldRefreshBaselineRef.current = true
      if (!socket.connected || reconnectRefreshInFlightRef.current) {
        return
      }

      shouldRefreshBaselineRef.current = false
      void runReconnectRefresh()
    }

    const onConnect = () => {
      setStatus('connected')
      recordOperationsSocketLifecycleEvent('connect', listenerCount)

      if (shouldRefreshBaselineRef.current) {
        shouldRefreshBaselineRef.current = false
        void runReconnectRefresh()
      }
    }
    const onDisconnect = () => {
      setStatus('disconnected')
      shouldRefreshBaselineRef.current = true
      recordOperationsSocketLifecycleEvent('disconnect', listenerCount)
    }
    const onConnectError = () => {
      setStatus('disconnected')
      shouldRefreshBaselineRef.current = true
      recordOperationsSocketLifecycleEvent('connect_error', listenerCount)
    }
    const onOperationsError = (payload?: { message?: string }) => {
      setStatus('disconnected')
      shouldRefreshBaselineRef.current = false
      onSocketErrorRef.current?.(payload?.message ?? 'Sessao realtime indisponivel.')
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestBaselineRefresh()
      }
    }
    const onPageShow = () => {
      requestBaselineRefresh()
    }
    const onOnline = () => {
      requestBaselineRefresh()
    }
    const handleEvent = (envelope?: OperationsRealtimeEnvelope) => {
      onEventRef.current?.(envelope)
      // C9: ACK seletivo para eventos terminais — fire-and-forget, não bloqueia o consumer.
      if (envelope?.id && TERMINAL_EVENTS_FOR_ACK.has(envelope.event) && socket.connected) {
        socket.emit('operations.ack', { envelopeId: envelope.id, event: envelope.event })
      }
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('connect_error', onConnectError)
    socket.on('operations.error', onOperationsError)
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pageshow', onPageShow)
    window.addEventListener('online', onOnline)

    for (const eventName of OPERATIONS_EVENTS) {
      socket.on(eventName, handleEvent)
    }

    return () => {
      for (const eventName of OPERATIONS_EVENTS) {
        socket.off(eventName, handleEvent)
      }

      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('connect_error', onConnectError)
      socket.off('operations.error', onOperationsError)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pageshow', onPageShow)
      window.removeEventListener('online', onOnline)
      recordOperationsSocketLifecycleEvent('closed', listenerCount)
      socket.disconnect()
      socketRef.current = null
      shouldRefreshBaselineRef.current = false
      reconnectRefreshInFlightRef.current = null
    }
  }, [enabled])

  return { status }
}

function buildOperationsSocketUrl() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
  return `${apiBaseUrl}/operations`
}
