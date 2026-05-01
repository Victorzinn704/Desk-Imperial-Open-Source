'use client'

import { memo } from 'react'
import { ProductThumb } from '@/components/shared/product-thumb'
import { formatCurrency } from '@/lib/currency'
import type { SimpleProduct } from '../types'

type ProductCardProps = {
  product: SimpleProduct
  inCartQty: number
  onAdd: () => void
  onDragStart: (e: React.DragEvent) => void
}

export const ProductCard = memo(function ProductCard({ product, inCartQty, onAdd, onDragStart }: ProductCardProps) {
  const available = product.stock - inCartQty
  const isSoldOut = available <= 0
  const stockColor = isSoldOut
    ? '#f87171' // vermelho — esgotado
    : product.isLowStock || available <= 5
      ? '#f59e0b' // âmbar — baixo
      : 'var(--text-soft)' // cinza normal
  const stockLabel = isSoldOut ? 'Esgotado' : `${available} und`

  return (
    <button
      draggable={!isSoldOut}
      aria-disabled={isSoldOut}
      className={`group flex min-h-[96px] w-full flex-col justify-between rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-left transition-all xl:min-h-0 xl:flex-row xl:items-center ${
        isSoldOut
          ? 'cursor-not-allowed opacity-60'
          : 'cursor-grab hover:border-[color-mix(in_srgb,var(--accent)_24%,var(--border))] hover:bg-[var(--surface-soft)] active:cursor-grabbing'
      }`}
      type="button"
      onClick={() => {
        if (isSoldOut) {
          return
        }
        onAdd()
      }}
      onDragStart={(event) => {
        if (isSoldOut) {
          event.preventDefault()
          return
        }
        onDragStart(event)
      }}
    >
      <div className="flex items-start gap-3">
        <ProductThumb product={product} size="md" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--text-primary)] line-clamp-2">{product.name}</p>
          <p className="text-[11px] text-[var(--text-soft)]">{product.category}</p>
          {product.isCombo ? (
            <span className="mt-1 inline-flex rounded-full border border-[var(--accent-soft)] bg-[var(--accent-soft)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--accent)]">
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
          <span className="text-sm font-semibold text-[var(--accent)]">{formatCurrency(product.unitPrice, 'BRL')}</span>
          <span className="text-[10px] font-medium" style={{ color: stockColor }}>
            {stockLabel}
          </span>
        </div>
        {inCartQty > 0 ? (
          <span className="flex size-6 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[11px] font-bold text-[var(--accent)]">
            {inCartQty}
          </span>
        ) : null}
      </div>
    </button>
  )
})
