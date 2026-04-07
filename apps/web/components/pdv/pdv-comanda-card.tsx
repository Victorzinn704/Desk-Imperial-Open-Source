'use client'

import { memo } from 'react'
import { Draggable } from '@hello-pangea/dnd'
import { Clock, Package, Percent, User } from 'lucide-react'
import type { Comanda, KanbanColumn } from './pdv-types'
import { calcTotal, formatElapsed } from './pdv-types'
import { formatCurrency } from '@/lib/currency'

type PdvComandaCardProps = {
  comanda: Comanda
  index: number
  column: KanbanColumn
  onClick: (comanda: Comanda) => void
}

const STATUS_TONES: Record<
  Comanda['status'],
  { text: string; bg: string; border: string; iconColor: string }
> = {
  aberta: {
    text: 'Aberta',
    bg: 'rgba(0, 140, 255, 0.12)',
    border: 'rgba(0, 140, 255, 0.25)',
    iconColor: '#008cff',
  },
  em_preparo: {
    text: 'Em preparo',
    bg: 'rgba(248, 113, 113, 0.12)',
    border: 'rgba(248, 113, 113, 0.3)',
    iconColor: '#f87171',
  },
  pronta: {
    text: 'Pronta',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.3)',
    iconColor: '#10b981',
  },
  fechada: {
    text: 'Fechada',
    bg: 'rgba(255, 255, 255, 0.05)',
    border: 'rgba(255, 255, 255, 0.12)',
    iconColor: 'rgba(255, 255, 255, 0.8)',
  },
}

export const PdvComandaCard = memo(function PdvComandaCard({
  comanda,
  index,
  column,
  onClick,
}: Readonly<PdvComandaCardProps>) {
  const total = calcTotal(comanda)
  const elapsed = formatElapsed(comanda.abertaEm)
  const itemCount = comanda.itens.reduce((sum, i) => sum + i.quantidade, 0)
  const tone = STATUS_TONES[comanda.status]

  return (
    <Draggable draggableId={comanda.id} index={index} isDragDisabled={comanda.status === 'fechada'}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className="group select-none will-change-transform"
          style={{
            ...provided.draggableProps.style,
            willChange: snapshot.isDragging ? 'transform' : undefined,
          }}
        >
          <button
            className="w-full overflow-hidden rounded-[20px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.01)] p-5 text-left transition duration-200"
            style={{
              background: snapshot.isDragging ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
              borderColor: snapshot.isDragging ? column.borderColor : 'rgba(255,255,255,0.06)',
              boxShadow: snapshot.isDragging ? `0 15px 40px rgba(0,0,0,0.35)` : 'none',
            }}
            type="button"
            aria-label={`Abrir comanda ${comanda.mesa ?? comanda.id}`}
            onClick={() => onClick(comanda)}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--text-soft)]">{tone.text}</p>
                <h3 className="text-lg font-black text-[var(--text-primary)]">
                  {comanda.mesa ? `Mesa ${comanda.mesa}` : `#${comanda.id.slice(-4).toUpperCase()}`}
                </h3>
              </div>
              <span
                className="flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em]"
                style={{ borderColor: tone.border, background: tone.bg }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: tone.iconColor, boxShadow: `0 0 6px ${tone.iconColor}` }}
                />
                {tone.text}
              </span>
            </div>

            {comanda.clienteNome ? (
              <div className="mt-3 flex items-center gap-2 text-sm text-[var(--text-soft)]">
                <User className="size-3.5 text-[var(--text-soft)]" />
                <span className="truncate">{comanda.clienteNome}</span>
              </div>
            ) : null}

            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="size-4 text-[var(--text-soft)]" />
                <span className="text-xs text-[var(--text-soft)]">
                  {itemCount} {itemCount === 1 ? 'item' : 'itens'}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold text-[var(--text-soft)]">
                <Clock className="size-4" />
                <span>{elapsed}</span>
              </div>
            </div>

            {(comanda.desconto > 0 || comanda.acrescimo > 0) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {comanda.desconto > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-[14px] border border-[rgba(52,242,127,0.3)] bg-[rgba(52,242,127,0.12)] px-3 py-1 text-[11px] font-semibold text-[#36f57c]">
                    <Percent className="size-3" />-{comanda.desconto}%
                  </span>
                )}
                {comanda.acrescimo > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-[14px] border border-[rgba(251,146,60,0.35)] bg-[rgba(251,146,60,0.12)] px-3 py-1 text-[11px] font-semibold text-[#fb923c]">
                    <Percent className="size-3" />+{comanda.acrescimo}%
                  </span>
                )}
              </div>
            )}

            <div className="mt-4 flex items-center justify-between border-t border-[rgba(255,255,255,0.06)] pt-3">
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--text-soft)]">Total</span>
              <span className="text-lg font-black text-[var(--text-primary)]">{formatCurrency(total, 'BRL')}</span>
            </div>
          </button>
        </div>
      )}
    </Draggable>
  )
})
