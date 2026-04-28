import { type Comanda, type Garcom, type Mesa, type MesaStatus } from '../../pdv-types'
import type { FilterStatus, SalaoView } from '../constants'
import { EquipeView } from './equipe-view'
import { SalaoBoardView } from './salao-view'

type SalaoContentProps = {
  allowMesaCatalogEditing: boolean
  allowRosterEditing: boolean
  allowStatusDragging: boolean
  assigningGarcomId: string | null
  comandas: Comanda[]
  filter: FilterStatus
  garcons: Garcom[]
  mesas: Mesa[]
  now: number
  onAddGarcom: (nome: string) => void
  onAddMesa: () => void
  onAssign: (mesaId: string, garcomId: string | undefined) => void
  onClickLivre: (mesa: Mesa) => void
  onClickOcupada: (comanda: Comanda) => void
  onRemoveGarcom: (id: string) => void
  onSelectGarcom: (id: string | null) => void
  onStatusChange: (mesaId: string, status: MesaStatus) => void
  resolveMesaComanda: (mesa: Mesa, comandaById: ReadonlyMap<string, Comanda>) => Comanda | undefined
  view: SalaoView
}

export function SalaoContent(props: Readonly<SalaoContentProps>) {
  if (props.view === 'salao') {
    return <SalaoBoardView {...props} />
  }

  return (
    <EquipeView
      allowRosterEditing={props.allowRosterEditing}
      assigningGarcomId={props.assigningGarcomId}
      comandas={props.comandas}
      garcons={props.garcons}
      mesas={props.mesas}
      now={props.now}
      resolveMesaComanda={props.resolveMesaComanda}
      onAddGarcom={props.onAddGarcom}
      onAssign={props.onAssign}
      onClickLivre={props.onClickLivre}
      onClickOcupada={props.onClickOcupada}
      onRemoveGarcom={props.onRemoveGarcom}
    />
  )
}
