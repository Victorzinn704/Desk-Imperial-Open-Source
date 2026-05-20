'use client'

import { useCallback, useMemo } from 'react'
import { DragDropContext, type DropResult } from '@hello-pangea/dnd'
import type { Comanda, Mesa, MesaStatus } from './pdv-types'
import { FreeMesaPool, KANBAN_COLUMNS, MesaStatusColumns } from './pdv-mesas-kanban.sections'

type Props = Readonly<{
  comandas: Comanda[]
  mesas: Mesa[]
  onAddMesa: () => void
  onClickLivre: (mesa: Mesa) => void
  onClickOcupada: (comanda: Comanda) => void
  onStatusChange: (mesaId: string, newStatus: MesaStatus) => void
}>

export function PdvMesasKanban({ mesas, comandas, onStatusChange, onClickLivre, onClickOcupada, onAddMesa }: Props) {
  const viewModel = useKanbanViewModel(mesas, comandas)
  const handleDragEnd = useKanbanDragEnd(viewModel.mesaById, onStatusChange)

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="space-y-5">
        <FreeMesaPool
          livres={viewModel.livres}
          onAddMesa={onAddMesa}
          onClickLivre={onClickLivre}
          onClickOcupada={onClickOcupada}
        />
        <MesaStatusColumns
          comandaById={viewModel.comandaById}
          mesasByStatus={viewModel.mesasByStatus}
          onClickLivre={onClickLivre}
          onClickOcupada={onClickOcupada}
        />
      </div>
    </DragDropContext>
  )
}

function useKanbanViewModel(mesas: Mesa[], comandas: Comanda[]) {
  const mesaById = useMemo(() => new Map(mesas.map((mesa) => [mesa.id, mesa])), [mesas])
  const comandaById = useMemo(() => new Map(comandas.map((comanda) => [comanda.id, comanda])), [comandas])
  const livres = useMemo(() => mesas.filter((mesa) => mesa.status === 'livre'), [mesas])
  const mesasByStatus = useMemo(() => buildMesasByStatus(mesas), [mesas])

  return {
    comandaById,
    livres,
    mesaById,
    mesasByStatus,
  }
}

function useKanbanDragEnd(
  mesaById: ReadonlyMap<string, Mesa>,
  onStatusChange: (mesaId: string, newStatus: MesaStatus) => void,
) {
  return useCallback(
    (result: DropResult) => {
      const targetStatus = resolveTargetStatus(result)
      if (!targetStatus) {
        return
      }

      const mesa = mesaById.get(result.draggableId)
      if (mesa && mesa.status !== targetStatus) {
        onStatusChange(result.draggableId, targetStatus)
      }
    },
    [mesaById, onStatusChange],
  )
}

function buildMesasByStatus(mesas: Mesa[]) {
  return KANBAN_COLUMNS.reduce(
    (acc, column) => {
      acc[column.id] = mesas.filter((mesa) => mesa.status === column.id)
      return acc
    },
    {} as Record<(typeof KANBAN_COLUMNS)[number]['id'], Mesa[]>,
  )
}

function resolveTargetStatus(result: DropResult): MesaStatus | null {
  return result.destination ? (result.destination.droppableId as MesaStatus) : null
}
