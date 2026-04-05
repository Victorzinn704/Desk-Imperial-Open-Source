'use client'

import { memo } from 'react'
import { Users, ShoppingBag, Clock } from 'lucide-react'
import type { Mesa, Comanda } from './pdv-types'
import { calcTotal, formatElapsed } from './pdv-types'
import { formatCurrency } from '@/lib/currency'

const STATUS_CONFIG = {
  livre: {
    label: 'Livre',
    dot: '#36f57c',
    bg: 'rgba(54, 245, 124, 0.07)',
    border: 'rgba(54, 245, 124, 0.22)',
    text: 'text-[#36f57c]',
  },
  ocupada: {
    label: 'Ocupada',
    dot: '#fb923c',
    bg: 'rgba(251, 146, 60, 0.08)',
    border: 'rgba(251, 146, 60, 0.28)',
    text: 'text-[#fb923c]',
  },
  reservada: {
    label: 'Reservada',
    dot: '#60a5fa',
    bg: 'rgba(96, 165, 250, 0.08)',
    border: 'rgba(96, 165, 250, 0.22)',
    text: 'text-[#60a5fa]',
  },
}

type PdvMesaCardProps = {
  mesa: Mesa
  comanda?: Comanda
  onClickLivre: (mesa: Mesa) => void
  onClickOcupada: (comanda: Comanda) => void
  onDelete: (mesaId: string) => void
}

export const PdvMesaCard = memo(function PdvMesaCard({
  mesa,
  comanda,
  onClickLivre,
  onClickOcupada,
  onDelete,
}: Readonly<PdvMesaCardProps>) {
  const cfg = STATUS_CONFIG[mesa.status]

  function handleClick() {
    if (mesa.status === 'livre' || mesa.status === 'reservada') {
      onClickLivre(mesa)
    } else if (mesa.status === 'ocupada' && comanda) {
      onClickOcupada(comanda)
    }
  }

  return (
    <div
      className="relative flex flex-col justify-between rounded-2xl border p-5 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(0,0,0,0.32)] select-none"
      style={{ background: cfg.bg, borderColor: cfg.border, minHeight: 148 }}
    >
      <button
        aria-label={mesa.status === 'ocupada' ? `Abrir comanda da mesa ${mesa.numero}` : `Abrir mesa ${mesa.numero}`}
        className="absolute inset-0 rounded-2xl border-0 bg-transparent p-0"
        type="button"
        onClick={handleClick}
      />

      {/* Delete button */}
      <button
        className="absolute right-3 top-3 z-20 flex size-6 items-center justify-center rounded-full text-[var(--text-muted)] opacity-0 transition hover:text-white group-hover:opacity-100 hover:opacity-100 hover:bg-[rgba(255,255,255,0.06)]"
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onDelete(mesa.id)
        }}
        title="Remover mesa"
      >
        ×
      </button>

      <div className="pointer-events-none relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">Mesa</p>
            <p className="mt-0.5 text-3xl font-bold text-white leading-none">{mesa.numero}</p>
          </div>
          <span
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${cfg.text}`}
            style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${cfg.border}` }}
          >
            <span className="inline-block size-1.5 rounded-full" style={{ background: cfg.dot }} />
            {cfg.label}
          </span>
        </div>

        {/* Capacity */}
        <div className="mt-3 flex items-center gap-1.5 text-[var(--text-soft)]">
          <Users className="size-3.5" />
          <span className="text-xs">{mesa.capacidade} pessoas</span>
        </div>

        {/* Comanda info (when occupied) */}
        {mesa.status === 'ocupada' && comanda && (
          <div className="mt-3 rounded-xl border border-[rgba(251,146,60,0.18)] bg-[rgba(251,146,60,0.05)] p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[var(--text-soft)]">
                <ShoppingBag className="size-3.5" />
                <span className="text-[11px]">
                  {comanda.itens.length} {comanda.itens.length === 1 ? 'item' : 'itens'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[var(--text-soft)]">
                <Clock className="size-3.5" />
                <span className="text-[11px]">{formatElapsed(comanda.abertaEm)}</span>
              </div>
            </div>
            {comanda.clienteNome && (
              <p className="mt-1.5 truncate text-[11px] font-medium text-white">{comanda.clienteNome}</p>
            )}
            <p className="mt-1 text-sm font-bold text-[#fb923c]">{formatCurrency(calcTotal(comanda), 'BRL')}</p>
          </div>
        )}

        {/* Empty state for livre */}
        {mesa.status === 'livre' && (
          <p className="mt-3 text-[11px] text-[var(--text-muted)]">Clique para abrir comanda</p>
        )}
      </div>
    </div>
  )
})
