'use client'

import { Clock } from 'lucide-react'
import { formatCurrency } from '@/lib/currency'
import { type Comanda, formatElapsed } from '../../pdv-types'
import { ItemsTooltip } from './items-tooltip'

interface MesaCardComandaSummaryProps {
  comanda: Comanda
  urgency: number
  color: string
  total: number
}

export function MesaCardComandaSummary({ comanda, urgency, color, total }: MesaCardComandaSummaryProps) {
  return (
    <div
      className="pointer-events-none relative z-10 mx-3 mb-3 space-y-1 rounded-[10px] px-2.5 py-2"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="pointer-events-auto">
        <ItemsTooltip comanda={comanda} />
      </div>
      {comanda.clienteNome && (
        <p className="truncate text-[11px] font-semibold text-[var(--text-primary)]">{comanda.clienteNome}</p>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-[var(--text-soft)]">
          <Clock className="size-2.5" />
          <span className="text-[10px]">{formatElapsed(comanda.abertaEm)}</span>
          <span className="text-[var(--text-muted)]">·</span>
          <span className="text-[10px]">
            {comanda.itens.length} item{comanda.itens.length !== 1 ? 's' : ''}
          </span>
        </div>
        <span className="text-[11px] font-bold" style={{ color: urgency >= 2 ? '#fbbf24' : color }}>
          {formatCurrency(total, 'BRL')}
        </span>
      </div>
    </div>
  )
}
