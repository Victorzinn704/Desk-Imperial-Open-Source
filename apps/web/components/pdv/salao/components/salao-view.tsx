'use client'

import { DragDropContext } from '@hello-pangea/dnd'
import { type Comanda, type Garcom, type Mesa, type MesaStatus } from '../../pdv-types'
import { type FilterStatus } from '../constants'
import { GarcomStrip } from './garcom-strip'
import { SalaoFreeZone } from './salao-free-zone'
import { SalaoStatusZonesGrid } from './salao-status-zones-grid'
import { useSalaoBoardData } from './use-salao-board-data'

// eslint-disable-next-line max-lines-per-function
export function SalaoBoardView({
  mesas,
  garcons,
  comandas,
  filter,
  now,
  assigningGarcomId,
  onStatusChange,
  onAssign,
  onClickLivre,
  onClickOcupada,
  onAddMesa,
  onSelectGarcom,
  allowMesaCatalogEditing,
  allowStatusDragging,
  resolveMesaComanda,
}: Readonly<{
  mesas: Mesa[]
  garcons: Garcom[]
  comandas: Comanda[]
  filter: FilterStatus
  now: number
  assigningGarcomId: string | null
  onStatusChange: (mesaId: string, status: MesaStatus) => void
  onAssign: (mesaId: string, garcomId: string | undefined) => void
  onClickLivre: (mesa: Mesa) => void
  onClickOcupada: (comanda: Comanda) => void
  onAddMesa: () => void
  onSelectGarcom: (id: string | null) => void
  allowMesaCatalogEditing: boolean
  allowStatusDragging: boolean
  resolveMesaComanda: (mesa: Mesa, comandaById: ReadonlyMap<string, Comanda>) => Comanda | undefined
}>) {
  const { comandaById, compactLivres, handleDragEnd, livreMesas, setCompactLivres, zones } = useSalaoBoardData({
    allowStatusDragging,
    comandas,
    filter,
    mesas,
    now,
    onStatusChange,
    resolveMesaComanda,
  })

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        <GarcomStrip assigningGarcomId={assigningGarcomId} garcons={garcons} onSelect={onSelectGarcom} />
        <SalaoFreeZone
          allowMesaCatalogEditing={allowMesaCatalogEditing}
          allowStatusDragging={allowStatusDragging}
          assigningGarcomId={assigningGarcomId}
          compactLivres={compactLivres}
          garcons={garcons}
          livreMesas={livreMesas}
          now={now}
          onAddMesa={onAddMesa}
          onAssign={onAssign}
          onClickLivre={onClickLivre}
          onClickOcupada={onClickOcupada}
          onToggleCompact={() => setCompactLivres((value) => !value)}
        />

        <SalaoStatusZonesGrid
          allowStatusDragging={allowStatusDragging}
          assigningGarcomId={assigningGarcomId}
          comandaById={comandaById}
          garcons={garcons}
          now={now}
          resolveMesaComanda={resolveMesaComanda}
          zones={zones}
          onAssign={onAssign}
          onClickLivre={onClickLivre}
          onClickOcupada={onClickOcupada}
        />
      </div>
    </DragDropContext>
  )
}
