import { X } from 'lucide-react'
import type { Mesa, Garcom } from '../../pdv-types'
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
      onClick={(e) => e.stopPropagation()}
    >
      {mesa.garcomId && (
        <button
          type="button"
          onClick={() => {
            onAssign(undefined)
            onClose()
          }}
          className="flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-xs text-[#f87171] hover:bg-[rgba(248,113,113,0.08)] transition-colors"
        >
          <X className="size-3" /> Remover garçom
        </button>
      )}
      {garcons.map((g) => (
        <button
          key={g.id}
          type="button"
          onClick={() => {
            onAssign(g.id)
            onClose()
          }}
          className="flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-xs text-white hover:bg-[rgba(255,255,255,0.06)] transition-colors"
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
