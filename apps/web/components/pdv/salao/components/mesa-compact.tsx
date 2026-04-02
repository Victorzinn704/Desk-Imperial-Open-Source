'use client'

import { memo, useState } from 'react'
import { Draggable } from '@hello-pangea/dnd'
import { UserPlus } from 'lucide-react'
import type { Mesa, Garcom } from '../../pdv-types'
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
              onClick={() => {
                if (!showGarcomSel) onClickLivre(mesa)
              }}
              className="relative flex cursor-pointer select-none flex-col items-center justify-center gap-1 rounded-[12px] border border-[rgba(54,245,124,0.22)] bg-[rgba(54,245,124,0.05)] p-2 transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(54,245,124,0.45)] hover:bg-[rgba(54,245,124,0.09)]"
              style={{ width: 72, height: 80 }}
            >
              <p className="text-xl font-bold leading-none text-white">{mesa.numero}</p>
              <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#36f57c]">Livre</span>
              {garcom ? (
                <div className="relative">
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
                      mesa={mesa}
                      garcons={garcons}
                      onAssign={(gid) => onAssign(mesa.id, gid)}
                      onClose={() => setShowGarcomSel(false)}
                    />
                  )}
                </div>
              ) : (
                <div className="flex size-4 items-center justify-center rounded-full border border-dashed border-[rgba(255,255,255,0.15)]">
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
