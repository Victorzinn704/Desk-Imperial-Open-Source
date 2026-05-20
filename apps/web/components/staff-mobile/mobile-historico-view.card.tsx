'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { calcSubtotal, calcTotal, type Comanda, formatElapsed } from '@/components/pdv/pdv-types'
import { formatBRL as formatCurrency } from '@/lib/currency'
import { MOBILE_HISTORICO_STATUS_BADGE } from './mobile-historico-view.helpers'

export function MobileHistoricoCard({
  comanda,
}: Readonly<{
  comanda: Comanda
}>) {
  const [open, setOpen] = useState(false)
  const total = calcTotal(comanda)
  const subtotal = calcSubtotal(comanda)
  const descontoVal = subtotal * (comanda.desconto / 100)
  const acrescimoVal = subtotal * (comanda.acrescimo / 100)
  const badge = MOBILE_HISTORICO_STATUS_BADGE[comanda.status] ?? MOBILE_HISTORICO_STATUS_BADGE.aberta
  const itemCount = comanda.itens.reduce((sum, item) => sum + item.quantidade, 0)

  return (
    <li>
      <HistoricoCardTrigger
        badge={badge}
        comanda={comanda}
        isOpen={open}
        itemCount={itemCount}
        total={total}
        onToggle={() => setOpen((value) => !value)}
      />
      {open ? (
        <HistoricoCardDetails
          acrescimoVal={acrescimoVal}
          badgeColor={badge.color}
          comanda={comanda}
          descontoVal={descontoVal}
          subtotal={subtotal}
          total={total}
        />
      ) : null}
    </li>
  )
}

// eslint-disable-next-line max-lines-per-function
function HistoricoCardTrigger({
  badge,
  comanda,
  isOpen,
  itemCount,
  onToggle,
  total,
}: Readonly<{
  badge: { bg: string; color: string; label: string }
  comanda: Comanda
  isOpen: boolean
  itemCount: number
  onToggle: () => void
  total: number
}>) {
  return (
    <button
      className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors active:bg-[var(--surface-muted)]"
      style={{ WebkitTapHighlightColor: 'transparent' }}
      type="button"
      onClick={onToggle}
    >
      <div className="min-w-0">
        <div className="mb-1 flex items-center gap-2">
          <p className="text-sm font-semibold text-[var(--text-primary)]">Mesa {comanda.mesa ?? '—'}</p>
          <span
            className="rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em]"
            style={{ background: badge.bg, color: badge.color }}
          >
            {badge.label}
          </span>
        </div>
        <p className="text-xs text-[var(--text-soft,#7a8896)]">
          {resolveHistoricoItemLabel(itemCount)} · há {formatElapsed(comanda.abertaEm)}
        </p>
        <p className="mt-1 text-[11px] text-[var(--text-soft,#7a8896)]">
          {comanda.garcomNome ? `Garçom ${comanda.garcomNome}` : 'Garçom não identificado'}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft,#7a8896)]">
            Total final
          </p>
          <span className="text-sm font-bold" style={{ color: badge.color }}>
            {formatCurrency(total)}
          </span>
        </div>
        {isOpen ? (
          <ChevronDown className="size-4 text-[var(--text-soft,#7a8896)]" />
        ) : (
          <ChevronRight className="size-4 text-[var(--text-soft,#7a8896)]" />
        )}
      </div>
    </button>
  )
}

function resolveHistoricoItemLabel(itemCount: number) {
  if (itemCount > 0) {
    return `${itemCount} ${itemCount === 1 ? 'item' : 'itens'}`
  }
  return 'Extrato resumido'
}

function HistoricoCardDetails({
  acrescimoVal,
  badgeColor,
  comanda,
  descontoVal,
  subtotal,
  total,
}: Readonly<{
  acrescimoVal: number
  badgeColor: string
  comanda: Comanda
  descontoVal: number
  subtotal: number
  total: number
}>) {
  return (
    <div className="border-t border-[var(--border)] px-4 pb-4 pt-4">
      <HistoricoItemsList items={comanda.itens} />
      <HistoricoTotals
        acrescimoPercent={comanda.acrescimo}
        acrescimoVal={acrescimoVal}
        badgeColor={badgeColor}
        descontoPercent={comanda.desconto}
        descontoVal={descontoVal}
        garcomNome={comanda.garcomNome}
        subtotal={subtotal}
        total={total}
      />
    </div>
  )
}

function HistoricoItemsList({
  items,
}: Readonly<{
  items: Comanda['itens']
}>) {
  if (items.length === 0) {
    return (
      <div className="mb-4 px-1 py-2 text-xs text-[var(--text-soft,#7a8896)]">
        Nenhum item detalhado nesta visualização. Totais mantidos pelo backend.
      </div>
    )
  }

  return (
    <ul className="mb-4 divide-y divide-[var(--border)]">
      {items.map((item, index) => (
        <li className="flex items-start justify-between gap-3 py-3" key={`${item.produtoId}-${index}`}>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
              {item.quantidade}× {item.nome}
            </p>
            {item.observacao ? (
              <p className="mt-1 text-[11px] italic text-[var(--text-soft,#7a8896)]">{`"${item.observacao}"`}</p>
            ) : null}
          </div>
          <span className="shrink-0 text-sm font-semibold text-[var(--text-primary)]">
            {formatCurrency(item.quantidade * item.precoUnitario)}
          </span>
        </li>
      ))}
    </ul>
  )
}

function HistoricoTotals({
  acrescimoPercent,
  acrescimoVal,
  badgeColor,
  descontoPercent,
  descontoVal,
  garcomNome,
  subtotal,
  total,
}: Readonly<{
  acrescimoPercent: number
  acrescimoVal: number
  badgeColor: string
  descontoPercent: number
  descontoVal: number
  garcomNome?: string | null
  subtotal: number
  total: number
}>) {
  return (
    <div className="space-y-2 text-xs">
      <HistoricoMetric label="Garçom" value={garcomNome ?? 'Não identificado'} />
      <HistoricoMetric label="Subtotal" value={formatCurrency(subtotal)} />
      {descontoPercent > 0 ? (
        <HistoricoDeltaRow
          label={`Desconto (${descontoPercent}%)`}
          tone="#f87171"
          value={`– ${formatCurrency(descontoVal)}`}
        />
      ) : null}
      {acrescimoPercent > 0 ? (
        <HistoricoDeltaRow
          label={`Serviço (${acrescimoPercent}%)`}
          tone="#fb923c"
          value={`+ ${formatCurrency(acrescimoVal)}`}
        />
      ) : null}
      <div className="flex justify-between border-t border-[var(--border)] pt-3 font-semibold text-[var(--text-primary)]">
        <span>Total final</span>
        <span style={{ color: badgeColor }}>{formatCurrency(total)}</span>
      </div>
    </div>
  )
}

function HistoricoMetric({
  label,
  value,
}: Readonly<{
  label: string
  value: string
}>) {
  return (
    <div className="flex justify-between text-[var(--text-soft,#7a8896)]">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

function HistoricoDeltaRow({
  label,
  tone,
  value,
}: Readonly<{
  label: string
  tone: string
  value: string
}>) {
  return (
    <div className="flex justify-between" style={{ color: tone }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}
