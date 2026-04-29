'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { openComanda, replaceComanda, type ReplaceComandaPayload } from '@/lib/api'
import { invalidateOperationsWorkspace } from '@/lib/operations'
import { buildOpenComandaPayload } from './pdv-board.helpers'
import type { SaveComandaPayload } from './comanda-modal'
import { toPdvComanda } from './pdv-operations'
import type { Comanda, Mesa } from './pdv-types'

const OPERATIONS_LIVE_QUERY_KEY = ['operations', 'live'] as const

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
    onSuccess: () => invalidateOperationsWorkspace(queryClient, OPERATIONS_LIVE_QUERY_KEY),
  })
  const replaceComandaMutation = useMutation({
    mutationFn: ({ comandaId, payload }: { comandaId: string; payload: ReplaceComandaPayload }) =>
      replaceComanda(comandaId, payload, { includeSnapshot: false }),
    onSuccess: () => invalidateOperationsWorkspace(queryClient, OPERATIONS_LIVE_QUERY_KEY),
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
