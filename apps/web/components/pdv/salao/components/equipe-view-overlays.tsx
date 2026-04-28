import { AddGarcomModal } from './equipe-view-add-garcom-modal'
import { EquipeEmptyState } from './equipe-view-empty-state'

type EquipeViewOverlaysProps = {
  allowRosterEditing: boolean
  garconsCount: number
  newNome: string
  onChangeNome: (value: string) => void
  onCloseAdd: () => void
  onConfirmAdd: () => void
  onOpenAdd: () => void
  semGarcomCount: number
  showAdd: boolean
}

export function EquipeViewOverlays({
  allowRosterEditing,
  garconsCount,
  newNome,
  onChangeNome,
  onCloseAdd,
  onConfirmAdd,
  onOpenAdd,
  semGarcomCount,
  showAdd,
}: Readonly<EquipeViewOverlaysProps>) {
  return (
    <>
      <EquipeEmptyState
        allowRosterEditing={allowRosterEditing}
        garconsCount={garconsCount}
        semGarcomCount={semGarcomCount}
        onOpenAdd={onOpenAdd}
      />
      {showAdd && allowRosterEditing ? (
        <AddGarcomModal newNome={newNome} onChangeNome={onChangeNome} onClose={onCloseAdd} onConfirm={onConfirmAdd} />
      ) : null}
    </>
  )
}
