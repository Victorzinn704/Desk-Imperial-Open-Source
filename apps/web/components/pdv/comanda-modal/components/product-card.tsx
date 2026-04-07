'use client'

import { memo } from 'react'
import { formatCurrency } from '@/lib/currency'
import type { SimpleProduct } from '../types'

type ProductCardProps = {
  product: SimpleProduct
  inCartQty: number
  onAdd: () => void
  onDragStart: (e: React.DragEvent) => void
}

export const ProductCard = memo(function ProductCard({ product, inCartQty, onAdd, onDragStart }: ProductCardProps) {
  const initials = product.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]!.toUpperCase())
    .join('')

  const available = product.stock - inCartQty
  const stockColor =
    available <= 0
      ? '#f87171' // vermelho — esgotado
      : product.isLowStock || available <= 5
        ? '#f59e0b' // âmbar — baixo
        : 'var(--text-soft)' // cinza normal
  const stockLabel = available <= 0 ? 'Esgotado' : `${available} und`

  return (
    <button
      draggable
      className="group flex min-h-[96px] w-full flex-col justify-between rounded-[14px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-3 py-3 text-left transition-all hover:border-[rgba(52,242,127,0.22)] hover:bg-[rgba(52,242,127,0.04)] cursor-grab active:cursor-grabbing xl:min-h-0 xl:flex-row xl:items-center"
      type="button"
      onClick={onAdd}
      onDragStart={onDragStart}
    >
      <div className="flex items-start gap-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-[rgba(52,242,127,0.2)] bg-[rgba(52,242,127,0.08)] text-[11px] font-bold tracking-[0.08em] text-[#36f57c]">
          {initials || 'IT'}
        </span>
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)] line-clamp-2">{product.name}</p>
          <p className="text-[11px] text-[var(--text-soft)]">{product.category}</p>
          {product.isCombo ? (
            <span className="mt-1 inline-flex rounded-full border border-[rgba(155,132,96,0.35)] bg-[rgba(155,132,96,0.14)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--accent)]">
              combo
            </span>
          ) : null}
          {product.isCombo && product.comboDescription ? (
            <p className="mt-1 text-[10px] leading-4 text-[var(--accent)] line-clamp-2">{product.comboDescription}</p>
          ) : null}
          {product.isCombo && (product.comboItems?.length ?? 0) > 0 ? (
            <p className="mt-1 text-[10px] leading-4 text-[var(--text-soft)] line-clamp-2">
              {product.comboItems
                ?.slice(0, 2)
                .map((item) => `${item.componentProductName} (${item.totalUnits} und)`)
                .join(' • ')}
              {(product.comboItems?.length ?? 0) > 2 ? ' • ...' : ''}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 xl:mt-0">
        <div className="flex flex-col items-start gap-0.5 xl:items-end">
          <span className="text-sm font-semibold text-[#36f57c] group-hover:text-[#5cfb99]">
            {formatCurrency(product.unitPrice, 'BRL')}
          </span>
          <span className="text-[10px] font-medium" style={{ color: stockColor }}>
            {stockLabel}
          </span>
        </div>
        {inCartQty > 0 ? (
          <span className="flex size-6 items-center justify-center rounded-full bg-[rgba(52,242,127,0.16)] text-[11px] font-bold text-[#36f57c]">
            {inCartQty}
          </span>
        ) : null}
      </div>
    </button>
  )
})
