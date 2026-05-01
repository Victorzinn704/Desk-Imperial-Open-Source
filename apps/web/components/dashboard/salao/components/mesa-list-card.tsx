import { memo } from 'react'
import { Pencil, Power } from 'lucide-react'
import type { MesaRecord } from '@contracts/contracts'
import { getMesaStatusMeta, getSalaoToneStyle } from '../theme'

interface MesaListCardProps {
  mesa: MesaRecord
  onEdit: () => void
  onToggle: () => void
  isPending: boolean
}

export const MesaListCard = memo(function MesaListCard({ mesa, onEdit, onToggle, isPending }: MesaListCardProps) {
  const statusMeta = getMesaStatusMeta(mesa.status)
  const statusStyle = getSalaoToneStyle(statusMeta.tone)

  return (
    <div className="group flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-soft)]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="block truncate text-sm font-semibold text-[var(--text-primary)]">{mesa.label}</span>
          <div className="mt-1 flex items-center gap-2 text-xs text-[var(--text-soft)]">
            <span>{mesa.capacity} lugares</span>
            {mesa.section ? <span className="truncate">· {mesa.section}</span> : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
          <button
            className="inline-flex size-8 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-soft)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)]"
            title="Editar"
            type="button"
            onClick={onEdit}
          >
            <Pencil className="size-3.5 text-[var(--text-soft)]" />
          </button>
          <button
            className="inline-flex size-8 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-soft)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isPending}
            title={mesa.active ? 'Desativar' : 'Reativar'}
            type="button"
            onClick={onToggle}
          >
            <Power className={`size-3.5 ${mesa.active ? 'text-[var(--text-soft)]' : 'text-[var(--success)]'}`} />
          </button>
        </div>
      </div>
      {mesa.active && (
        <span
          className="w-fit rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
          style={statusStyle}
        >
          {statusMeta.label}
        </span>
      )}
    </div>
  )
})
