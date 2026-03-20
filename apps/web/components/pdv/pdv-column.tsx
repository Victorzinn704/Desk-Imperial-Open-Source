'use client'

import { Droppable } from '@hello-pangea/dnd'
import type { Comanda, KanbanColumn } from './pdv-types'
import { PdvComandaCard } from './pdv-comanda-card'

type PdvColumnProps = {
  column: KanbanColumn
  comandas: Comanda[]
  onCardClick: (comanda: Comanda) => void
}

export function PdvColumn({ column, comandas, onCardClick }: Readonly<PdvColumnProps>) {
  const total = comandas.reduce(
    (sum, c) =>
      sum +
      c.itens.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0) *
        (1 - c.desconto / 100) *
        (1 + c.acrescimo / 100),
    0,
  )

  return (
    <div className="flex min-w-[260px] max-w-[300px] flex-1 flex-col">
      {/* Column header */}
      <div
        className="mb-3 flex items-center justify-between rounded-[16px] border px-4 py-3"
        style={{ background: column.bgColor, borderColor: column.borderColor }}
      >
        <div className="flex items-center gap-2">
          <span
            className="inline-block size-2.5 rounded-full"
            style={{ background: column.dotColor }}
          />
          <span className={`text-sm font-semibold ${column.color}`}>{column.label}</span>
          <span
            className="ml-1 inline-flex size-5 items-center justify-center rounded-full text-[11px] font-bold"
            style={{ background: column.borderColor, color: column.dotColor }}
          >
            {comandas.length}
          </span>
        </div>
        {total > 0 && (
          <span className="text-xs font-semibold text-[var(--text-soft)]">
            R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        )}
      </div>

      {/* Droppable area */}
      <Droppable droppableId={column.id} isDropDisabled={column.id === 'fechada'}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex flex-1 flex-col gap-2 rounded-[20px] border p-2 transition-all duration-200"
            style={{
              minHeight: 200,
              background: snapshot.isDraggingOver
                ? column.bgColor
                : 'rgba(255,255,255,0.02)',
              borderColor: snapshot.isDraggingOver
                ? column.borderColor
                : 'rgba(255,255,255,0.05)',
            }}
          >
            {comandas.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex flex-1 items-center justify-center py-8">
                <p className="text-xs text-[var(--text-soft)] opacity-50">Nenhuma comanda</p>
              </div>
            )}

            {comandas.map((comanda, idx) => (
              <PdvComandaCard
                key={comanda.id}
                column={column}
                comanda={comanda}
                index={idx}
                onClick={onCardClick}
              />
            ))}

            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  )
}
