'use client'

import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd'
import { Filter, Monitor, Plus, Search, Smartphone } from 'lucide-react'
import { useMemo, useState } from 'react'

type LiteMode = 'web' | 'pwa'

type KanbanColumnId = 'aberta' | 'preparo' | 'pronta' | 'fechada'

type KanbanCard = {
  id: string
  mesa: string
  cliente: string
  itens: number
  valor: string
  tempo: string
}

type KanbanColumn = {
  id: KanbanColumnId
  label: string
  color: string
  cards: KanbanCard[]
}

const INITIAL_COLUNAS: KanbanColumn[] = [
  {
    id: 'aberta',
    label: 'Aberta',
    color: '#636363',
    cards: [
      { id: '#1048', mesa: 'Mesa 3', cliente: 'Carlos M.', itens: 2, valor: 'R$ 58,00', tempo: '5min' },
      { id: '#1047', mesa: 'Delivery', cliente: 'Fernanda L.', itens: 4, valor: 'R$ 124,00', tempo: '12min' },
      { id: '#1046', mesa: 'Mesa 7', cliente: 'Ricardo B.', itens: 1, valor: 'R$ 32,50', tempo: '18min' },
    ],
  },
  {
    id: 'preparo',
    label: 'Em Preparo',
    color: '#f59e0b',
    cards: [
      { id: '#1045', mesa: 'Mesa 2', cliente: 'Ana P.', itens: 3, valor: 'R$ 97,00', tempo: '22min' },
      { id: '#1044', mesa: 'Mesa 9', cliente: 'Bruno S.', itens: 5, valor: 'R$ 186,50', tempo: '30min' },
    ],
  },
  {
    id: 'pronta',
    label: 'Pronta',
    color: '#008cff',
    cards: [
      { id: '#1043', mesa: 'Mesa 5', cliente: 'Juliana K.', itens: 4, valor: 'R$ 134,00', tempo: '38min' },
      { id: '#1042', mesa: 'Mesa 11', cliente: 'Marcos T.', itens: 2, valor: 'R$ 76,00', tempo: '41min' },
    ],
  },
  {
    id: 'fechada',
    label: 'Fechada',
    color: '#22c55e',
    cards: [
      { id: '#1041', mesa: 'Mesa 4', cliente: 'Camila R.', itens: 6, valor: 'R$ 228,00', tempo: '55min' },
      { id: '#1040', mesa: 'Retirada', cliente: 'Paulo N.', itens: 3, valor: 'R$ 89,50', tempo: '62min' },
      { id: '#1039', mesa: 'Mesa 1', cliente: 'Sandra F.', itens: 5, valor: 'R$ 176,50', tempo: '70min' },
    ],
  },
]

function moveCard(
  columns: KanbanColumn[],
  source: { droppableId: string; index: number },
  destination: { droppableId: string; index: number },
) {
  const sourceColumnIndex = columns.findIndex((column) => column.id === source.droppableId)
  const destinationColumnIndex = columns.findIndex((column) => column.id === destination.droppableId)

  if (sourceColumnIndex < 0 || destinationColumnIndex < 0) {
    return columns
  }

  const sourceCards = [...columns[sourceColumnIndex].cards]
  const [movedCard] = sourceCards.splice(source.index, 1)

  if (!movedCard) {
    return columns
  }

  const nextColumns = [...columns]

  if (sourceColumnIndex === destinationColumnIndex) {
    sourceCards.splice(destination.index, 0, movedCard)
    nextColumns[sourceColumnIndex] = { ...columns[sourceColumnIndex], cards: sourceCards }
    return nextColumns
  }

  const destinationCards = [...columns[destinationColumnIndex].cards]
  destinationCards.splice(destination.index, 0, movedCard)

  nextColumns[sourceColumnIndex] = { ...columns[sourceColumnIndex], cards: sourceCards }
  nextColumns[destinationColumnIndex] = { ...columns[destinationColumnIndex], cards: destinationCards }

  return nextColumns
}

export function LitePdvKanban({ mode, title }: Readonly<{ mode: LiteMode; title?: string }>) {
  const [colunas, setColunas] = useState<KanbanColumn[]>(INITIAL_COLUNAS)
  const modeLabel = mode === 'pwa' ? 'PWA Lite' : 'Web Lite'
  const ModeIcon = mode === 'pwa' ? Smartphone : Monitor

  const counts = useMemo(
    () =>
      colunas.reduce(
        (acc, column) => {
          acc[column.id] = column.cards.length
          return acc
        },
        { aberta: 0, preparo: 0, pronta: 0, fechada: 0 } as Record<KanbanColumnId, number>,
      ),
    [colunas],
  )

  function handleDragEnd(result: DropResult) {
    const { source, destination } = result

    if (!destination) {
      return
    }

    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return
    }

    setColunas((current) => moveCard(current, source, destination))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="lab-heading">{title ?? 'PDV Lite - Comandas'}</h1>
          <p className="lab-subheading">Kanban de pedidos em tempo real</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 max-sm:w-full">
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              height: 34,
              padding: '0 10px',
              borderRadius: 8,
              border: '1px solid var(--lab-blue-border)',
              background: 'var(--lab-blue-soft)',
              color: 'var(--lab-blue)',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <ModeIcon className="size-3.5" />
            {modeLabel}
          </span>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--lab-surface)',
              border: '1px solid var(--lab-border)',
              borderRadius: 8,
              padding: '0 12px',
              height: 34,
              minWidth: 150,
            }}
          >
            <Search className="size-3.5" style={{ color: 'var(--lab-fg-muted)' }} />
            <input
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: 13,
                color: 'var(--lab-fg)',
                width: 140,
                maxWidth: '40vw',
              }}
              placeholder="Buscar comanda..."
              readOnly
            />
          </div>

          <button
            className="lab-icon-btn"
            type="button"
            style={{ border: '1px solid var(--lab-border)', width: 34, height: 34 }}
          >
            <Filter className="size-4" />
          </button>

          <button
            type="button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '0 14px',
              height: 34,
              background: 'var(--lab-blue)',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Plus className="size-4" />
            Nova Comanda
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Abertas', value: String(counts.aberta), color: '#636363' },
          { label: 'Em Preparo', value: String(counts.preparo), color: '#f59e0b' },
          { label: 'Prontas', value: String(counts.pronta), color: '#008cff' },
          { label: 'Fechadas hoje', value: String(counts.fechada), color: '#22c55e' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="lab-card lab-card-p flex items-center gap-3"
            style={{ borderLeft: `3px solid ${kpi.color}` }}
          >
            <p style={{ fontSize: 26, fontWeight: 700, color: kpi.color, margin: 0 }}>{kpi.value}</p>
            <p style={{ fontSize: 12, color: 'var(--lab-fg-muted)', margin: 0 }}>{kpi.label}</p>
          </div>
        ))}
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="lab-kanban">
          {colunas.map((col) => (
            <div key={col.id} className="lab-kanban-col">
              <div className="lab-kanban-col__header" style={{ borderTop: `3px solid ${col.color}` }}>
                <p className="lab-kanban-col__title" style={{ color: col.color }}>
                  {col.label}
                </p>
                <span className="lab-kanban-col__count">{col.cards.length}</span>
              </div>

              <Droppable droppableId={col.id}>
                {(dropProvided, dropSnapshot) => (
                  <div
                    ref={dropProvided.innerRef}
                    {...dropProvided.droppableProps}
                    className="lab-kanban-col__body"
                    style={{
                      background: dropSnapshot.isDraggingOver ? `${col.color}12` : undefined,
                      borderRadius: 8,
                    }}
                  >
                    {col.cards.map((card, index) => (
                      <Draggable draggableId={card.id} index={index} key={card.id}>
                        {(dragProvided, dragSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            className="lab-kanban-card"
                            style={{
                              ...dragProvided.draggableProps.style,
                              borderColor: dragSnapshot.isDragging ? col.color : undefined,
                              boxShadow: dragSnapshot.isDragging ? `0 10px 20px ${col.color}33` : undefined,
                            }}
                          >
                            <div className="lab-kanban-card__title">
                              {card.mesa} - {card.id}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--lab-fg-muted)', marginBottom: 8 }}>
                              {card.cliente} - {card.itens} itens
                            </div>
                            <div className="lab-kanban-card__meta">
                              <span className="lab-kanban-card__value">{card.valor}</span>
                              <span style={{ fontSize: 11, color: 'var(--lab-fg-muted)' }}>Tempo {card.tempo}</span>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}

                    {dropProvided.placeholder}

                    <button
                      type="button"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 10px',
                        background: 'transparent',
                        border: '1px dashed var(--lab-border)',
                        borderRadius: 8,
                        color: 'var(--lab-fg-muted)',
                        fontSize: 12,
                        cursor: 'pointer',
                        width: '100%',
                      }}
                    >
                      <Plus className="size-3.5" />
                      Adicionar
                    </button>
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  )
}
