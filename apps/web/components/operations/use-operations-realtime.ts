'use client'

import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import type { QueryClient } from '@tanstack/react-query'
import type { OperationsLiveResponse } from '@contracts/contracts'

const OPERATIONS_EVENTS = [
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

export type RealtimeStatus = 'connecting' | 'connected' | 'disconnected'

export function useOperationsRealtime(enabled: boolean, queryClient: QueryClient): { status: RealtimeStatus } {
  const [status, setStatus] = useState<RealtimeStatus>('connecting')
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!enabled) {
      setStatus('disconnected') // eslint-disable-line react-hooks/set-state-in-effect
      return
    }

    setStatus('connecting')  

    const socket = io(buildOperationsSocketUrl(), {
      withCredentials: true,
      reconnectionDelay: 2_000,
      reconnectionDelayMax: 10_000,
    })

    // Write-through: se o evento vier com snapshot, aplica direto no cache.
    // Caso contrário, invalida com debounce de 200ms para evitar cascata de re-renders.
    const handleEvent = (payload?: { snapshot?: OperationsLiveResponse }) => {
      if (payload?.snapshot) {
        queryClient.setQueryData(['operations', 'live'], payload.snapshot)
        return
      }
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['operations', 'live'] })
        queryClient.invalidateQueries({ queryKey: ['mesas'] })
      }, 200)
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
      handleEvent()
    })

    for (const eventName of OPERATIONS_EVENTS) {
      socket.on(eventName, handleEvent)
    }

    socket.on('comanda.closed', invalidateCommercial)

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      for (const eventName of OPERATIONS_EVENTS) {
        socket.off(eventName, handleEvent)
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
