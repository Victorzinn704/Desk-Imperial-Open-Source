'use client'

import { type Comanda, type Garcom, type Mesa, type MesaStatus } from './pdv-types'
import { resolveMesaComanda, SalaoContent, SalaoInstructions, SalaoToolbar } from './salao'
import { useSalaoUnificadoController } from './salao/use-salao-unificado-controller'

type Props = {
  mesas: Mesa[]
  garcons: Garcom[]
  comandas: Comanda[]
  onStatusChange: (mesaId: string, status: MesaStatus) => void
  onAssignGarcom: (mesaId: string, garcomId: string | undefined) => void
  onAddGarcom: (nome: string) => void
  onRemoveGarcom: (id: string) => void
  onAddMesa: () => void
  onClickLivre: (mesa: Mesa) => void
  onClickOcupada: (comanda: Comanda) => void
  allowMesaCatalogEditing?: boolean
  allowRosterEditing?: boolean
  allowStatusDragging?: boolean
}

// The remaining body here is prop wiring for the salao shell after extraction to dedicated panels/hooks.
// eslint-disable-next-line max-lines-per-function
export function SalaoUnificado({
  mesas,
  garcons,
  comandas,
  onStatusChange,
  onAssignGarcom,
  onAddGarcom,
  onRemoveGarcom,
  onAddMesa,
  onClickLivre,
  onClickOcupada,
  allowMesaCatalogEditing = true,
  allowRosterEditing = true,
  allowStatusDragging = true,
}: Readonly<Props>) {
  const { assigningGarcomId, filter, handleAssign, now, setAssigning, setFilter, setView, stats, view } =
    useSalaoUnificadoController({ comandas, mesas, onAssignGarcom })

  return (
    <div className="space-y-4">
      <style>{`
        @keyframes salao-border-pulse {
          0%, 100% { border-color: rgba(248,113,113,0.4); box-shadow: 0 0 8px rgba(248,113,113,0.12); }
          50%       { border-color: rgba(248,113,113,0.85); box-shadow: 0 0 20px rgba(248,113,113,0.25); }
        }
      `}</style>

      <SalaoToolbar
        comAtencao={stats.comAtencao}
        filter={filter}
        livres={stats.livres}
        mesasCount={mesas.length}
        ocupadas={stats.ocupadas}
        semGarcom={stats.semGarcom}
        setFilter={setFilter}
        setView={setView}
        totalAberto={stats.totalAberto}
        view={view}
      />

      {view === 'salao' ? <SalaoInstructions allowStatusDragging={allowStatusDragging} /> : null}

      <SalaoContent
        allowMesaCatalogEditing={allowMesaCatalogEditing}
        allowRosterEditing={allowRosterEditing}
        allowStatusDragging={allowStatusDragging}
        assigningGarcomId={assigningGarcomId}
        comandas={comandas}
        filter={filter}
        garcons={garcons}
        mesas={mesas}
        now={now}
        resolveMesaComanda={resolveMesaComanda}
        view={view}
        onAddGarcom={onAddGarcom}
        onAddMesa={onAddMesa}
        onAssign={handleAssign}
        onClickLivre={onClickLivre}
        onClickOcupada={onClickOcupada}
        onRemoveGarcom={onRemoveGarcom}
        onSelectGarcom={setAssigning}
        onStatusChange={onStatusChange}
      />
    </div>
  )
}
