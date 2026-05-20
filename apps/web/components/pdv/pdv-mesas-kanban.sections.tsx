'use client'

import { Droppable } from '@hello-pangea/dnd'
import { Plus } from 'lucide-react'
import type { Comanda, Mesa, MesaStatus } from './pdv-types'
import { MesaRectCard, MesaSquare } from './pdv-mesas-kanban.cards'

export const KANBAN_COLUMNS = [
  {
    id: 'ocupada' as MesaStatus,
    label: 'Ocupada',
    color: '#f87171',
    bg: 'rgba(248,113,113,0.06)',
    border: 'rgba(248,113,113,0.22)',
  },
  {
    id: 'reservada' as MesaStatus,
    label: 'Reservada',
    color: '#60a5fa',
    bg: 'rgba(96,165,250,0.06)',
    border: 'rgba(96,165,250,0.22)',
  },
] as const

type MesaClickHandlers = Readonly<{
  onClickLivre: (mesa: Mesa) => void
  onClickOcupada: (comanda: Comanda) => void
}>

export function FreeMesaPool({
  livres,
  onAddMesa,
  ...handlers
}: Readonly<{ livres: Mesa[]; onAddMesa: () => void } & MesaClickHandlers>) {
  return (
    <div className="rounded-2xl border p-4" style={freePoolStyle}>
      <FreeMesaPoolHeader onAddMesa={onAddMesa} />
      <Droppable direction="horizontal" droppableId="livre">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex min-h-[88px] flex-wrap gap-3 rounded-xl p-1 transition-colors duration-200"
            style={buildFreeDropAreaStyle(snapshot.isDraggingOver)}
          >
            <FreeMesaDropAreaContent handlers={handlers} isDraggingOver={snapshot.isDraggingOver} livres={livres} />
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  )
}

export function MesaStatusColumns({
  comandaById,
  mesasByStatus,
  ...handlers
}: Readonly<
  {
    comandaById: ReadonlyMap<string, Comanda>
    mesasByStatus: Record<(typeof KANBAN_COLUMNS)[number]['id'], Mesa[]>
  } & MesaClickHandlers
>) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {KANBAN_COLUMNS.map((column) => (
        <MesaStatusColumn
          column={column}
          comandaById={comandaById}
          handlers={handlers}
          key={column.id}
          mesas={mesasByStatus[column.id]}
        />
      ))}
    </div>
  )
}

function FreeMesaPoolHeader({ onAddMesa }: Readonly<{ onAddMesa: () => void }>) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="inline-block size-2 rounded-full" style={freeDotStyle} />
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
  )
}

function FreeMesaDropAreaContent({
  handlers,
  isDraggingOver,
  livres,
}: Readonly<{
  handlers: MesaClickHandlers
  isDraggingOver: boolean
  livres: Mesa[]
}>) {
  return (
    <>
      {livres.length === 0 && !isDraggingOver ? (
        <p className="self-center pl-1 text-xs text-[var(--text-muted)]">Todas as mesas estão ocupadas ou reservadas</p>
      ) : null}
      {livres.map((mesa, index) => (
        <MesaSquare index={index} key={mesa.id} mesa={mesa} {...handlers} />
      ))}
    </>
  )
}

function MesaStatusColumn({
  column,
  comandaById,
  handlers,
  mesas,
}: Readonly<{
  column: (typeof KANBAN_COLUMNS)[number]
  comandaById: ReadonlyMap<string, Comanda>
  handlers: MesaClickHandlers
  mesas: Mesa[]
}>) {
  return (
    <div className="rounded-2xl border" style={buildColumnShellStyle(column)}>
      <MesaStatusColumnHeader column={column} count={mesas.length} />
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex min-h-[180px] flex-col gap-2.5 rounded-b-2xl p-3 transition-colors duration-200"
            style={buildColumnDropAreaStyle(column.color, snapshot.isDraggingOver)}
          >
            <MesaColumnDropAreaContent
              column={column}
              comandaById={comandaById}
              handlers={handlers}
              isDraggingOver={snapshot.isDraggingOver}
              mesas={mesas}
            />
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  )
}

function MesaStatusColumnHeader({
  column,
  count,
}: Readonly<{ column: (typeof KANBAN_COLUMNS)[number]; count: number }>) {
  return (
    <div className="flex items-center gap-2 border-b px-4 py-3" style={buildColumnHeaderStyle(column)}>
      <span className="inline-block size-2 rounded-full" style={buildColumnDotStyle(column.color)} />
      <span className="text-xs font-bold uppercase tracking-[0.2em]" style={buildColorStyle(column.color)}>
        {column.label}
      </span>
      <span
        className="ml-auto flex size-5 items-center justify-center rounded-full text-[10px] font-bold"
        style={buildCounterStyle(column.color)}
      >
        {count}
      </span>
    </div>
  )
}

function MesaColumnDropAreaContent({
  column,
  comandaById,
  handlers,
  isDraggingOver,
  mesas,
}: Readonly<{
  column: (typeof KANBAN_COLUMNS)[number]
  comandaById: ReadonlyMap<string, Comanda>
  handlers: MesaClickHandlers
  isDraggingOver: boolean
  mesas: Mesa[]
}>) {
  return (
    <>
      {mesas.length === 0 && !isDraggingOver ? (
        <p className="pt-8 text-center text-xs text-[var(--text-muted)]">Arraste uma mesa aqui</p>
      ) : null}
      {mesas.map((mesa, index) => (
        <MesaRectCard
          colColor={column.color}
          comanda={resolveMesaComanda(mesa, comandaById)}
          index={index}
          key={mesa.id}
          mesa={mesa}
          {...handlers}
        />
      ))}
    </>
  )
}

function resolveMesaComanda(mesa: Mesa, comandaById: ReadonlyMap<string, Comanda>) {
  return mesa.comandaId ? comandaById.get(mesa.comandaId) : undefined
}

function buildColumnShellStyle(column: (typeof KANBAN_COLUMNS)[number]) {
  return {
    background: column.bg,
    borderColor: column.border,
  }
}

function buildColumnHeaderStyle(column: (typeof KANBAN_COLUMNS)[number]) {
  return {
    borderColor: column.border,
  }
}

function buildColumnDotStyle(color: string) {
  return {
    background: color,
    boxShadow: `0 0 6px ${color}`,
  }
}

function buildCounterStyle(color: string) {
  return {
    background: `${color}20`,
    color,
  }
}

function buildFreeDropAreaStyle(isDraggingOver: boolean) {
  return {
    background: isDraggingOver ? 'rgba(54,245,124,0.06)' : 'transparent',
    outline: isDraggingOver ? '1.5px dashed rgba(54,245,124,0.4)' : '1.5px dashed transparent',
  }
}

function buildColumnDropAreaStyle(color: string, isDraggingOver: boolean) {
  return {
    background: isDraggingOver ? `${color}0a` : 'transparent',
    outline: isDraggingOver ? `1.5px dashed ${color}55` : '1.5px dashed transparent',
  }
}

function buildColorStyle(color: string) {
  return { color }
}

const freePoolStyle = {
  background: 'rgba(54,245,124,0.03)',
  borderColor: 'rgba(54,245,124,0.25)',
}

const freeDotStyle = {
  background: '#36f57c',
  boxShadow: '0 0 6px #36f57c',
}
