'use client'

import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import type { QueryClient } from '@tanstack/react-query'

const OPERATIONS_EVENTS = [
  'cash.opened',
  'cash.updated',
  'comanda.opened',
  'comanda.updated',
  'comanda.closed',
  'cash.closure.updated',
  'kitchen.item.queued',
  'kitchen.item.updated',
] as const

export type RealtimeStatus = 'connecting' | 'connected' | 'disconnected'

export function useOperationsRealtime(
  enabled: boolean,
  queryClient: QueryClient,
): { status: RealtimeStatus } {
  const [status, setStatus] = useState<RealtimeStatus>('connecting')

  useEffect(() => {
    if (!enabled) {
      setStatus('disconnected')
      return
    }

    setStatus('connecting')

    const socket = io(buildOperationsSocketUrl(), {
      withCredentials: true,
      reconnectionDelay: 2_000,
      reconnectionDelayMax: 10_000,
    })

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['operations', 'live'] })
      queryClient.invalidateQueries({ queryKey: ['mesas'] })
    }

    const invalidateCommercial = () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] })
    }

    socket.on('connect', () => setStatus('connected'))
    socket.on('disconnect', () => setStatus('disconnected'))
    socket.on('connect_error', () => {
      setStatus('disconnected')
      // fallback: força atualização mesmo sem socket
      invalidate()
    })

    for (const eventName of OPERATIONS_EVENTS) {
      socket.on(eventName, invalidate)
    }

    socket.on('comanda.closed', invalidateCommercial)

    return () => {
      for (const eventName of OPERATIONS_EVENTS) {
        socket.off(eventName, invalidate)
      }

      socket.off('comanda.closed', invalidateCommercial)
      socket.off('connect')
      socket.off('disconnect')
      socket.off('connect_error')
      socket.disconnect()
      setStatus('disconnected')
    }
  }, [enabled, queryClient])

  return { status }
}

function buildOperationsSocketUrl() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
  return `${apiBaseUrl}/operations`
}
