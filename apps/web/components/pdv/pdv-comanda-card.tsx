'use client'

import { type CSSProperties, memo, type ReactNode, useMemo } from 'react'
import { Draggable, type DraggableStateSnapshot } from '@hello-pangea/dnd'
import { Clock, Package, Percent, User } from 'lucide-react'
import { formatCurrency } from '@/lib/currency'
import {
  calcTotal,
  type Comanda,
  countComandaItems,
  formatElapsed,
  isEndedComandaStatus,
  type KanbanColumn,
} from './pdv-types'

type PdvComandaCardProps = Readonly<{
  column: KanbanColumn
  comanda: Comanda
  index: number
  onClick: (comanda: Comanda) => void
}>

type ComandaCardModel = ReturnType<typeof buildComandaCardModel>

export const PdvComandaCard = memo(function PdvComandaCard({ column, comanda, index, onClick }: PdvComandaCardProps) {
  const model = useMemo(() => buildComandaCardModel(comanda), [comanda])

  return (
    <Draggable draggableId={comanda.id} index={index} isDragDisabled={model.isEnded}>
      {(provided, snapshot) => {
        const shellStyle = buildDragShellStyle(provided.draggableProps.style, snapshot)

        return (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className="group cursor-pointer select-none will-change-transform"
            style={shellStyle}
          >
            <ComandaCardButton column={column} comanda={comanda} model={model} snapshot={snapshot} onClick={onClick} />
          </div>
        )
      }}
    </Draggable>
  )
})

function ComandaCardButton({
  column,
  comanda,
  model,
  snapshot,
  onClick,
}: Readonly<{
  column: KanbanColumn
  comanda: Comanda
  model: ComandaCardModel
  snapshot: DraggableStateSnapshot
  onClick: (comanda: Comanda) => void
}>) {
  return (
    <button
      className={cardButtonClassName}
      style={buildCardStyle(column, snapshot)}
      type="button"
      onClick={() => onClick(comanda)}
    >
      <ComandaCardHeader column={column} model={model} />
      <ComandaCardCustomer customerName={comanda.clienteNome} />
      <ComandaCardMetrics model={model} />
      <ComandaCardAdjustments comanda={comanda} />
    </button>
  )
}

function ComandaCardHeader({ column, model }: Readonly<{ column: KanbanColumn; model: ComandaCardModel }>) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className="mt-0.5 inline-block size-2 shrink-0 rounded-full" style={{ background: column.dotColor }} />
        <span className="text-sm font-semibold text-[var(--text-primary)]">{model.title}</span>
      </div>
      <span className="text-sm font-bold" style={{ color: column.dotColor }}>
        {model.formattedTotal}
      </span>
    </div>
  )
}

function ComandaCardCustomer({ customerName }: Readonly<{ customerName?: string }>) {
  if (!customerName) {
    return null
  }

  return (
    <div className="mt-2 flex items-center gap-1.5">
      <User className="size-3 text-[var(--text-soft)]" />
      <span className="truncate text-xs text-[var(--text-soft)]">{customerName}</span>
    </div>
  )
}

function ComandaCardMetrics({ model }: Readonly<{ model: ComandaCardModel }>) {
  return (
    <div className="mt-3 flex items-center justify-between">
      <ComandaInlineMetric icon={<Package className="size-3 text-[var(--text-soft)]" />} value={model.itemLabel} />
      <ComandaInlineMetric
        className={model.elapsedClassName}
        icon={<Clock className="size-3" />}
        value={model.elapsed}
      />
    </div>
  )
}

function ComandaInlineMetric({
  className = 'text-[var(--text-soft)]',
  icon,
  value,
}: Readonly<{ className?: string; icon: ReactNode; value: string }>) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {icon}
      <span className="text-xs font-medium">{value}</span>
    </div>
  )
}

function ComandaCardAdjustments({ comanda }: Readonly<{ comanda: Comanda }>) {
  if (comanda.desconto <= 0 && comanda.acrescimo <= 0) {
    return null
  }

  return (
    <div className="mt-3 flex gap-1.5">
      {comanda.desconto > 0 ? <AdjustmentBadge tone="success" value={`-${comanda.desconto}%`} /> : null}
      {comanda.acrescimo > 0 ? <AdjustmentBadge tone="warning" value={`+${comanda.acrescimo}%`} /> : null}
    </div>
  )
}

function AdjustmentBadge({ tone, value }: Readonly<{ tone: 'success' | 'warning'; value: string }>) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-[var(--${tone})]`}
      style={{ backgroundColor: `color-mix(in srgb, var(--${tone}) 12%, transparent)` }}
    >
      <Percent className="size-2.5" />
      {value}
    </span>
  )
}

function buildComandaCardModel(comanda: Comanda) {
  const isEnded = isEndedComandaStatus(comanda.status)
  const isOld = Date.now() - comanda.abertaEm.getTime() > 30 * 60 * 1000
  const itemCount = countComandaItems(comanda)

  return {
    elapsed: formatElapsed(comanda.abertaEm),
    elapsedClassName: isOld && !isEnded ? 'text-[var(--warning)]' : 'text-[var(--text-soft)]',
    formattedTotal: formatCurrency(calcTotal(comanda), 'BRL'),
    isEnded,
    itemLabel: `${itemCount} ${itemCount === 1 ? 'item' : 'itens'}`,
    title: comanda.mesa ? `Mesa ${comanda.mesa}` : `#${comanda.id.slice(-4).toUpperCase()}`,
  }
}

function buildDragShellStyle(draggableStyle: CSSProperties | undefined, snapshot: DraggableStateSnapshot) {
  return {
    ...draggableStyle,
    willChange: snapshot.isDragging ? 'transform' : undefined,
  }
}

function buildCardStyle(column: KanbanColumn, snapshot: DraggableStateSnapshot) {
  return {
    background: snapshot.isDragging ? 'var(--surface-soft)' : 'var(--surface)',
    borderColor: snapshot.isDragging ? column.borderColor : 'var(--border)',
    boxShadow: snapshot.isDragging ? 'var(--shadow-panel)' : 'none',
  }
}

const cardButtonClassName =
  'w-full rounded-[18px] border bg-[var(--surface)] p-4 text-left transition-all duration-200 hover:border-[var(--border-strong)] hover:bg-[var(--surface-soft)]'
