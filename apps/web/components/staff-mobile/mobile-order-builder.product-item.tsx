'use client'

import { memo } from 'react'
import { ProductThumb } from '@/components/shared/product-thumb'
import { formatBRL as formatCurrency } from '@/lib/currency'
import type { ProductRecord } from '@contracts/contracts'
import { Minus, Plus } from 'lucide-react'

function ComboDetails({ produto }: Readonly<{ produto: ProductRecord }>) {
  if (!produto.isCombo) {
    return null
  }

  return (
    <>
      <span className="mt-1 inline-flex rounded-full border border-[rgba(0,140,255,0.35)] bg-[rgba(0,140,255,0.14)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--accent,#008cff)]">
        combo
      </span>
      {produto.comboDescription ? (
        <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-[var(--accent,#008cff)]">
          {produto.comboDescription}
        </p>
      ) : null}
      {(produto.comboItems?.length ?? 0) > 0 ? (
        <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-[var(--text-soft,#7a8896)]">
          {produto.comboItems
            ?.slice(0, 2)
            .map((item) => `${item.componentProductName} (${item.totalUnits} und)`)
            .join(' • ')}
          {(produto.comboItems?.length ?? 0) > 2 ? ' • ...' : ''}
        </p>
      ) : null}
    </>
  )
}

function QuantityControls({
  busy,
  onAdd,
  onRemove,
  produto,
  qty,
}: Readonly<{
  busy?: boolean
  onAdd: () => void
  onRemove: () => void
  produto: ProductRecord
  qty: number
}>) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      {qty > 0 ? (
        <>
          <button
            aria-label={`Remover ${produto.name}`}
            className="btn-haptic flex size-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-soft,#7a8896)] transition-colors active:bg-[var(--surface-soft)]"
            disabled={busy}
            type="button"
            onClick={onRemove}
          >
            <Minus className="size-4" />
          </button>
          <span className="min-w-[24px] text-center text-sm font-semibold text-[var(--text-primary)]">{qty}</span>
        </>
      ) : null}
      <button
        aria-label={`Adicionar ${produto.name}`}
        className="btn-haptic flex size-11 items-center justify-center rounded-xl border border-[rgba(0,140,255,0.3)] bg-[rgba(0,140,255,0.12)] text-[var(--accent,#008cff)] transition-colors active:bg-[rgba(0,140,255,0.25)]"
        disabled={busy}
        type="button"
        onClick={onAdd}
      >
        <Plus className="size-4" />
      </button>
    </div>
  )
}

export const MobileOrderProductItem = memo(function MobileOrderProductItem({
  busy,
  onAdd,
  onRemove,
  produto,
  qty,
}: Readonly<{
  busy?: boolean
  onAdd: () => void
  onRemove: () => void
  produto: ProductRecord
  qty: number
}>) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <ProductThumb product={produto} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--text-primary)]">{produto.name}</p>
        <p className="mt-0.5 text-xs text-[var(--text-soft,#7a8896)]">
          {produto.category} · {formatCurrency(produto.unitPrice)}
        </p>
        <ComboDetails produto={produto} />
      </div>
      <QuantityControls busy={busy} produto={produto} qty={qty} onAdd={onAdd} onRemove={onRemove} />
    </div>
  )
})
