'use client'

import { memo, useMemo } from 'react'
import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd'
import { Plus, Users } from 'lucide-react'
import { calcTotal, type Comanda, formatElapsed, type Mesa, type MesaStatus } from './pdv-types'
import { formatCurrency } from '@/lib/currency'

type Props = Readonly<{
  mesas: Mesa[]
  comandas: Comanda[]
  onStatusChange: (mesaId: string, newStatus: MesaStatus) => void
  onClickLivre: (mesa: Mesa) => void
  onClickOcupada: (comanda: Comanda) => void
  onAddMesa: () => void
}>

const COLUMNS = [
  {
    id: 'ocupada' as MesaStatus,
    label: 'Ocupada',
    color: '#f87171',
    bg: 'rgba(248,113,113,0.06)',
    border: 'rgba(248,113,113,0.22)',
    glow: 'rgba(248,113,113,0.12)',
  },
  {
    id: 'reservada' as MesaStatus,
    label: 'Reservada',
    color: '#60a5fa',
    bg: 'rgba(96,165,250,0.06)',
    border: 'rgba(96,165,250,0.22)',
    glow: 'rgba(96,165,250,0.12)',
  },
]

function resolveMesaComanda(mesa: Mesa, comandaById: ReadonlyMap<string, Comanda>) {
  return mesa.comandaId ? comandaById.get(mesa.comandaId) : undefined
}

const MesaSquare = memo(function MesaSquare({
  mesa,
  comanda,
  index,
  onClickLivre,
  onClickOcupada,
}: {
  mesa: Mesa
  comanda?: Comanda
  index: number
  onClickLivre: (m: Mesa) => void
  onClickOcupada: (c: Comanda) => void
}) {
  function handleClick() {
    if (mesa.status === 'livre' || mesa.status === 'reservada') {onClickLivre(mesa)}
    else if (mesa.status === 'ocupada' && comanda) {onClickOcupada(comanda)}
  }

  return (
    <Draggable draggableId={mesa.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className="select-none cursor-grab active:cursor-grabbing"
          style={{
            ...provided.draggableProps.style,
            opacity: snapshot.isDragging ? 0.85 : 1,
          }}
        >
          {/* Square card — pool view */}
          <button
            className="flex h-[76px] w-[76px] flex-col items-center justify-center rounded-xl border bg-transparent transition-all duration-200 hover:scale-105 hover:shadow-lg"
            style={{
              background: 'rgba(54,245,124,0.06)',
              borderColor: snapshot.isDragging ? '#36f57c' : 'rgba(54,245,124,0.3)',
              boxShadow: snapshot.isDragging ? '0 0 20px rgba(54,245,124,0.25)' : undefined,
            }}
            type="button"
            onClick={handleClick}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[rgba(54,245,124,0.6)]">Mesa</p>
            <p className="text-2xl font-bold text-[var(--text-primary)] leading-none mt-0.5">{mesa.numero}</p>
            <div className="mt-1 flex items-center gap-0.5 text-[rgba(54,245,124,0.55)]">
              <Users className="size-2.5" />
              <span className="text-[9px]">{mesa.capacidade}</span>
            </div>
          </button>
        </div>
      )}
    </Draggable>
  )
})

const MesaRectCard = memo(function MesaRectCard({
  mesa,
  comanda,
  index,
  colColor,
  onClickLivre,
  onClickOcupada,
}: {
  mesa: Mesa
  comanda?: Comanda
  index: number
  colColor: string
  onClickLivre: (m: Mesa) => void
  onClickOcupada: (c: Comanda) => void
}) {
  function handleClick() {
    if (mesa.status === 'livre' || mesa.status === 'reservada') {onClickLivre(mesa)}
    else if (mesa.status === 'ocupada' && comanda) {onClickOcupada(comanda)}
  }

  return (
    <Draggable draggableId={mesa.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className="select-none cursor-grab active:cursor-grabbing"
          style={{ ...provided.draggableProps.style }}
        >
          <button
            className="w-full rounded-xl border bg-transparent p-3 text-left transition-all duration-200 hover:-translate-y-0.5"
            style={{
              background: snapshot.isDragging ? `${colColor}18` : `${colColor}0a`,
              borderColor: snapshot.isDragging ? colColor : `${colColor}44`,
              boxShadow: snapshot.isDragging ? `0 8px 24px ${colColor}22` : undefined,
            }}
            type="button"
            onClick={handleClick}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em]" style={{ color: `${colColor}99` }}>
                  Mesa
                </p>
                <p className="text-xl font-bold text-[var(--text-primary)] leading-none">{mesa.numero}</p>
              </div>
              <div className="flex items-center gap-1" style={{ color: `${colColor}88` }}>
                <Users className="size-3" />
                <span className="text-[10px]">{mesa.capacidade}</span>
              </div>
            </div>

            {mesa.status === 'ocupada' && comanda && (
              <div
                className="mt-2 rounded-lg px-2 py-1.5 space-y-0.5"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                {comanda.clienteNome && (
                  <p className="text-[11px] font-medium text-[var(--text-primary)] truncate">{comanda.clienteNome}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[var(--text-soft)]">
                    {comanda.itens.length} {comanda.itens.length === 1 ? 'item' : 'itens'} ·{' '}
                    {formatElapsed(comanda.abertaEm)}
                  </span>
                  <span className="text-[11px] font-bold" style={{ color: colColor }}>
                    {formatCurrency(calcTotal(comanda), 'BRL')}
                  </span>
                </div>
              </div>
            )}

            {mesa.status === 'reservada' && (
              <p className="mt-1.5 text-[10px]" style={{ color: `${colColor}88` }}>
                Clique para abrir comanda
              </p>
            )}
          </button>
        </div>
      )}
    </Draggable>
  )
})

export function PdvMesasKanban({
  mesas,
  comandas,
  onStatusChange,
  onClickLivre,
  onClickOcupada,
  onAddMesa,
}: Readonly<Props>) {
  const mesaById = useMemo(() => new Map(mesas.map((mesa) => [mesa.id, mesa])), [mesas])
  const comandaById = useMemo(() => new Map(comandas.map((comanda) => [comanda.id, comanda])), [comandas])
  const livres = useMemo(() => mesas.filter((mesa) => mesa.status === 'livre'), [mesas])
  const mesasByStatus = useMemo(
    () =>
      COLUMNS.reduce(
        (acc, column) => {
          acc[column.id] = mesas.filter((mesa) => mesa.status === column.id)
          return acc
        },
        {} as Record<(typeof COLUMNS)[number]['id'], Mesa[]>,
      ),
    [mesas],
  )

  function handleDragEnd(result: DropResult) {
    const { draggableId, destination } = result
    if (!destination) {return}
    const newStatus = destination.droppableId as MesaStatus
    const mesa = mesaById.get(draggableId)
    if (!mesa || mesa.status === newStatus) {return}
    onStatusChange(draggableId, newStatus)
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="space-y-5">
        {/* ── Pool: Mesas Livres ── */}
        <div
          className="rounded-2xl border p-4"
          style={{
            borderColor: 'rgba(54,245,124,0.25)',
            background: 'rgba(54,245,124,0.03)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span
                className="inline-block size-2 rounded-full"
                style={{ background: '#36f57c', boxShadow: '0 0 6px #36f57c' }}
              />
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#36f57c]">Livre</span>
              <span className="text-xs text-[var(--text-muted)]">— arraste para ocupar ou reservar</span>
            </div>
            <button
              className="flex items-center gap-1.5 rounded-[10px] border border-[rgba(54,245,124,0.3)] bg-[rgba(54,245,124,0.07)] px-3 py-1.5 text-xs font-semibold text-[#36f57c] transition-colors hover:bg-[rgba(54,245,124,0.14)]"
              type="button"
              onClick={onAddMesa}
            >
              <Plus className="size-3" />
              Nova Mesa
            </button>
          </div>

          <Droppable direction="horizontal" droppableId="livre">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex flex-wrap gap-3 min-h-[88px] rounded-xl transition-colors duration-200 p-1"
                style={{
                  background: snapshot.isDraggingOver ? 'rgba(54,245,124,0.06)' : 'transparent',
                  outline: snapshot.isDraggingOver ? '1.5px dashed rgba(54,245,124,0.4)' : '1.5px dashed transparent',
                }}
              >
                {livres.length === 0 && !snapshot.isDraggingOver && (
                  <p className="self-center text-xs text-[var(--text-muted)] pl-1">
                    Todas as mesas estão ocupadas ou reservadas
                  </p>
                )}
                {livres.map((mesa, i) => (
                  <MesaSquare
                    index={i}
                    key={mesa.id}
                    mesa={mesa}
                    onClickLivre={onClickLivre}
                    onClickOcupada={onClickOcupada}
                  />
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>

        {/* ── Colunas Ocupada / Reservada ── */}
        <div className="grid grid-cols-2 gap-4">
          {COLUMNS.map((col) => {
            const colMesas = mesasByStatus[col.id]
            return (
              <div className="rounded-2xl border" key={col.id} style={{ borderColor: col.border, background: col.bg }}>
                {/* Column header */}
                <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: col.border }}>
                  <span
                    className="inline-block size-2 rounded-full"
                    style={{ background: col.color, boxShadow: `0 0 6px ${col.color}` }}
                  />
                  <span className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: col.color }}>
                    {col.label}
                  </span>
                  <span
                    className="ml-auto flex size-5 items-center justify-center rounded-full text-[10px] font-bold"
                    style={{ background: `${col.color}20`, color: col.color }}
                  >
                    {colMesas.length}
                  </span>
                </div>

                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="flex flex-col gap-2.5 p-3 min-h-[180px] rounded-b-2xl transition-colors duration-200"
                      style={{
                        background: snapshot.isDraggingOver ? `${col.color}0a` : 'transparent',
                        outline: snapshot.isDraggingOver ? `1.5px dashed ${col.color}55` : '1.5px dashed transparent',
                      }}
                    >
                      {colMesas.length === 0 && !snapshot.isDraggingOver && (
                        <p className="text-center text-xs text-[var(--text-muted)] pt-8">Arraste uma mesa aqui</p>
                      )}
                      {colMesas.map((mesa, i) => (
                        <MesaRectCard
                          colColor={col.color}
                          comanda={resolveMesaComanda(mesa, comandaById)}
                          index={i}
                          key={mesa.id}
                          mesa={mesa}
                          onClickLivre={onClickLivre}
                          onClickOcupada={onClickOcupada}
                        />
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            )
          })}
        </div>
      </div>
    </DragDropContext>
  )
}
