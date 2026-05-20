'use client'

import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query'
import { openComanda, replaceComanda, type ReplaceComandaPayload } from '@/lib/api'
import { scheduleOperationsWorkspaceReconcile } from '@/lib/operations'
import { buildOpenComandaPayload } from './pdv-board.helpers'
import { appendOptimisticOpenComanda, reconcileLiveComanda, rollbackLiveSnapshots } from './pdv-optimistic-comanda'
import type { SaveComandaPayload } from './comanda-modal'
import { toPdvComanda } from './pdv-operations'
import type { Comanda, Mesa } from './pdv-types'
import type { ComandaRecord } from '@contracts/contracts'

const OPERATIONS_LIVE_QUERY_PREFIX = ['operations', 'live'] as const
const PDV_HOT_PATH_RECONCILE_DELAY_MS = 120
const PDV_COMMERCIAL_RECONCILE_DELAY_MS = 900

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
    onMutate: (payload) => appendOptimisticOpenComanda(queryClient, payload),
    onSuccess: (response, _payload, context) => {
      reconcileLiveComanda(queryClient, response.comanda, context?.optimisticId)
      schedulePdvHotPathReconcile(queryClient)
      schedulePdvCommercialReconcile(queryClient)
    },
    onError: (_error, _payload, context) => {
      rollbackLiveSnapshots(queryClient, context?.snapshots)
    },
  })
  const replaceComandaMutation = useMutation({
    mutationFn: ({ comandaId, payload }: { comandaId: string; payload: ReplaceComandaPayload }) =>
      replaceComanda(comandaId, payload, { includeSnapshot: false }),
    onSuccess: (response) => {
      reconcileLiveComanda(queryClient, response.comanda)
      schedulePdvHotPathReconcile(queryClient)
    },
  })

  return {
    isPending: openComandaMutation.isPending || replaceComandaMutation.isPending,
    persistComandaDraft: buildPersistComandaDraft({
      editingComanda,
      mesaPreSelected,
      mesas,
      onActionError,
      onNewComandaSaved,
      openComandaMutation,
      replaceComandaMutation,
    }),
  }
}

function buildPersistComandaDraft({
  editingComanda,
  mesaPreSelected,
  mesas,
  onActionError,
  onNewComandaSaved,
  openComandaMutation,
  replaceComandaMutation,
}: Readonly<{
  editingComanda: Comanda | null
  mesaPreSelected: Mesa | null
  mesas: Mesa[]
  onActionError: (message: string | null) => void
  onNewComandaSaved: () => void
  openComandaMutation: {
    mutateAsync: (payload: Parameters<typeof openComanda>[0]) => Promise<{ comanda: ComandaRecord }>
  }
  replaceComandaMutation: {
    mutateAsync: (input: { comandaId: string; payload: ReplaceComandaPayload }) => Promise<{ comanda: ComandaRecord }>
  }
}>) {
  return async (data: SaveComandaPayload) => {
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
  }
}

function schedulePdvHotPathReconcile(queryClient: QueryClient) {
  scheduleOperationsWorkspaceReconcile(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
    includeOrders: false,
    includeFinance: false,
    delayMs: PDV_HOT_PATH_RECONCILE_DELAY_MS,
  })
}

function schedulePdvCommercialReconcile(queryClient: QueryClient) {
  scheduleOperationsWorkspaceReconcile(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
    includeLive: false,
    includeKitchen: false,
    includeSummary: false,
    includeOrders: true,
    includeFinance: true,
    delayMs: PDV_COMMERCIAL_RECONCILE_DELAY_MS,
  })
}
