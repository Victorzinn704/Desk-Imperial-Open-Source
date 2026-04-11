import { X } from 'lucide-react'
import type { Garcom, Mesa } from '../../pdv-types'
import { GarcomAvatar } from './garcom-avatar'

export interface GarcomSelectorProps {
  mesa: Mesa
  garcons: Garcom[]
  onAssign: (garcomId: string | undefined) => void
  onClose: () => void
}

export function GarcomSelector({ mesa, garcons, onAssign, onClose }: GarcomSelectorProps) {
  return (
    <div
      className="absolute z-30 left-0 top-full mt-1 min-w-[160px] rounded-[12px] border border-[rgba(255,255,255,0.1)] bg-[#0e1018] p-1 shadow-2xl"
      onPointerDown={(event) => event.stopPropagation()}
    >
      {mesa.garcomId && (
        <button
          className="flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-xs text-[#f87171] hover:bg-[rgba(248,113,113,0.08)] transition-colors"
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onAssign(undefined)
            onClose()
          }}
        >
          <X className="size-3" /> Remover garçom
        </button>
      )}
      {garcons.map((g) => (
        <button
          className="flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-xs text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
          key={g.id}
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onAssign(g.id)
            onClose()
          }}
        >
          <GarcomAvatar garcom={g} size={18} />
          {g.nome}
          {mesa.garcomId === g.id && <span className="ml-auto text-[10px] text-[#36f57c]">✓</span>}
        </button>
      ))}
      {garcons.length === 0 && (
        <p className="px-3 py-2 text-[11px] text-[var(--text-muted)]">Nenhum garçom cadastrado</p>
      )}
    </div>
  )
}
