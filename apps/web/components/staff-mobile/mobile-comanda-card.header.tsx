import { Edit2, Trash2 } from 'lucide-react'
import { formatBRL as formatCurrency } from '@/lib/currency'
import type { Comanda } from '@/components/pdv/pdv-types'
import type { StatusConfig } from './mobile-comanda-list.types'

export function MobileComandaCardHeader({
  config,
  isFocused,
  isOwnedByCurrentEmployee,
  itemCount,
  mesaLabel,
  onCollapse,
  primaryWaiterName,
  total,
}: Readonly<{
  config: StatusConfig
  isFocused: boolean
  isOwnedByCurrentEmployee: boolean
  itemCount: number
  mesaLabel: string
  onCollapse?: () => void
  primaryWaiterName: string | null
  total: number
}>) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <CardTitleRow config={config} mesaLabel={mesaLabel} />
        <WaiterBadge isOwnedByCurrentEmployee={isOwnedByCurrentEmployee} primaryWaiterName={primaryWaiterName} />
        <p className="text-xs text-[var(--text-soft,#7a8896)]">
          {itemCount} {itemCount === 1 ? 'item' : 'itens'}
        </p>
      </div>
      <CardTotalBlock isFocused={isFocused} total={total} onCollapse={onCollapse} />
    </div>
  )
}

function CardTitleRow({
  config,
  mesaLabel,
}: Readonly<{
  config: StatusConfig
  mesaLabel: string
}>) {
  return (
    <div className="mb-1 flex items-center gap-2">
      <span className="text-xl font-bold tracking-tight text-[var(--text-primary)]">{mesaLabel}</span>
      <StatusChip config={config} />
    </div>
  )
}

function StatusChip({
  config,
}: Readonly<{
  config: StatusConfig
}>) {
  return (
    <span
      className="rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em]"
      style={{
        backgroundColor: config.chipBg,
        borderColor: `${config.chipColor}33`,
        color: config.chipColor,
      }}
    >
      {config.label}
    </span>
  )
}

function CardTotalBlock({
  isFocused,
  onCollapse,
  total,
}: Readonly<{
  isFocused: boolean
  onCollapse?: () => void
  total: number
}>) {
  return (
    <div className="shrink-0 text-right">
      <span className="text-lg font-bold tracking-tight text-[var(--text-primary)]">{formatCurrency(total)}</span>
      {isFocused && onCollapse ? (
        <button
          className="mt-2 block text-[10px] text-[var(--text-soft)] underline underline-offset-2"
          type="button"
          onClick={onCollapse}
        >
          Recolher
        </button>
      ) : null}
    </div>
  )
}

function WaiterBadge({
  isOwnedByCurrentEmployee,
  primaryWaiterName,
}: Readonly<{
  isOwnedByCurrentEmployee: boolean
  primaryWaiterName: string | null
}>) {
  return (
    <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
      <span
        className="rounded-full border px-2 py-0.5 text-[9px] font-semibold tracking-[0.08em]"
        style={{
          backgroundColor: isOwnedByCurrentEmployee ? 'rgba(54,245,124,0.12)' : 'rgba(122,136,150,0.1)',
          borderColor: isOwnedByCurrentEmployee ? 'rgba(54,245,124,0.22)' : 'var(--border)',
          color: isOwnedByCurrentEmployee ? '#36f57c' : 'var(--text-soft,#7a8896)',
        }}
      >
        {resolveWaiterLabel({ isOwnedByCurrentEmployee, primaryWaiterName })}
      </span>
    </div>
  )
}

function resolveWaiterLabel({
  isOwnedByCurrentEmployee,
  primaryWaiterName,
}: Readonly<{
  isOwnedByCurrentEmployee: boolean
  primaryWaiterName: string | null
}>) {
  if (isOwnedByCurrentEmployee) {
    return 'Sua mesa'
  }
  if (primaryWaiterName) {
    return `Responsável ${primaryWaiterName}`
  }
  return 'Sem responsável'
}

export function MobileComandaCardMeta({
  clientName,
  elapsed,
}: Readonly<{
  clientName: string | null | undefined
  elapsed: string
}>) {
  return (
    <>
      {clientName ? (
        <p className="mb-0.5 truncate text-sm font-medium text-[var(--text-primary)]">{clientName}</p>
      ) : null}
      <p className="flex items-center gap-1.5 text-xs text-[var(--text-soft,#7a8896)] opacity-80">
        <span>há {elapsed}</span>
      </p>
    </>
  )
}

export function MobileComandaActionStrip({
  canAddItems,
  comanda,
  isBusy,
  onAddItems,
  onCancelComanda,
}: Readonly<{
  canAddItems: boolean
  comanda: Comanda
  isBusy: boolean
  onAddItems?: (comanda: Comanda) => void
  onCancelComanda?: (id: string) => Promise<void> | void
}>) {
  return (
    <div className="mb-5 flex gap-2">
      {onAddItems && canAddItems ? (
        <button
          className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border border-[rgba(0,140,255,0.3)] bg-[rgba(0,140,255,0.1)] px-4 py-3 text-sm font-semibold text-[var(--accent,#008cff)] transition-all active:scale-95 disabled:opacity-50"
          disabled={isBusy}
          type="button"
          onClick={() => onAddItems(comanda)}
        >
          <Edit2 className="size-4" />
          Itens
        </button>
      ) : null}
      {onCancelComanda ? (
        <CancelComandaButton comandaId={comanda.id} isBusy={isBusy} onCancelComanda={onCancelComanda} />
      ) : null}
    </div>
  )
}

function CancelComandaButton({
  comandaId,
  isBusy,
  onCancelComanda,
}: Readonly<{
  comandaId: string
  isBusy: boolean
  onCancelComanda: (id: string) => Promise<void> | void
}>) {
  return (
    <button
      aria-label="Cancelar comanda"
      className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.08)] text-[#f87171] transition-all active:scale-95 disabled:opacity-50"
      disabled={isBusy}
      type="button"
      onClick={() => {
        if (window.confirm('Tem certeza que deseja cancelar esta comanda inteira?')) {
          void onCancelComanda(comandaId)
        }
      }}
    >
      <Trash2 className="size-4.5" />
    </button>
  )
}
