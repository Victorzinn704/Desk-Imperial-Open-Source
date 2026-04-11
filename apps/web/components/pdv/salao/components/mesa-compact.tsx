'use client'

import { memo, useState } from 'react'
import { Draggable } from '@hello-pangea/dnd'
import { UserPlus } from 'lucide-react'
import type { Garcom, Mesa } from '../../pdv-types'
import { GarcomAvatar } from './garcom-avatar'
import { GarcomSelector } from './garcom-selector'

export interface MesaCompactProps {
  mesa: Mesa
  garcons: Garcom[]
  index: number
  onAssign: (mesaId: string, garcomId: string | undefined) => void
  onClickLivre: (m: Mesa) => void
  dragDisabled?: boolean
}

export const MesaCompact = memo(
  function MesaCompact({ mesa, garcons, index, onAssign, onClickLivre, dragDisabled = false }: MesaCompactProps) {
    const [showGarcomSel, setShowGarcomSel] = useState(false)
    const garcom = garcons.find((g) => g.id === mesa.garcomId)

    return (
      <Draggable draggableId={mesa.id} index={index} isDragDisabled={dragDisabled}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={{ ...provided.draggableProps.style, opacity: snapshot.isDragging ? 0.8 : 1 }}
          >
            <div
              className="relative flex cursor-pointer select-none flex-col items-center justify-center gap-1 rounded-[12px] border border-[rgba(54,245,124,0.22)] bg-[rgba(54,245,124,0.05)] p-2 transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(54,245,124,0.45)] hover:bg-[rgba(54,245,124,0.09)]"
              style={{ width: 72, height: 80 }}
            >
              <button
                aria-label={`Abrir mesa ${mesa.numero}`}
                className="absolute inset-0 rounded-[12px] border-0 bg-transparent p-0"
                type="button"
                onClick={() => {
                  if (!showGarcomSel) {onClickLivre(mesa)}
                }}
              />

              <div className="pointer-events-none relative z-10 flex flex-col items-center gap-1">
                <p className="text-xl font-bold leading-none text-[var(--text-primary)]">{mesa.numero}</p>
                <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#36f57c]">Livre</span>
              </div>
              {garcom ? (
                <div className="relative z-20">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowGarcomSel((v) => !v)
                    }}
                  >
                    <GarcomAvatar garcom={garcom} size={16} />
                  </button>
                  {showGarcomSel && (
                    <GarcomSelector
                      garcons={garcons}
                      mesa={mesa}
                      onAssign={(gid) => onAssign(mesa.id, gid)}
                      onClose={() => setShowGarcomSel(false)}
                    />
                  )}
                </div>
              ) : (
                <div className="pointer-events-none relative z-10 flex size-4 items-center justify-center rounded-full border border-dashed border-[rgba(255,255,255,0.15)]">
                  <UserPlus className="size-2 text-[var(--text-muted)]" />
                </div>
              )}
            </div>
          </div>
        )}
      </Draggable>
    )
  },
  (prev, next) => {
    return (
      prev.mesa.id === next.mesa.id &&
      prev.mesa.garcomId === next.mesa.garcomId &&
      prev.dragDisabled === next.dragDisabled
    )
  },
)
