'use client'

import { memo, useMemo } from 'react'
import { Draggable } from '@hello-pangea/dnd'
import { Clock, Package, Percent, User } from 'lucide-react'
import { calcTotal, isEndedComandaStatus, type Comanda, formatElapsed, type KanbanColumn } from './pdv-types'
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
    <Draggable draggableId={comanda.id} index={index} isDragDisabled={isEndedComandaStatus(comanda.status)}>
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
            className="w-full rounded-[18px] border bg-[var(--surface)] p-4 text-left transition-all duration-200 hover:border-[var(--border-strong)] hover:bg-[var(--surface-soft)]"
            style={{
              background: snapshot.isDragging ? 'var(--surface-soft)' : 'var(--surface)',
              borderColor: snapshot.isDragging ? column.borderColor : 'var(--border)',
              boxShadow: snapshot.isDragging ? 'var(--shadow-panel)' : 'none',
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
                className={`flex items-center gap-1.5 ${isOld && !isEndedComandaStatus(comanda.status) ? 'text-[var(--warning)]' : 'text-[var(--text-soft)]'}`}
              >
                <Clock className="size-3" />
                <span className="text-xs font-medium">{elapsed}</span>
              </div>
            </div>

            {/* Desconto / Acréscimo badges */}
            {(comanda.desconto > 0 || comanda.acrescimo > 0) && (
              <div className="mt-3 flex gap-1.5">
                {comanda.desconto > 0 && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-[var(--success)]"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--success) 12%, transparent)' }}
                  >
                    <Percent className="size-2.5" />-{comanda.desconto}%
                  </span>
                )}
                {comanda.acrescimo > 0 && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-[var(--warning)]"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--warning) 12%, transparent)' }}
                  >
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
