'use client'

import { ChevronDown, UserPlus } from 'lucide-react'
import type { Garcom, Mesa } from '../../pdv-types'
import { GarcomAvatar } from './garcom-avatar'
import { GarcomSelector } from './garcom-selector'

interface MesaCardWaiterRowProps {
  mesa: Mesa
  garcom?: Garcom
  garcons: Garcom[]
  isAssignTarget: boolean
  assigningGarcomId: string | null
  showGarcomSel: boolean
  onAssign: (mesaId: string, garcomId: string | undefined) => void
  onToggleSelector: () => void
  onRequestConfirm: () => void
}

// eslint-disable-next-line max-lines-per-function
export function MesaCardWaiterRow({
  mesa,
  garcom,
  garcons,
  isAssignTarget,
  assigningGarcomId,
  showGarcomSel,
  onAssign,
  onToggleSelector,
  onRequestConfirm,
}: MesaCardWaiterRowProps) {
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    runWaiterRowAction({
      assigningGarcomId,
      isAssignTarget,
      mesa,
      onAssign,
      onRequestConfirm,
      onToggleSelector,
    })
  }

  return (
    <div className="relative z-20 px-3 py-2">
      <button
        className="flex w-full items-center gap-1.5 rounded-[8px] px-1.5 py-1 text-left transition-colors hover:bg-[rgba(255,255,255,0.05)]"
        type="button"
        onClick={handleClick}
      >
        {garcom ? (
          <>
            <GarcomAvatar garcom={garcom} size={20} />
            <span className="flex-1 truncate text-[11px] font-medium text-[var(--text-primary)]">{garcom.nome}</span>
          </>
        ) : (
          <>
            <span className="flex size-5 items-center justify-center rounded-full border border-dashed border-[rgba(255,255,255,0.2)]">
              <UserPlus className="size-2.5 text-[var(--text-muted)]" />
            </span>
            <span className="text-[11px] italic text-[var(--text-muted)]">Sem garçom</span>
          </>
        )}
        {!isAssignTarget && <ChevronDown className="ml-auto size-3 shrink-0 text-[var(--text-muted)]" />}
      </button>
      {showGarcomSel && (
        <GarcomSelector
          garcons={garcons}
          mesa={mesa}
          onAssign={(garcomId) => onAssign(mesa.id, garcomId)}
          onClose={onToggleSelector}
        />
      )}
    </div>
  )
}

function runWaiterRowAction({
  assigningGarcomId,
  isAssignTarget,
  mesa,
  onAssign,
  onRequestConfirm,
  onToggleSelector,
}: Readonly<{
  assigningGarcomId: string | null
  isAssignTarget: boolean
  mesa: Mesa
  onAssign: (mesaId: string, garcomId: string | undefined) => void
  onRequestConfirm: () => void
  onToggleSelector: () => void
}>) {
  if (!isAssignTarget) {
    onToggleSelector()
    return
  }

  if (mesa.garcomId && mesa.garcomId !== assigningGarcomId) {
    onRequestConfirm()
    return
  }

  if (assigningGarcomId) {
    onAssign(mesa.id, assigningGarcomId)
  }
}
