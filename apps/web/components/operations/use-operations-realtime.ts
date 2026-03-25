'use client'

import { useEffect } from 'react'
import { io } from 'socket.io-client'
import type { QueryClient } from '@tanstack/react-query'

const OPERATIONS_EVENTS = [
  'cash.opened',
  'cash.updated',
  'comanda.opened',
  'comanda.updated',
  'comanda.closed',
  'cash.closure.updated',
] as const

export function useOperationsRealtime(enabled: boolean, queryClient: QueryClient) {
  useEffect(() => {
    if (!enabled) {
      return
    }

    const socket = io(buildOperationsSocketUrl(), {
      withCredentials: true,
    })

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['operations', 'live'] })
    }

    for (const eventName of OPERATIONS_EVENTS) {
      socket.on(eventName, invalidate)
    }

    socket.on('connect_error', invalidate)

    return () => {
      for (const eventName of OPERATIONS_EVENTS) {
        socket.off(eventName, invalidate)
      }

      socket.off('connect_error', invalidate)
      socket.disconnect()
    }
  }, [enabled, queryClient])
}

function buildOperationsSocketUrl() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
  return `${apiBaseUrl}/operations`
}
