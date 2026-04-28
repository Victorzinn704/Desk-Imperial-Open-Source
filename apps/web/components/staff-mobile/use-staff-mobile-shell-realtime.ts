'use client'

import { useCallback, useEffect } from 'react'
import { type QueryClient, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useOperationsRealtime } from '@/components/operations/use-operations-realtime'
import { haptic } from '@/components/shared/haptic'
import { usePullToRefresh } from '@/components/shared/use-pull-to-refresh'
import type { AddComandaItemPayload, OpenComandaPayload } from '@/lib/api'
import { OPERATIONS_KITCHEN_QUERY_KEY, OPERATIONS_LIVE_COMPACT_QUERY_KEY } from '@/lib/operations'
import type { useStaffMobileShellMutations } from './use-staff-mobile-shell-mutations'

function useHandlePullRefresh(queryClient: QueryClient) {
  return useCallback(async () => {
    haptic.light()
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: OPERATIONS_LIVE_COMPACT_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: OPERATIONS_KITCHEN_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: ['staff-orders-history'] }),
    ])
  }, [queryClient])
}

export function useRealtimeRefresh(enabled: boolean) {
  const queryClient = useQueryClient()
  const { status: realtimeStatus } = useOperationsRealtime(enabled, queryClient)
  const handlePullRefresh = useHandlePullRefresh(queryClient)

  return {
    isOffline: realtimeStatus === 'disconnected',
    realtimeStatus,
    ...usePullToRefresh({ onRefresh: handlePullRefresh }),
  }
}

interface OfflineDrainArgs {
  addComandaItemMutation: ReturnType<typeof useStaffMobileShellMutations>['addComandaItemMutation']
  drainQueue: (
    handler: (action: { type: string; payload: unknown }) => Promise<void>,
  ) => Promise<{ expiredCount: number }>
  openComandaMutation: ReturnType<typeof useStaffMobileShellMutations>['openComandaMutation']
  realtimeStatus: ReturnType<typeof useRealtimeRefresh>['realtimeStatus']
}

export function useOfflineDrain(args: OfflineDrainArgs) {
  const runDrain = useCallback(() => {
    return args
      .drainQueue(async (action) => {
        if (action.type === 'add-item') {
          const { comandaId, payload } = action.payload as {
            comandaId: string
            payload: AddComandaItemPayload
          }
          await args.addComandaItemMutation.mutateAsync({ comandaId, payload })
          return
        }

        if (action.type === 'open-comanda') {
          await args.openComandaMutation.mutateAsync(action.payload as OpenComandaPayload)
        }
      })
      .then((result) => {
        if (result.expiredCount > 0) {
          const message =
            result.expiredCount === 1
              ? '1 ação offline expirou após 10 minutos sem conexão e foi descartada.'
              : `${result.expiredCount} ações offline expiraram após 10 minutos sem conexão e foram descartadas.`
          toast.error(message)
        }

        return result
      })
  }, [args])

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'DRAIN_QUEUE') {
        void runDrain()
      }
    }

    navigator.serviceWorker.addEventListener('message', handler)
    return () => navigator.serviceWorker.removeEventListener('message', handler)
  }, [runDrain])

  useEffect(() => {
    if (args.realtimeStatus !== 'connected') {
      return
    }

    void runDrain()
  }, [args.realtimeStatus, runDrain])
}
