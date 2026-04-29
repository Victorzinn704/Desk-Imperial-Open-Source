'use client'

import type { SaveComandaPayload } from './comanda-modal'
import { type Comanda, type ComandaStatus, type Mesa } from './pdv-types'
import { usePdvBoardDraftMutations } from './use-pdv-board-draft-mutations'
import { usePdvBoardStatusMutations } from './use-pdv-board-status-mutations'

export function usePdvBoardMutations({
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
  const draft = usePdvBoardDraftMutations({
    editingComanda,
    mesaPreSelected,
    mesas,
    onActionError,
    onNewComandaSaved,
  })
  const status = usePdvBoardStatusMutations({
    mesaPreSelected,
    mesas,
    onActionError,
  })

  return {
    mutationBusy: draft.isPending || status.isPending,
    persistComandaDraft: (data: SaveComandaPayload) => draft.persistComandaDraft(data),
    transitionComanda: (comanda: Comanda, nextStatus: ComandaStatus) => status.transitionComanda(comanda, nextStatus),
  }
}
