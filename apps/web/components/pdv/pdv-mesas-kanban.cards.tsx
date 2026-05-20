'use client'

import { type CSSProperties, memo, useCallback } from 'react'
import { Draggable } from '@hello-pangea/dnd'
import { Users } from 'lucide-react'
import { formatCurrency } from '@/lib/currency'
import { calcTotal, type Comanda, countComandaItems, formatElapsed, type Mesa } from './pdv-types'

type MesaClickHandlers = Readonly<{
  onClickLivre: (mesa: Mesa) => void
  onClickOcupada: (comanda: Comanda) => void
}>

export const MesaSquare = memo(function MesaSquare({
  mesa,
  comanda,
  index,
  onClickLivre,
  onClickOcupada,
}: Readonly<{ comanda?: Comanda; index: number; mesa: Mesa } & MesaClickHandlers>) {
  const handleClick = useMesaClickHandler({ comanda, mesa, onClickLivre, onClickOcupada })

  return (
    <Draggable draggableId={mesa.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className="select-none cursor-grab active:cursor-grabbing"
          style={buildSquareShellStyle(provided.draggableProps.style, snapshot.isDragging)}
        >
          <button
            className="flex h-[76px] w-[76px] flex-col items-center justify-center rounded-xl border bg-transparent transition-all duration-200 hover:scale-105 hover:shadow-lg"
            style={buildSquareButtonStyle(snapshot.isDragging)}
            type="button"
            onClick={handleClick}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[rgba(54,245,124,0.6)]">Mesa</p>
            <p className="mt-0.5 text-2xl font-bold leading-none text-[var(--text-primary)]">{mesa.numero}</p>
            <MesaCapacity capacidade={mesa.capacidade} color="rgba(54,245,124,0.55)" />
          </button>
        </div>
      )}
    </Draggable>
  )
})

export const MesaRectCard = memo(function MesaRectCard({
  mesa,
  comanda,
  index,
  colColor,
  onClickLivre,
  onClickOcupada,
}: Readonly<{ colColor: string; comanda?: Comanda; index: number; mesa: Mesa } & MesaClickHandlers>) {
  const handleClick = useMesaClickHandler({ comanda, mesa, onClickLivre, onClickOcupada })

  return (
    <Draggable draggableId={mesa.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className="select-none cursor-grab active:cursor-grabbing"
          style={provided.draggableProps.style}
        >
          <button
            className="w-full rounded-xl border bg-transparent p-3 text-left transition-all duration-200 hover:-translate-y-0.5"
            style={buildRectButtonStyle(colColor, snapshot.isDragging)}
            type="button"
            onClick={handleClick}
          >
            <MesaRectHeader colColor={colColor} mesa={mesa} />
            <MesaRectStatus colColor={colColor} comanda={comanda} mesa={mesa} />
          </button>
        </div>
      )}
    </Draggable>
  )
})

function MesaRectHeader({ colColor, mesa }: Readonly<{ colColor: string; mesa: Mesa }>) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[9px] font-semibold uppercase tracking-[0.18em]" style={buildColorStyle(`${colColor}99`)}>
          Mesa
        </p>
        <p className="text-xl font-bold leading-none text-[var(--text-primary)]">{mesa.numero}</p>
      </div>
      <MesaCapacity capacidade={mesa.capacidade} color={`${colColor}88`} />
    </div>
  )
}

function MesaRectStatus({ colColor, comanda, mesa }: Readonly<{ colColor: string; comanda?: Comanda; mesa: Mesa }>) {
  if (mesa.status === 'ocupada' && comanda) {
    return <MesaOccupancySummary colColor={colColor} comanda={comanda} />
  }

  return mesa.status === 'reservada' ? (
    <p className="mt-1.5 text-[10px]" style={buildColorStyle(`${colColor}88`)}>
      Clique para abrir comanda
    </p>
  ) : null
}

function MesaOccupancySummary({ colColor, comanda }: Readonly<{ colColor: string; comanda: Comanda }>) {
  return (
    <div className="mt-2 space-y-0.5 rounded-lg px-2 py-1.5" style={occupiedSummaryStyle}>
      {comanda.clienteNome ? (
        <p className="truncate text-[11px] font-medium text-[var(--text-primary)]">{comanda.clienteNome}</p>
      ) : null}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[var(--text-soft)]">
          {formatItemCountLabel(comanda)} · {formatElapsed(comanda.abertaEm)}
        </span>
        <span className="text-[11px] font-bold" style={buildColorStyle(colColor)}>
          {formatCurrency(calcTotal(comanda), 'BRL')}
        </span>
      </div>
    </div>
  )
}

function MesaCapacity({ capacidade, color }: Readonly<{ capacidade: number; color: string }>) {
  return (
    <div className="mt-1 flex items-center gap-0.5 text-[9px]" style={buildColorStyle(color)}>
      <Users className="size-2.5" />
      <span>{capacidade}</span>
    </div>
  )
}

function useMesaClickHandler({
  comanda,
  mesa,
  onClickLivre,
  onClickOcupada,
}: { comanda?: Comanda; mesa: Mesa } & MesaClickHandlers) {
  return useCallback(() => {
    if (mesa.status === 'livre' || mesa.status === 'reservada') {
      onClickLivre(mesa)
      return
    }

    if (mesa.status === 'ocupada' && comanda) {
      onClickOcupada(comanda)
    }
  }, [comanda, mesa, onClickLivre, onClickOcupada])
}

function buildSquareShellStyle(draggableStyle: CSSProperties | undefined, isDragging: boolean) {
  return {
    ...draggableStyle,
    opacity: isDragging ? 0.85 : 1,
  }
}

function buildSquareButtonStyle(isDragging: boolean) {
  return {
    background: 'rgba(54,245,124,0.06)',
    borderColor: isDragging ? '#36f57c' : 'rgba(54,245,124,0.3)',
    boxShadow: isDragging ? '0 0 20px rgba(54,245,124,0.25)' : undefined,
  }
}

function buildRectButtonStyle(colColor: string, isDragging: boolean) {
  return {
    background: isDragging ? `${colColor}18` : `${colColor}0a`,
    borderColor: isDragging ? colColor : `${colColor}44`,
    boxShadow: isDragging ? `0 8px 24px ${colColor}22` : undefined,
  }
}

function buildColorStyle(color: string) {
  return { color }
}

const occupiedSummaryStyle = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.06)',
}

function formatItemCountLabel(comanda: Comanda) {
  const itemCount = countComandaItems(comanda)
  return `${itemCount} ${itemCount === 1 ? 'item' : 'itens'}`
}
