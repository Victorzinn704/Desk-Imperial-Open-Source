'use client'

import { Plus } from 'lucide-react'
import { type Comanda, type Garcom, type Mesa } from '../../pdv-types'
import { GarcomColumn, SemGarcomColumn } from './equipe-view-column'

type EquipeColumnsProps = {
  allowRosterEditing: boolean
  assigningGarcomId: string | null
  comandaById: ReadonlyMap<string, Comanda>
  garcons: Garcom[]
  mesas: Mesa[]
  now: number
  onAssign: (mesaId: string, garcomId: string | undefined) => void
  onClickLivre: (mesa: Mesa) => void
  onClickOcupada: (comanda: Comanda) => void
  onOpenAdd: () => void
  onRemoveGarcom: (id: string) => void
  resolveMesaComanda: (mesa: Mesa, comandaById: ReadonlyMap<string, Comanda>) => Comanda | undefined
  semGarcom: Mesa[]
}

export function EquipeColumns({
  allowRosterEditing,
  assigningGarcomId,
  comandaById,
  garcons,
  mesas,
  now,
  onAssign,
  onClickLivre,
  onClickOcupada,
  onOpenAdd,
  onRemoveGarcom,
  resolveMesaComanda,
  semGarcom,
}: Readonly<EquipeColumnsProps>) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      <SemGarcomColumn
        assigningGarcomId={assigningGarcomId}
        comandaById={comandaById}
        garcons={garcons}
        mesas={semGarcom}
        now={now}
        resolveMesaComanda={resolveMesaComanda}
        onAssign={onAssign}
        onClickLivre={onClickLivre}
        onClickOcupada={onClickOcupada}
      />

      {garcons.map((garcom) => (
        <GarcomColumn
          allowRosterEditing={allowRosterEditing}
          assigningGarcomId={assigningGarcomId}
          comandaById={comandaById}
          garcom={garcom}
          garcons={garcons}
          key={garcom.id}
          mesas={mesas.filter((mesa) => mesa.garcomId === garcom.id && mesa.status !== 'livre')}
          now={now}
          resolveMesaComanda={resolveMesaComanda}
          onAssign={onAssign}
          onClickLivre={onClickLivre}
          onClickOcupada={onClickOcupada}
          onRemoveGarcom={onRemoveGarcom}
        />
      ))}

      {allowRosterEditing ? <EquipeAddColumnButton onOpenAdd={onOpenAdd} /> : null}
    </div>
  )
}

function EquipeAddColumnButton({ onOpenAdd }: Readonly<{ onOpenAdd: () => void }>) {
  return (
    <button
      className="flex w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-dashed border-[var(--border)] text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-soft)]"
      title="Adicionar garçom"
      type="button"
      onClick={onOpenAdd}
    >
      <Plus className="size-5" />
    </button>
  )
}
