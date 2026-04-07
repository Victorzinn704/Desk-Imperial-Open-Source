import { memo } from 'react'
import { Pencil, Power } from 'lucide-react'
import type { MesaRecord } from '@contracts/contracts'

interface MesaListCardProps {
  mesa: MesaRecord
  onEdit: () => void
  onToggle: () => void
  isPending: boolean
}

export const MesaListCard = memo(function MesaListCard({ mesa, onEdit, onToggle, isPending }: MesaListCardProps) {
  return (
    <div className="imperial-card-soft group flex flex-col gap-2 rounded-xl p-3">
      <div className="flex items-start justify-between gap-1">
        <span className="truncate font-semibold text-[var(--text-primary)]">{mesa.label}</span>
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={onEdit}
            title="Editar"
            className="rounded-lg p-1 transition-colors hover:bg-[rgba(255,255,255,0.08)]"
          >
            <Pencil className="size-3.5 text-[var(--text-soft)]" />
          </button>
          <button
            onClick={onToggle}
            disabled={isPending}
            title={mesa.active ? 'Desativar' : 'Reativar'}
            className="rounded-lg p-1 transition-colors hover:bg-[rgba(255,255,255,0.08)]"
          >
            <Power className={`size-3.5 ${mesa.active ? 'text-[var(--text-soft)]' : 'text-emerald-400'}`} />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-[var(--text-soft)]">
        <span>👤 {mesa.capacity}</span>
        {mesa.section && <span className="truncate">· {mesa.section}</span>}
      </div>
      {mesa.active && (
        <span
          className="w-fit rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]"
          style={{
            background:
              mesa.status === 'ocupada'
                ? 'rgba(248,113,113,0.12)'
                : mesa.status === 'reservada'
                  ? 'rgba(96,165,250,0.12)'
                  : 'rgba(52,242,127,0.08)',
            color: mesa.status === 'ocupada' ? '#f87171' : mesa.status === 'reservada' ? '#60a5fa' : '#36f57c',
          }}
        >
          {mesa.status === 'ocupada' ? 'Ocupada' : mesa.status === 'reservada' ? 'Reservada' : 'Livre'}
        </span>
      )}
    </div>
  )
})
