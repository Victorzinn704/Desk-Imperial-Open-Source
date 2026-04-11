'use client'

import { memo, useMemo } from 'react'
import { Draggable } from '@hello-pangea/dnd'
import { Clock, Package, Percent, User } from 'lucide-react'
import { calcTotal, type Comanda, formatElapsed, type KanbanColumn } from './pdv-types'
import { formatCurrency } from '@/lib/currency'

type PdvComandaCardProps = Readonly<{
  comanda: Comanda
  index: number
  column: KanbanColumn
  onClick: (comanda: Comanda) => void
}>

export const PdvComandaCard = memo(function PdvComandaCard({
  comanda,
  index,
  column,
  onClick,
}: Readonly<PdvComandaCardProps>) {
  const total = calcTotal(comanda)
  const elapsed = formatElapsed(comanda.abertaEm)
  // eslint-disable-next-line react-hooks/purity
  const isOld = useMemo(() => Date.now() - comanda.abertaEm.getTime() > 30 * 60 * 1000, [comanda.abertaEm])
  const itemCount = comanda.itens.reduce((sum, i) => sum + i.quantidade, 0)

  return (
    <Draggable draggableId={comanda.id} index={index} isDragDisabled={comanda.status === 'fechada'}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className="group cursor-pointer select-none will-change-transform"
          style={{
            ...provided.draggableProps.style,
            willChange: snapshot.isDragging ? 'transform' : undefined,
          }}
        >
          <button
            className="w-full rounded-[18px] border bg-transparent p-4 text-left transition-all duration-200"
            style={{
              background: snapshot.isDragging ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
              borderColor: snapshot.isDragging ? column.borderColor : 'rgba(255,255,255,0.08)',
              boxShadow: snapshot.isDragging ? `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${column.dotColor}33` : 'none',
            }}
            type="button"
            onClick={() => onClick(comanda)}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block size-2 rounded-full flex-shrink-0 mt-0.5"
                  style={{ background: column.dotColor }}
                />
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {comanda.mesa ? `Mesa ${comanda.mesa}` : `#${comanda.id.slice(-4).toUpperCase()}`}
                </span>
              </div>
              <span className="text-sm font-bold" style={{ color: column.dotColor }}>
                {formatCurrency(total, 'BRL')}
              </span>
            </div>

            {/* Cliente */}
            {comanda.clienteNome && (
              <div className="mt-2 flex items-center gap-1.5">
                <User className="size-3 text-[var(--text-soft)]" />
                <span className="text-xs text-[var(--text-soft)] truncate">{comanda.clienteNome}</span>
              </div>
            )}

            {/* Itens */}
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Package className="size-3 text-[var(--text-soft)]" />
                <span className="text-xs text-[var(--text-soft)]">
                  {itemCount} {itemCount === 1 ? 'item' : 'itens'}
                </span>
              </div>

              <div
                className={`flex items-center gap-1.5 ${isOld && comanda.status !== 'fechada' ? 'text-[#fb923c]' : 'text-[var(--text-soft)]'}`}
              >
                <Clock className="size-3" />
                <span className="text-xs font-medium">{elapsed}</span>
              </div>
            </div>

            {/* Desconto / Acréscimo badges */}
            {(comanda.desconto > 0 || comanda.acrescimo > 0) && (
              <div className="mt-3 flex gap-1.5">
                {comanda.desconto > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(52,242,127,0.1)] px-2 py-0.5 text-[10px] font-semibold text-[#36f57c]">
                    <Percent className="size-2.5" />-{comanda.desconto}%
                  </span>
                )}
                {comanda.acrescimo > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(251,146,60,0.1)] px-2 py-0.5 text-[10px] font-semibold text-[#fb923c]">
                    <Percent className="size-2.5" />+{comanda.acrescimo}%
                  </span>
                )}
              </div>
            )}
          </button>
        </div>
      )}
    </Draggable>
  )
})
