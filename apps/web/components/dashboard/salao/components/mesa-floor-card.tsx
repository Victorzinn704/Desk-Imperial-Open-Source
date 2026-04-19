import { memo } from 'react'
import type { MesaRecord } from '@contracts/contracts'
import { getMesaStatusMeta, getSalaoToneStyle } from '../theme'

interface MesaFloorCardProps {
  mesa: MesaRecord
  isDragging: boolean
}

export const MesaFloorCard = memo(function MesaFloorCard({ mesa, isDragging }: MesaFloorCardProps) {
  const statusMeta = getMesaStatusMeta(mesa.status)
  const statusStyle = getSalaoToneStyle(statusMeta.tone)

  return (
    <div
      className="flex h-full w-full flex-col justify-between rounded-2xl border bg-[var(--surface)] p-3"
      style={{
        boxShadow: isDragging ? 'var(--shadow-panel-strong)' : 'var(--shadow-panel)',
        borderColor: isDragging ? 'var(--accent)' : 'var(--border)',
        backgroundColor: isDragging
          ? 'color-mix(in srgb, var(--accent) 6%, var(--surface))'
          : 'var(--surface)',
        transition: isDragging ? 'none' : 'box-shadow 0.15s, border-color 0.15s, background-color 0.15s',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-semibold text-[var(--text-primary)]">{mesa.label}</span>
        <span
          className="inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]"
          style={statusStyle}
          title={statusMeta.label}
        >
          {statusMeta.label}
        </span>
      </div>
      <div className="space-y-1 text-[10px] leading-tight text-[var(--text-soft)]">
        <span className="block">{mesa.capacity} lugares</span>
        {mesa.section ? <span className="block truncate text-[var(--text-muted)]">{mesa.section}</span> : null}
      </div>
    </div>
  )
})
