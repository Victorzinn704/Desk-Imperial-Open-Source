'use client'

import { Plus, Users2 } from 'lucide-react'

type EquipeEmptyStateProps = {
  allowRosterEditing: boolean
  garconsCount: number
  onOpenAdd: () => void
  semGarcomCount: number
}

export function EquipeEmptyState({
  allowRosterEditing,
  garconsCount,
  onOpenAdd,
  semGarcomCount,
}: Readonly<EquipeEmptyStateProps>) {
  if (garconsCount > 0 || semGarcomCount > 0 || !allowRosterEditing) {
    return null
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-[var(--border)] py-20">
      <Users2 className="size-10 opacity-40 text-[var(--text-muted)]" />
      <div className="text-center">
        <p className="text-sm font-medium text-[var(--text-soft)]">Nenhum garçom em turno</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">Adicione garçons para distribuir as mesas</p>
      </div>
      <button
        className="flex items-center gap-2 rounded-[14px] border border-[rgba(0,140,255,0.4)] bg-[rgba(0,140,255,0.1)] px-5 py-2.5 text-sm font-semibold text-[var(--accent)] transition-all hover:bg-[rgba(0,140,255,0.18)]"
        type="button"
        onClick={onOpenAdd}
      >
        <Plus className="size-4" /> Adicionar Garçom
      </button>
    </div>
  )
}
