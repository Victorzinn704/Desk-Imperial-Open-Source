'use client'

import { Droppable } from '@hello-pangea/dnd'
import { type Comanda, type Garcom, type Mesa, type MesaStatus } from '../../pdv-types'
import { MesaCard } from './mesa-card'

type SalaoStatusZoneProps = {
  allowStatusDragging: boolean
  assigningGarcomId: string | null
  background: string
  border: string
  color: string
  comandaById: ReadonlyMap<string, Comanda>
  garcons: Garcom[]
  label: string
  mesas: Mesa[]
  now: number
  onAssign: (mesaId: string, garcomId: string | undefined) => void
  onClickLivre: (mesa: Mesa) => void
  onClickOcupada: (comanda: Comanda) => void
  resolveMesaComanda: (mesa: Mesa, comandaById: ReadonlyMap<string, Comanda>) => Comanda | undefined
  status: MesaStatus
}

// eslint-disable-next-line max-lines-per-function
export function SalaoStatusZone({
  allowStatusDragging,
  assigningGarcomId,
  background,
  border,
  color,
  comandaById,
  garcons,
  label,
  mesas,
  now,
  onAssign,
  onClickLivre,
  onClickOcupada,
  resolveMesaComanda,
  status,
}: Readonly<SalaoStatusZoneProps>) {
  return (
    <div className="rounded-2xl border" style={{ borderColor: border, background }}>
      <div className="flex items-center gap-2 border-b px-4 py-3" style={{ borderColor: border }}>
        <span className="size-2 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
        <span className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color }}>
          {label}
        </span>
        <span
          className="ml-auto flex size-5 items-center justify-center rounded-full text-[10px] font-bold"
          style={{ background: `${color}20`, color }}
        >
          {mesas.length}
        </span>
      </div>
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex min-h-[200px] flex-col gap-2.5 p-3 transition-colors duration-150"
            style={{
              background: snapshot.isDraggingOver ? `${color}08` : 'transparent',
              outline: snapshot.isDraggingOver ? `1.5px dashed ${color}50` : '1.5px dashed transparent',
            }}
          >
            {mesas.length === 0 && !snapshot.isDraggingOver ? (
              <p className="pt-8 text-center text-xs text-[var(--text-muted)]">
                {status === 'ocupada' ? 'Arraste para abrir comanda' : 'Arraste para reservar por 2h'}
              </p>
            ) : null}
            {mesas.map((mesa, index) => (
              <MesaCard
                assigningGarcomId={assigningGarcomId}
                comanda={resolveMesaComanda(mesa, comandaById)}
                dragDisabled={!allowStatusDragging}
                garcons={garcons}
                index={index}
                key={mesa.id}
                mesa={mesa}
                now={now}
                view="salao"
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
