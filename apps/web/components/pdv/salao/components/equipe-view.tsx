'use client'

import { type Comanda, type Garcom, type Mesa } from '../../pdv-types'
import { EquipeColumns } from './equipe-view-columns'
import { EquipeViewOverlays } from './equipe-view-overlays'
import { EquipeViewSummary } from './equipe-view-summary'
import { useEquipeViewState } from './use-equipe-view-state'

// eslint-disable-next-line max-lines-per-function
export function EquipeView({
  mesas,
  garcons,
  comandas,
  now,
  assigningGarcomId,
  onAssign,
  onAddGarcom,
  onRemoveGarcom,
  onClickLivre,
  onClickOcupada,
  allowRosterEditing,
  resolveMesaComanda,
}: Readonly<{
  mesas: Mesa[]
  garcons: Garcom[]
  comandas: Comanda[]
  now: number
  assigningGarcomId: string | null
  onAssign: (mesaId: string, garcomId: string | undefined) => void
  onAddGarcom: (nome: string) => void
  onRemoveGarcom: (id: string) => void
  onClickLivre: (mesa: Mesa) => void
  onClickOcupada: (comanda: Comanda) => void
  allowRosterEditing: boolean
  resolveMesaComanda: (mesa: Mesa, comandaById: ReadonlyMap<string, Comanda>) => Comanda | undefined
}>) {
  const { closeAdd, comandaById, confirmAdd, newNome, openAdd, semGarcom, setNewNome, showAdd } = useEquipeViewState({
    comandas,
    mesas,
    onAddGarcom,
  })

  return (
    <div className="space-y-4">
      <EquipeViewSummary
        allowRosterEditing={allowRosterEditing}
        garconsCount={garcons.length}
        semGarcomCount={semGarcom.length}
        onOpenAdd={openAdd}
      />

      <EquipeColumns
        allowRosterEditing={allowRosterEditing}
        assigningGarcomId={assigningGarcomId}
        comandaById={comandaById}
        garcons={garcons}
        mesas={mesas}
        now={now}
        resolveMesaComanda={resolveMesaComanda}
        semGarcom={semGarcom}
        onAssign={onAssign}
        onClickLivre={onClickLivre}
        onClickOcupada={onClickOcupada}
        onOpenAdd={openAdd}
        onRemoveGarcom={onRemoveGarcom}
      />

      <EquipeViewOverlays
        allowRosterEditing={allowRosterEditing}
        garconsCount={garcons.length}
        newNome={newNome}
        semGarcomCount={semGarcom.length}
        showAdd={showAdd}
        onChangeNome={setNewNome}
        onCloseAdd={closeAdd}
        onConfirmAdd={confirmAdd}
        onOpenAdd={openAdd}
      />
    </div>
  )
}
