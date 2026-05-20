'use client'

import { type DragEvent, memo, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { ProductThumb } from '@/components/shared/product-thumb'
import type { SimpleProduct } from '../types'
import { buildProductCardModel, type ProductCardModel } from './product-card.model'

type ProductCardProps = {
  product: SimpleProduct
  inCartQty: number
  onAddItem: (product: SimpleProduct) => void
}

export const ProductCard = memo(function ProductCard({ product, inCartQty, onAddItem }: ProductCardProps) {
  const model = buildProductCardModel({ inCartQty, product })
  const stockClassName = resolveStockClassName(model.stockTone)

  const handleClick = useCallback(() => {
    if (model.isSoldOut) {
      return
    }

    onAddItem(product)
  }, [model.isSoldOut, onAddItem, product])

  const handleDragStart = useCallback(
    (event: DragEvent) => {
      if (model.isSoldOut) {
        event.preventDefault()
        return
      }

      event.dataTransfer.setData('productId', product.id)
    },
    [model.isSoldOut, product.id],
  )

  return (
    <button
      aria-disabled={model.isSoldOut}
      className={model.rootClassName}
      draggable={model.isDraggable}
      type="button"
      onClick={handleClick}
      onDragStart={handleDragStart}
    >
      <ProductCartBadge value={model.cartBadge} />
      <ProductVisual product={product} />
      <ProductIdentity model={model} product={product} />
      <ProductCommercialSummary model={model} stockClassName={stockClassName} />
    </button>
  )
})

function ProductVisual({ product }: Readonly<{ product: SimpleProduct }>) {
  return (
    <div className="relative aspect-[1.12] overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--surface-soft)]">
      <ProductThumb
        className="!h-full !w-full !rounded-none !border-0"
        product={product}
        size="lg"
        visualPolicy="real-only"
      />
    </div>
  )
}

function ProductIdentity({ model, product }: Readonly<{ model: ProductCardModel; product: SimpleProduct }>) {
  return (
    <div className="mt-3 min-w-0 flex-1">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-semibold leading-5 text-[var(--text-primary)]">{product.name}</p>
          <p className="mt-1 truncate text-[11px] font-medium text-[var(--text-soft)]">{model.secondaryLabel}</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <CategoryBadge value={product.category} />
        {product.isCombo ? <ComboBadge /> : null}
      </div>
      {product.isCombo && product.comboDescription ? <ComboDescription value={product.comboDescription} /> : null}
      {model.comboDetails ? <ComboDetails value={model.comboDetails} /> : null}
    </div>
  )
}

function ProductCommercialSummary({
  model,
  stockClassName,
}: Readonly<{ model: ProductCardModel; stockClassName: string }>) {
  return (
    <div className="mt-3 flex items-end justify-between gap-3 border-t border-[var(--border)] pt-3">
      <div className="flex flex-col items-start gap-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">preço</span>
        <span className="text-lg font-bold tabular-nums text-[var(--accent)]">{model.formattedPrice}</span>
        <span className={`text-[10px] font-medium ${stockClassName}`}>{model.stockLabel}</span>
      </div>
      <span className="flex size-11 items-center justify-center rounded-[16px] bg-[var(--accent)] text-[var(--on-accent)] shadow-sm transition-transform group-hover:scale-105">
        <Plus className="size-5" />
      </span>
    </div>
  )
}

function CategoryBadge({ value }: Readonly<{ value: string }>) {
  return (
    <span className="rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--text-soft)]">
      {value}
    </span>
  )
}

function ComboBadge() {
  return (
    <span className="rounded-full border border-[var(--accent-soft)] bg-[var(--accent-soft)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--accent)]">
      combo
    </span>
  )
}

function ComboDescription({ value }: Readonly<{ value: string }>) {
  return <p className="mt-1 text-[10px] leading-4 text-[var(--accent)] line-clamp-2">{value}</p>
}

function ComboDetails({ value }: Readonly<{ value: string }>) {
  return <p className="mt-1 text-[10px] leading-4 text-[var(--text-soft)] line-clamp-2">{value}</p>
}

function ProductCartBadge({ value }: Readonly<{ value: string | null }>) {
  if (!value) {
    return null
  }

  return (
    <span className="absolute right-2 top-2 z-10 flex size-7 items-center justify-center rounded-full bg-[var(--accent)] text-[11px] font-bold text-[var(--on-accent)] shadow-sm">
      {value}
    </span>
  )
}

function resolveStockClassName(stockTone: ProductCardModel['stockTone']) {
  if (stockTone === 'danger') {
    return 'text-rose-500'
  }

  if (stockTone === 'warning') {
    return 'text-amber-500'
  }

  return 'text-[var(--text-soft)]'
}
