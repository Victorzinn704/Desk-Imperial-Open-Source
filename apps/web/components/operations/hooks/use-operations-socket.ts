'use client'

import { useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

export type RealtimeStatus = 'connecting' | 'connected' | 'disconnected'

export type OperationsRealtimeEnvelope = {
  event: (typeof OPERATIONS_EVENTS)[number]
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

export function useOperationsSocket(
  enabled: boolean,
  onEvent: (envelope?: OperationsRealtimeEnvelope) => void,
): { status: RealtimeStatus } {
  const [status, setStatus] = useState<RealtimeStatus>(() => (enabled ? 'connecting' : 'disconnected'))
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!enabled) {
      setStatus('disconnected') // eslint-disable-line react-hooks/set-state-in-effect -- sync with prop
      return
    }

    setStatus('connecting')

    const socket = io(buildOperationsSocketUrl(), {
      withCredentials: true,
      reconnectionDelay: 2_000,
      reconnectionDelayMax: 10_000,
    })
    socketRef.current = socket

    const onConnect = () => setStatus('connected')
    const onDisconnect = () => setStatus('disconnected')
    const onConnectError = () => {
      setStatus('disconnected')
      onEvent()
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('connect_error', onConnectError)

    for (const eventName of OPERATIONS_EVENTS) {
      socket.on(eventName, onEvent)
    }

    return () => {
      for (const eventName of OPERATIONS_EVENTS) {
        socket.off(eventName, onEvent)
      }

      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('connect_error', onConnectError)
      socket.disconnect()
      socketRef.current = null
    }
  }, [enabled, onEvent])

  return { status }
}

function buildOperationsSocketUrl() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
  return `${apiBaseUrl}/operations`
}
