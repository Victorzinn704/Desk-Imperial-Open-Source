'use client'

import { Droppable } from '@hello-pangea/dnd'
import { Maximize2, Minimize2, Plus } from 'lucide-react'
import { type Comanda, type Garcom, type Mesa } from '../../pdv-types'
import { MesaCard } from './mesa-card'
import { MesaCompact } from './mesa-compact'

type SalaoFreeZoneProps = {
  allowMesaCatalogEditing: boolean
  allowStatusDragging: boolean
  assigningGarcomId: string | null
  compactLivres: boolean
  garcons: Garcom[]
  livreMesas: Mesa[]
  now: number
  onAddMesa: () => void
  onAssign: (mesaId: string, garcomId: string | undefined) => void
  onClickLivre: (mesa: Mesa) => void
  onClickOcupada: (comanda: Comanda) => void
  onToggleCompact: () => void
}

// eslint-disable-next-line max-lines-per-function
export function SalaoFreeZone({
  allowMesaCatalogEditing,
  allowStatusDragging,
  assigningGarcomId,
  compactLivres,
  garcons,
  livreMesas,
  now,
  onAddMesa,
  onAssign,
  onClickLivre,
  onClickOcupada,
  onToggleCompact,
}: Readonly<SalaoFreeZoneProps>) {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{ borderColor: 'rgba(54,245,124,0.22)', background: 'rgba(54,245,124,0.02)' }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-[#36f57c] shadow-[0_0_6px_#36f57c]" />
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#36f57c]">Livre</span>
          <span className="text-xs text-[var(--text-muted)]">— clique para comanda · arraste para reservar</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1 rounded-[8px] border border-[var(--border)] px-2 py-1 text-[10px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
            type="button"
            onClick={onToggleCompact}
          >
            {compactLivres ? <Maximize2 className="size-3" /> : <Minimize2 className="size-3" />}
            {compactLivres ? 'Expandir' : 'Compactar'}
          </button>
          {allowMesaCatalogEditing ? (
            <button
              className="flex items-center gap-1.5 rounded-[10px] border border-[rgba(54,245,124,0.3)] bg-[rgba(54,245,124,0.07)] px-3 py-1.5 text-xs font-semibold text-[#36f57c] transition-colors hover:bg-[rgba(54,245,124,0.13)]"
              type="button"
              onClick={onAddMesa}
            >
              <Plus className="size-3" /> Nova Mesa
            </button>
          ) : null}
        </div>
      </div>

      <Droppable direction="horizontal" droppableId="livre">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex min-h-[100px] flex-wrap gap-3 rounded-xl p-1 transition-colors duration-150"
            style={{
              background: snapshot.isDraggingOver ? 'rgba(54,245,124,0.05)' : 'transparent',
              outline: snapshot.isDraggingOver ? '1.5px dashed rgba(54,245,124,0.4)' : '1.5px dashed transparent',
            }}
          >
            {livreMesas.length === 0 && !snapshot.isDraggingOver ? (
              <p className="self-center pl-1 text-xs text-[var(--text-muted)]">
                Todas as mesas estão ocupadas ou reservadas
              </p>
            ) : null}
            {livreMesas.map((mesa, index) => (
              <SalaoFreeMesaCard
                assigningGarcomId={assigningGarcomId}
                compactLivres={compactLivres}
                dragDisabled={!allowStatusDragging}
                garcons={garcons}
                index={index}
                key={mesa.id}
                mesa={mesa}
                now={now}
                onAssign={onAssign}
                onClickLivre={onClickLivre}
                onClickOcupada={onClickOcupada}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  )
}

// eslint-disable-next-line max-lines-per-function
function SalaoFreeMesaCard({
  assigningGarcomId,
  compactLivres,
  dragDisabled,
  garcons,
  index,
  mesa,
  now,
  onAssign,
  onClickLivre,
  onClickOcupada,
}: Readonly<{
  assigningGarcomId: string | null
  compactLivres: boolean
  dragDisabled: boolean
  garcons: Garcom[]
  index: number
  mesa: Mesa
  now: number
  onAssign: (mesaId: string, garcomId: string | undefined) => void
  onClickLivre: (mesa: Mesa) => void
  onClickOcupada: (comanda: Comanda) => void
}>) {
  if (compactLivres) {
    return (
      <MesaCompact
        dragDisabled={dragDisabled}
        garcons={garcons}
        index={index}
        mesa={mesa}
        onAssign={onAssign}
        onClickLivre={onClickLivre}
      />
    )
  }

  return (
    <div style={{ width: 160 }}>
      <MesaCard
        assigningGarcomId={assigningGarcomId}
        comanda={undefined}
        dragDisabled={dragDisabled}
        garcons={garcons}
        index={index}
        mesa={mesa}
        now={now}
        view="salao"
        onAssign={onAssign}
        onClickLivre={onClickLivre}
        onClickOcupada={onClickOcupada}
      />
    </div>
  )
}
