import { X } from 'lucide-react'
import { type Garcom } from '../../pdv-types'
import { GarcomAvatar } from './garcom-avatar'

export function GarcomStrip({
  garcons,
  assigningGarcomId,
  onSelect,
}: Readonly<{
  garcons: Garcom[]
  assigningGarcomId: string | null
  onSelect: (id: string | null) => void
}>) {
  if (garcons.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[14px] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">Atribuir →</span>
      {garcons.map((garcom) => {
        const active = assigningGarcomId === garcom.id
        return (
          <button
            className="flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold transition-all duration-150"
            key={garcom.id}
            style={{
              background: active ? `${garcom.cor}28` : 'var(--surface-soft)',
              border: `1px solid ${active ? `${garcom.cor}70` : 'var(--border)'}`,
              color: active ? garcom.cor : 'var(--text-soft)',
              transform: active ? 'scale(1.06)' : 'scale(1)',
              boxShadow: active ? `0 0 8px ${garcom.cor}30` : 'none',
            }}
            type="button"
            onClick={() => onSelect(active ? null : garcom.id)}
          >
            <GarcomAvatar garcom={garcom} size={16} />
            {garcom.nome.split(' ')[0]}
            {active && <span className="text-[9px] opacity-70">← clique na mesa</span>}
          </button>
        )
      })}
      {assigningGarcomId ? (
        <button
          className="flex items-center gap-1 rounded-full border border-[var(--border)] px-2 py-1 text-[10px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
          type="button"
          onClick={() => onSelect(null)}
        >
          <X className="size-2.5" /> cancelar
        </button>
      ) : null}
    </div>
  )
}
