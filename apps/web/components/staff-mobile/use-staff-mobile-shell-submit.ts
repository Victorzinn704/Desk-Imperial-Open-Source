'use client'

import { useCallback } from 'react'
import { type QueryClient } from '@tanstack/react-query'
import type { ComandaItem } from '@/components/pdv/pdv-types'
import type { useOfflineQueue } from '@/components/shared/use-offline-queue'
import type { useStaffMobileShellMutations } from './use-staff-mobile-shell-mutations'
import {
  enqueueOfflineItems,
  isNetworkError,
  submitAddItems,
  submitEditComanda,
  submitNewComanda,
} from './staff-mobile-shell-submit.helpers'
import type { PendingAction, StaffMobileTab } from './staff-mobile-shell-types'

interface SubmitHandlerArgs {
  enqueue: ReturnType<typeof useOfflineQueue>['enqueue']
  mutations: ReturnType<typeof useStaffMobileShellMutations>
  pendingAction: PendingAction | null
  queryClient: QueryClient
  setActiveTab: (tab: StaffMobileTab) => void
  setFocusedComandaId: (id: string | null) => void
  setPendingAction: (action: PendingAction | null) => void
  setScreenError: (message: string | null) => void
}

export function useSubmitHandler(args: SubmitHandlerArgs) {
  return useCallback(
    async (items: ComandaItem[]) => {
      if (!args.pendingAction) {
        return
      }

      args.setScreenError(null)

      try {
        if (args.pendingAction.type === 'edit') {
          const response = await submitEditComanda(
            args.pendingAction,
            items,
            args.mutations.replaceComandaMutation.mutateAsync,
          )
          args.setPendingAction(null)
          args.setFocusedComandaId(response.comanda.id)
          args.setActiveTab('pedidos')
          return
        }

        if (args.pendingAction.type === 'add') {
          const response = await submitAddItems(
            args.pendingAction.comandaId,
            items,
            args.mutations.addComandaItemsMutation.mutateAsync,
          )
          args.setPendingAction(null)
          args.setFocusedComandaId(response.comanda.id)
          args.setActiveTab('pedidos')
          return
        }

        await submitNewComanda({
          items,
          mesa: args.pendingAction.mesa,
          mutateAsync: args.mutations.openComandaMutation.mutateAsync,
          queryClient: args.queryClient,
        })
        args.setPendingAction(null)
        args.setActiveTab('pedidos')
      } catch (error) {
        if (isNetworkError(error) && args.pendingAction.type !== 'edit') {
          await enqueueOfflineItems(args.pendingAction, items, args.enqueue, args.setPendingAction, args.setActiveTab)
          return
        }

        args.setScreenError(error instanceof Error ? error.message : 'Não foi possível processar o pedido.')
      }
    },
    [args],
  )
}
