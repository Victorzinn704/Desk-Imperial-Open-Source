'use client'

import type { Mesa, MesaStatus } from '@/components/pdv/pdv-types'

interface MobileTableGridProps {
  mesas: Mesa[]
  onSelectMesa: (mesa: Mesa) => void
}

function StatusDot({ status }: { status: MesaStatus }) {
  const colorMap: Record<MesaStatus, string> = {
    livre: '#22c55e',
    ocupada: '#fb923c',
    reservada: '#60a5fa',
  }
  return (
    <span
      className="inline-block size-2.5 rounded-full"
      style={{ backgroundColor: colorMap[status] }}
    />
  )
}

function statusLabel(status: MesaStatus): string {
  const labels: Record<MesaStatus, string> = {
    livre: 'Livre',
    ocupada: 'Ocupada',
    reservada: 'Reservada',
  }
  return labels[status]
}

export function MobileTableGrid({ mesas, onSelectMesa }: MobileTableGridProps) {
  return (
    <div className="p-4">
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft,#7a8896)]">
        Selecione uma mesa
      </p>
      <div className="grid grid-cols-3 gap-3">
        {mesas.map((mesa) => (
          <button
            key={mesa.id}
            type="button"
            onClick={() => onSelectMesa(mesa)}
            className="flex min-h-[80px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-[rgba(155,132,96,0.15)] bg-[rgba(255,255,255,0.04)] p-3 text-center transition-all active:scale-95 active:border-[rgba(155,132,96,0.45)] active:bg-[rgba(155,132,96,0.08)]"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <span className="text-2xl font-bold text-[var(--accent,#9b8460)]">
              {mesa.numero}
            </span>
            <StatusDot status={mesa.status} />
            <span className="text-[10px] font-medium text-[var(--text-soft,#7a8896)]">
              {statusLabel(mesa.status)}
            </span>
            <span className="text-[10px] text-[var(--text-soft,#7a8896)]">
              {mesa.capacidade} lugares
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
