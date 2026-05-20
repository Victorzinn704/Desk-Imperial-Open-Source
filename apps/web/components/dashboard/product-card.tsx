'use client'

import { memo, useCallback } from 'react'
import { Archive, PencilLine, RotateCcw, Trash2 } from 'lucide-react'
import type { ProductRecord } from '@contracts/contracts'
import { Button } from '@/components/shared/button'
import { buildProductCardView } from './product-card.model'
import { ProductStats } from './product-card.stats'

type ProductCardView = ReturnType<typeof buildProductCardView>

// ── helpers ──────────────────────────────────────────────────────────────────

function ProductChips({ product, measurementLabel }: { product: ProductRecord; measurementLabel: string }) {
  const chipClass =
    'rounded-[8px] border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1 text-[11px] text-[var(--text-soft)]'
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <span className={chipClass}>{product.category}</span>
      {product.brand ? <span className={`${chipClass} uppercase tracking-[0.12em]`}>{product.brand}</span> : null}
      {product.barcode ? <span className={`${chipClass} font-mono`}>EAN {product.barcode}</span> : null}
      <span className={chipClass}>{measurementLabel}</span>
      {product.packagingClass && product.packagingClass !== 'UN' ? (
        <span className={chipClass}>{product.packagingClass}</span>
      ) : null}
    </div>
  )
}

function ProductDescriptions({ product }: { product: ProductRecord }) {
  return (
    <>
      {product.description ? (
        <p className="mt-3 text-sm leading-6 text-[var(--text-soft)] line-clamp-1">{product.description}</p>
      ) : null}
      {product.isCombo && product.comboDescription ? (
        <p className="mt-2 line-clamp-1 text-xs leading-5 text-[var(--accent)]">{product.comboDescription}</p>
      ) : null}
      {product.isCombo && (product.comboItems?.length ?? 0) > 0 ? (
        <p className="mt-1 line-clamp-1 text-[11px] leading-5 text-[var(--text-soft)]">
          {product.comboItems
            ?.slice(0, 3)
            .map((item) => `${item.componentProductName} (${item.totalUnits} und)`)
            .join(' • ')}
          {(product.comboItems?.length ?? 0) > 3 ? ' • ...' : ''}
        </p>
      ) : null}
    </>
  )
}

function ProductStatusBadges({
  margin,
  product,
}: Readonly<{
  margin: ProductCardView['margin']
  product: ProductRecord
}>) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <h3 className="truncate text-base font-semibold text-[var(--text-primary)]">{product.name}</h3>
      <span
        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${
          product.active
            ? 'border-[rgba(52,242,127,0.22)] bg-[rgba(52,242,127,0.07)] text-[#7bd68a]'
            : 'border-white/8 bg-white/4 text-[var(--text-soft)]'
        }`}
      >
        {product.active ? 'ativo' : 'arquivado'}
      </span>
      {product.isCombo ? (
        <span className="rounded-full border border-accent/25 bg-accent/[0.1] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
          combo
        </span>
      ) : null}
      {margin ? (
        <span
          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-[0.1em] ${margin.borderClass} ${margin.textClass}`}
        >
          {margin.label} margem
        </span>
      ) : null}
    </div>
  )
}

function ProductActions({
  busy,
  onArchive,
  onDelete,
  onEdit,
  onRestore,
  product,
}: Readonly<{
  busy?: boolean
  onArchive: (productId: string) => void
  onDelete: (productId: string) => void
  onEdit: (product: ProductRecord) => void
  onRestore: (productId: string) => void
  product: ProductRecord
}>) {
  const handleEdit = useCallback(() => {
    onEdit(product)
  }, [onEdit, product])
  const handleArchive = useCallback(() => {
    onArchive(product.id)
  }, [onArchive, product.id])
  const handleRestore = useCallback(() => {
    onRestore(product.id)
  }, [onRestore, product.id])
  const handleDelete = useCallback(() => {
    onDelete(product.id)
  }, [onDelete, product.id])
  const actionProps = {
    busy,
    name: product.name,
    onDelete: handleDelete,
    onEdit: handleEdit,
    onPrimary: product.active ? handleArchive : handleRestore,
  }

  return (
    <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
      {product.active ? <ProductActiveActions {...actionProps} /> : <ProductArchivedActions {...actionProps} />}
    </div>
  )
}

type ProductActionsProps = Readonly<{
  busy?: boolean
  name: string
  onDelete: () => void
  onEdit: () => void
  onPrimary: () => void
}>

function ProductActiveActions({ busy, name, onEdit, onPrimary }: ProductActionsProps) {
  return (
    <>
      <ProductEditButton busy={busy} name={name} onEdit={onEdit} />
      <Button disabled={busy} size="sm" variant="ghost" onClick={onPrimary}>
        <Archive className="size-3.5" />
        Arquivar
      </Button>
    </>
  )
}

function ProductArchivedActions({ busy, name, onDelete, onEdit, onPrimary }: ProductActionsProps) {
  return (
    <>
      <ProductEditButton busy={busy} name={name} onEdit={onEdit} />
      <Button disabled={busy} size="sm" variant="ghost" onClick={onPrimary}>
        <RotateCcw className="size-3.5" />
        Reativar
      </Button>
      <Button
        className="border-[rgba(248,113,113,0.18)] text-[#fca5a5] hover:border-[rgba(248,113,113,0.3)] hover:bg-[rgba(248,113,113,0.08)] hover:text-[#fecaca]"
        disabled={busy}
        size="sm"
        variant="ghost"
        onClick={onDelete}
      >
        <Trash2 className="size-3.5" />
        Excluir
      </Button>
    </>
  )
}

function ProductEditButton({ busy, name, onEdit }: Readonly<{ busy?: boolean; name: string; onEdit: () => void }>) {
  return (
    <Button aria-label={`Editar ${name}`} disabled={busy} size="sm" variant="secondary" onClick={onEdit}>
      <PencilLine className="size-3.5" />
      Editar
    </Button>
  )
}

// ── component ─────────────────────────────────────────────────────────────────

export const ProductCard = memo(function ProductCard({
  product,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
  busy,
}: Readonly<{
  product: ProductRecord
  onEdit: (product: ProductRecord) => void
  onArchive: (productId: string) => void
  onRestore: (productId: string) => void
  onDelete: (productId: string) => void
  busy?: boolean
}>) {
  const card = buildProductCardView(product)
  const productStyle = buildProductArticleStyle(product.active, card.accentColor)

  return (
    <article
      className="relative overflow-hidden rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-panel)] transition-colors hover:border-[var(--border-strong)] sm:p-5"
      style={productStyle}
    >
      {/* header row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <ProductStatusBadges margin={card.margin} product={product} />
          <ProductChips measurementLabel={card.measurementLabel} product={product} />
          <ProductDescriptions product={product} />
        </div>

        <ProductActions
          busy={busy}
          product={product}
          onArchive={onArchive}
          onDelete={onDelete}
          onEdit={onEdit}
          onRestore={onRestore}
        />
      </div>

      <ProductStats card={card} product={product} />
    </article>
  )
})
ProductCard.displayName = 'ProductCard'

function buildProductArticleStyle(active: boolean, accentColor: string) {
  return {
    boxShadow: active ? `inset 3px 0 0 ${accentColor}` : undefined,
  }
}
