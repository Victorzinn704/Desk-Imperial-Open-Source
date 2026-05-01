'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { openComanda, replaceComanda, type ReplaceComandaPayload } from '@/lib/api'
import { appendOptimisticComanda, patchOptimisticComanda, scheduleOperationsWorkspaceReconcile } from '@/lib/operations'
import { buildOpenComandaPayload } from './pdv-board.helpers'
import type { SaveComandaPayload } from './comanda-modal'
import { toPdvComanda } from './pdv-operations'
import type { Comanda, Mesa } from './pdv-types'
import type { ComandaRecord, OperationsLiveResponse } from '@contracts/contracts'

const OPERATIONS_LIVE_QUERY_PREFIX = ['operations', 'live'] as const

export function usePdvBoardDraftMutations({
  editingComanda,
  mesaPreSelected,
  mesas,
  onActionError,
  onNewComandaSaved,
}: Readonly<{
  editingComanda: Comanda | null
  mesaPreSelected: Mesa | null
  mesas: Mesa[]
  onActionError: (message: string | null) => void
  onNewComandaSaved: () => void
}>) {
  const queryClient = useQueryClient()
  const openComandaMutation = useMutation({
    mutationFn: (payload: Parameters<typeof openComanda>[0]) => openComanda(payload, { includeSnapshot: false }),
    onSuccess: (response) => {
      upsertLiveComanda(queryClient, response.comanda)
      scheduleOperationsWorkspaceReconcile(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
        includeOrders: true,
        includeFinance: true,
        delayMs: 700,
      })
    },
  })
  const replaceComandaMutation = useMutation({
    mutationFn: ({ comandaId, payload }: { comandaId: string; payload: ReplaceComandaPayload }) =>
      replaceComanda(comandaId, payload, { includeSnapshot: false }),
    onSuccess: (response) => {
      upsertLiveComanda(queryClient, response.comanda)
      scheduleOperationsWorkspaceReconcile(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
        delayMs: 700,
      })
    },
  })

  return {
    isPending: openComandaMutation.isPending || replaceComandaMutation.isPending,
    persistComandaDraft: async (data: SaveComandaPayload) => {
      onActionError(null)
      const payload = buildOpenComandaPayload({
        data,
        editingComanda,
        mesaPreSelected,
        mesas,
      })

      try {
        if (editingComanda) {
          const response = await replaceComandaMutation.mutateAsync({ comandaId: editingComanda.id, payload })
          return toPdvComanda(response.comanda)
        }

        const response = await openComandaMutation.mutateAsync(payload)
        onNewComandaSaved()
        return toPdvComanda(response.comanda)
      } catch (error) {
        onActionError(error instanceof Error ? error.message : 'Nao foi possivel salvar a comanda agora.')
        throw error
      }
    },
  }
}

function upsertLiveComanda(queryClient: ReturnType<typeof useQueryClient>, comanda: ComandaRecord) {
  const liveQueries = queryClient.getQueriesData<OperationsLiveResponse>({
    queryKey: OPERATIONS_LIVE_QUERY_PREFIX,
  })

  for (const [queryKey, snapshot] of liveQueries) {
    if (!snapshot) {
      continue
    }

    const hasComanda =
      snapshot.unassigned.comandas.some((current) => current.id === comanda.id) ||
      snapshot.employees.some((employee) => employee.comandas.some((current) => current.id === comanda.id))

    if (hasComanda) {
      patchOptimisticComanda(queryClient, queryKey, comanda.id, () => comanda)
      continue
    }

    appendOptimisticComanda(queryClient, queryKey, comanda)
  }
}
