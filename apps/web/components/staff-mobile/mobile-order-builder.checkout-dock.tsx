'use client'

import { ShoppingCart } from 'lucide-react'
import { formatBRL as formatCurrency } from '@/lib/currency'
import type { MobileOrderBuilderProps } from './mobile-order-builder.types'

function getCompactLabel(label: string) {
  const normalized = label.toLowerCase()
  if (normalized.includes('salvar')) {
    return 'Salvar'
  }
  if (normalized.includes('adicionar')) {
    return 'Adicionar'
  }
  return 'Abrir'
}

function getHelper(mode: MobileOrderBuilderProps['mode']) {
  if (mode === 'edit') {
    return 'Salve sem rolar até o fim'
  }
  if (mode === 'add') {
    return 'Itens entram na comanda aberta'
  }
  return 'Abra a comanda sem rolar a lista'
}

function CartSummary({
  totalItems,
  totalValue,
  mode,
}: Readonly<{
  totalItems: number
  totalValue: number
  mode: MobileOrderBuilderProps['mode']
}>) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-[14px] bg-[var(--surface-muted)] px-3 py-2.5">
      <div className="relative shrink-0">
        <ShoppingCart className="size-5 text-[var(--accent,#008cff)]" />
        <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-[var(--accent,#008cff)] text-[10px] font-bold text-[var(--on-accent)]">
          {totalItems}
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft,#7a8896)]">
          {totalItems} {totalItems === 1 ? 'item' : 'itens'}
        </p>
        <p className="truncate text-base font-semibold text-[var(--text-primary)]">{formatCurrency(totalValue)}</p>
        <p className="mt-0.5 truncate text-[10px] text-[var(--text-soft,#7a8896)]">{getHelper(mode)}</p>
      </div>
    </div>
  )
}

function SubmitButton({
  busy,
  onSubmit,
  submitLabel,
}: Readonly<{
  busy?: boolean
  onSubmit: () => void
  submitLabel: string
}>) {
  return (
    <button
      aria-label={submitLabel}
      className="btn-haptic flex size-[68px] flex-col items-center justify-center rounded-[16px] bg-[var(--accent,#008cff)] px-2 py-2 text-center text-[11px] font-semibold text-[var(--on-accent)] transition-opacity disabled:opacity-40 active:opacity-80"
      disabled={busy}
      type="button"
      onClick={onSubmit}
    >
      <ShoppingCart className="size-5" />
      <span className="mt-1 leading-tight">{busy ? 'Enviando' : getCompactLabel(submitLabel)}</span>
    </button>
  )
}

export function MobileOrderCheckoutDock({
  busy,
  dockOffset = 'navigation',
  mode,
  onSubmit,
  submitLabel,
  totalItems,
  totalValue,
}: Readonly<{
  busy?: boolean
  dockOffset?: MobileOrderBuilderProps['checkoutDockOffset']
  mode: MobileOrderBuilderProps['mode']
  onSubmit: () => void
  submitLabel: string
  totalItems: number
  totalValue: number
}>) {
  if (totalItems === 0) {
    return null
  }

  const fixedOffsetClass =
    dockOffset === 'screen'
      ? 'bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))]'
      : 'bottom-[calc(5.3rem+env(safe-area-inset-bottom,0px))]'

  return (
    <div
      className={`fixed inset-x-3 ${fixedOffsetClass} z-40 md:static md:inset-auto md:z-auto md:shrink-0 md:border-t md:border-[rgba(0,140,255,0.2)] md:bg-[var(--bg)]/95 md:px-3 md:pb-3 md:pt-2 md:backdrop-blur`}
      data-testid="mobile-order-checkout-dock"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_4.25rem] gap-2 rounded-[18px] border border-[rgba(0,140,255,0.24)] bg-[var(--surface)] p-2 shadow-[0_-14px_34px_rgba(0,0,0,0.34)]">
        <CartSummary mode={mode} totalItems={totalItems} totalValue={totalValue} />
        <SubmitButton busy={busy} submitLabel={submitLabel} onSubmit={onSubmit} />
      </div>
    </div>
  )
}
