'use client'

import { DragDropContext, type DropResult } from '@hello-pangea/dnd'
import { ShoppingBag } from 'lucide-react'
import { PdvColumn } from './pdv-column'
import { type Comanda, KANBAN_COLUMNS } from './pdv-types'
import type { ComandasByStatus } from './pdv-board.types'

export function PdvBoardError({ message }: Readonly<{ message: string | null }>) {
  if (!message) {
    return null
  }

  return (
    <div
      className="rounded-[14px] border px-4 py-3 text-sm text-[var(--danger)]"
      style={{
        borderColor: 'color-mix(in srgb, var(--danger) 24%, var(--border))',
        backgroundColor: 'color-mix(in srgb, var(--danger) 10%, var(--surface))',
      }}
    >
      {message}
    </div>
  )
}

export function PdvBoardHeader({
  description,
  eyebrow,
  onNewComanda,
  title,
}: Readonly<{
  description: string
  eyebrow: string
  onNewComanda: () => void
  title: string
}>) {
  return (
    <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="text-[11px] tracking-[0.08em] text-[var(--text-muted)]">{eyebrow}</p>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
        <p className="max-w-2xl text-sm text-[var(--text-soft)]">{description}</p>
      </div>

      <button
        className="flex min-h-11 items-center justify-center gap-2 rounded-[14px] border px-4 py-2.5 text-sm font-semibold transition-colors"
        style={{
          background: 'color-mix(in srgb, var(--accent) 10%, var(--surface))',
          borderColor: 'color-mix(in srgb, var(--accent) 24%, var(--border))',
          color: 'var(--accent)',
        }}
        type="button"
        onClick={onNewComanda}
      >
        <ShoppingBag className="size-4" />
        Nova comanda
      </button>
    </div>
  )
}

export function PdvBoardKanban({
  comandasByStatus,
  onCardClick,
  onDragEnd,
}: Readonly<{
  comandasByStatus: ComandasByStatus
  onCardClick: (comanda: Comanda) => void
  onDragEnd: (result: DropResult) => void
}>) {
  return (
    <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4">
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {KANBAN_COLUMNS.map((column) => (
            <PdvColumn
              column={column}
              comandas={comandasByStatus[column.id]}
              key={column.id}
              onCardClick={onCardClick}
            />
          ))}
        </div>
      </DragDropContext>
    </div>
  )
}
