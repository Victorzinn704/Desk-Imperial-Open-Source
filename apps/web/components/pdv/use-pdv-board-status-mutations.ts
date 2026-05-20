'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cancelComanda, closeComanda, updateComandaStatus } from '@/lib/api'
import {
  rollbackOperationsSnapshot,
  scheduleOperationsWorkspaceReconcile,
  setOptimisticComandaStatus,
} from '@/lib/operations'
import { buildOpenComandaPayload } from './pdv-board.helpers'
import { normalizeTableLabel } from './normalize-table-label'
import { toOperationsStatus } from './pdv-operations'
import type { Comanda, ComandaStatus, Mesa } from './pdv-types'

const OPERATIONS_LIVE_QUERY_KEY = ['operations', 'live'] as const

// eslint-disable-next-line max-lines-per-function
export function usePdvBoardStatusMutations({
  mesaPreSelected,
  mesas,
  onActionError,
}: Readonly<{
  mesaPreSelected: Mesa | null
  mesas: Mesa[]
  onActionError: (message: string | null) => void
}>) {
  const queryClient = useQueryClient()
  const updateComandaStatusMutation = useMutation({
    mutationFn: ({ comandaId, status }: { comandaId: string; status: 'OPEN' | 'IN_PREPARATION' | 'READY' }) =>
      updateComandaStatus(comandaId, status, { includeSnapshot: false }),
    onMutate: async ({ comandaId, status }) => {
      await queryClient.cancelQueries({ queryKey: OPERATIONS_LIVE_QUERY_KEY })
      const snapshot = setOptimisticComandaStatus(queryClient, OPERATIONS_LIVE_QUERY_KEY, comandaId, status)
      return { snapshot }
    },
    onError: (_error, _vars, context) =>
      rollbackOperationsSnapshot(queryClient, OPERATIONS_LIVE_QUERY_KEY, context?.snapshot),
    onSuccess: () =>
      scheduleOperationsWorkspaceReconcile(queryClient, OPERATIONS_LIVE_QUERY_KEY, {
        delayMs: 700,
      }),
  })
  const closeComandaMutation = useMutation({
    mutationFn: ({
      comandaId,
      payload,
    }: {
      comandaId: string
      payload: { discountAmount: number; serviceFeeAmount: number }
    }) => closeComanda(comandaId, payload, { includeSnapshot: false }),
    onMutate: async ({ comandaId }) => {
      await queryClient.cancelQueries({ queryKey: OPERATIONS_LIVE_QUERY_KEY })
      const snapshot = setOptimisticComandaStatus(queryClient, OPERATIONS_LIVE_QUERY_KEY, comandaId, 'CLOSED')
      return { snapshot }
    },
    onError: (_error, _vars, context) =>
      rollbackOperationsSnapshot(queryClient, OPERATIONS_LIVE_QUERY_KEY, context?.snapshot),
    onSuccess: () =>
      scheduleOperationsWorkspaceReconcile(queryClient, OPERATIONS_LIVE_QUERY_KEY, {
        includeOrders: true,
        includeFinance: true,
        delayMs: 700,
      }),
  })
  const cancelComandaMutation = useMutation({
    mutationFn: (comandaId: string) => cancelComanda(comandaId, { includeSnapshot: false }),
    onMutate: async (comandaId) => {
      await queryClient.cancelQueries({ queryKey: OPERATIONS_LIVE_QUERY_KEY })
      const snapshot = setOptimisticComandaStatus(queryClient, OPERATIONS_LIVE_QUERY_KEY, comandaId, 'CANCELLED')
      return { snapshot }
    },
    onError: (_error, _vars, context) =>
      rollbackOperationsSnapshot(queryClient, OPERATIONS_LIVE_QUERY_KEY, context?.snapshot),
    onSuccess: () =>
      scheduleOperationsWorkspaceReconcile(queryClient, OPERATIONS_LIVE_QUERY_KEY, {
        includeKitchen: true,
        includeSummary: true,
        delayMs: 700,
      }),
  })

  return {
    isPending:
      updateComandaStatusMutation.isPending || closeComandaMutation.isPending || cancelComandaMutation.isPending,
    transitionComanda: async (comanda: Comanda, status: ComandaStatus) => {
      onActionError(null)

      try {
        if (comanda.status === status) {
          return
        }
        if (status === 'fechada') {
          const payload = buildOpenComandaPayload({
            data: {
              mesa: normalizeTableLabel(comanda.mesa ?? ''),
              clienteNome: comanda.clienteNome ?? '',
              clienteDocumento: comanda.clienteDocumento ?? '',
              notes: comanda.notes ?? '',
              itens: comanda.itens,
              desconto: comanda.desconto,
              acrescimo: comanda.acrescimo,
            },
            editingComanda: comanda,
            mesaPreSelected,
            mesas,
          })
          await closeComandaMutation.mutateAsync({
            comandaId: comanda.id,
            payload: {
              discountAmount: payload.discountAmount ?? 0,
              serviceFeeAmount: payload.serviceFeeAmount ?? 0,
            },
          })
          return
        }

        if (status === 'cancelada') {
          await cancelComandaMutation.mutateAsync(comanda.id)
          return
        }

        await updateComandaStatusMutation.mutateAsync({
          comandaId: comanda.id,
          status: toOperationsStatus(status),
        })
      } catch (error) {
        onActionError(error instanceof Error ? error.message : 'Nao foi possivel atualizar a comanda.')
        throw error
      }
    },
  }
}
