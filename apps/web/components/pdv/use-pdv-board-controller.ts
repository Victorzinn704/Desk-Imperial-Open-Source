'use client'

import { useState } from 'react'
import type { DropResult } from '@hello-pangea/dnd'
import type { OperationsLiveResponse } from '@contracts/contracts'
import type { PdvMesaIntent } from './pdv-navigation-intent'
import { type Comanda, isEndedComandaStatus, type Mesa } from './pdv-types'
import { usePdvBoardIntent } from './use-pdv-board-intent'
import { usePdvBoardMutations } from './use-pdv-board-mutations'
import { usePdvBoardRuntime } from './use-pdv-board-runtime'

type UsePdvBoardControllerArgs = Readonly<{
  mesaIntent?: PdvMesaIntent | null
  onConsumeMesaIntent?: () => void
  operations?: OperationsLiveResponse
  variant?: 'grid' | 'comandas' | 'cobranca'
}>

// eslint-disable-next-line max-lines-per-function
export function usePdvBoardController({
  mesaIntent = null,
  onConsumeMesaIntent,
  operations,
  variant = 'grid',
}: UsePdvBoardControllerArgs) {
  const [showNewModal, setShowNewModal] = useState(false)
  const [previewComandaId, setPreviewComandaId] = useState<string | null>(null)
  const [editingComandaId, setEditingComandaId] = useState<string | null>(null)
  const [mesaPreSelected, setMesaPreSelected] = useState<Mesa | null>(null)
  const [mesaPreSelectedLabel, setMesaPreSelectedLabel] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const runtime = usePdvBoardRuntime(operations, variant)
  const editingComanda = (editingComandaId ? runtime.comandasById.get(editingComandaId) : null) ?? null
  const previewComanda = (previewComandaId ? runtime.comandasById.get(previewComandaId) : null) ?? null

  usePdvBoardIntent({
    comandasById: runtime.comandasById,
    mesaIntent,
    mesas: runtime.mesas,
    mesasById: runtime.mesasById,
    onConsumeMesaIntent,
    operationsSnapshot: runtime.operationsSnapshot,
    setEditingComandaId,
    setPreviewComandaId,
    setMesaPreSelected,
    setMesaPreSelectedLabel,
    setShowNewModal,
  })

  const mutations = usePdvBoardMutations({
    editingComanda,
    mesaPreSelected,
    mesas: runtime.mesas,
    onActionError: setActionError,
    onNewComandaSaved: () => {
      setShowNewModal(false)
      setMesaPreSelected(null)
      setMesaPreSelectedLabel(null)
    },
  })

  return {
    actionError,
    comandasByStatus: runtime.comandasByStatus,
    editingComanda,
    previewComanda,
    previewComandaId,
    handleDragEnd: (result: DropResult) => handleDragEnd(result, runtime.comandasById, mutations.transitionComanda),
    handleStatusChange: (comanda: Comanda, status: Comanda['status']) =>
      isEndedComandaStatus(comanda.status) ? Promise.resolve() : mutations.transitionComanda(comanda, status),
    isNewModalOpen: showNewModal,
    mesaPreSelectedLabel,
    mutationBusy: mutations.mutationBusy,
    openNewModal: (mesa?: Mesa | null, label?: string | null) => {
      setPreviewComandaId(null)
      setEditingComandaId(null)
      setMesaPreSelected(mesa ?? null)
      setMesaPreSelectedLabel(label ?? mesa?.numero ?? null)
      setShowNewModal(true)
    },
    closeNewModal: () => {
      setShowNewModal(false)
      setMesaPreSelected(null)
      setMesaPreSelectedLabel(null)
    },
    closePreviewModal: () => setPreviewComandaId(null),
    closeEditingModal: () => setEditingComandaId(null),
    openPreviewModal: (comandaId: string) => {
      setShowNewModal(false)
      setMesaPreSelected(null)
      setMesaPreSelectedLabel(null)
      setEditingComandaId(null)
      setPreviewComandaId(comandaId)
    },
    openEditingModal: (comandaId: string) => {
      setShowNewModal(false)
      setPreviewComandaId(null)
      setMesaPreSelected(null)
      setMesaPreSelectedLabel(null)
      setEditingComandaId(comandaId)
    },
    persistComandaDraft: mutations.persistComandaDraft,
    sectionCopy: runtime.sectionCopy,
  }
}

async function handleDragEnd(
  result: DropResult,
  comandasById: ReadonlyMap<string, Comanda>,
  transitionComanda: (comanda: Comanda, status: Comanda['status']) => Promise<void>,
) {
  const { source, destination, draggableId } = result
  if (!destination || source.droppableId === destination.droppableId) {
    return
  }

  const comanda = comandasById.get(draggableId)
  if (!comanda) {
    return
  }

  await transitionComanda(comanda, destination.droppableId as Comanda['status'])
}
