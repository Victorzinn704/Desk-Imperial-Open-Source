'use client'

import { Archive, PencilLine, RotateCcw } from 'lucide-react'
import type { ProductRecord } from '@contracts/contracts'
import { formatCurrencyComparison } from '@/lib/currency'
import { formatMeasurement } from '@/lib/product-packaging'
import { Button } from '@/components/shared/button'

export function ProductCard({
  product,
  onEdit,
  onArchive,
  onRestore,
  busy,
}: Readonly<{
  product: ProductRecord
  onEdit: (product: ProductRecord) => void
  onArchive: (productId: string) => void
  onRestore: (productId: string) => void
  busy?: boolean
}>) {
  const costValue = formatCurrencyComparison({
    originalValue: product.originalUnitCost,
    originalCurrency: product.currency,
    convertedValue: product.unitCost,
    displayCurrency: product.displayCurrency,
  })
  const priceValue = formatCurrencyComparison({
    originalValue: product.originalUnitPrice,
    originalCurrency: product.currency,
    convertedValue: product.unitPrice,
    displayCurrency: product.displayCurrency,
  })
  const profitValue = formatCurrencyComparison({
    originalValue: product.originalPotentialProfit,
    originalCurrency: product.currency,
    convertedValue: product.potentialProfit,
    displayCurrency: product.displayCurrency,
  })
  const measurementLabel = formatMeasurement(product.measurementValue, product.measurementUnit)
  const stockHelper =
    product.unitsPerPackage > 1
      ? `${product.stockBaseUnits} und totais no estoque`
      : `${product.stockBaseUnits} und disponiveis`

  return (
    <article className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-soft)] p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-semibold text-white">{product.name}</h3>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
              product.active
                ? 'border border-[rgba(123,214,138,0.28)] bg-[rgba(123,214,138,0.12)] text-[var(--success)]'
                : 'border border-[var(--border-strong)] bg-[rgba(255,255,255,0.04)] text-[var(--text-soft)]'
            }`}>
              {product.active ? 'ativo' : 'arquivado'}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--text-soft)]">
            <span>{product.category}</span>
            {product.brand ? <span className="rounded-full border border-[var(--border)] px-2 py-1 text-xs uppercase tracking-[0.18em]">{product.brand}</span> : null}
            <span className="rounded-full border border-[var(--border)] px-2 py-1 text-xs uppercase tracking-[0.18em]">
              {measurementLabel}
            </span>
          </div>
          <p className="mt-3 text-sm font-medium text-white">{product.packagingClass}</p>
          <p className="mt-4 text-sm leading-7 text-[var(--text-soft)]">
            {product.description || 'Produto sem descricao cadastrada.'}
          </p>
        </div>

        <div className="flex gap-2">
          <Button disabled={busy} onClick={() => onEdit(product)} size="sm" variant="secondary">
            <PencilLine className="size-4" />
            Editar
          </Button>
          {product.active ? (
            <Button disabled={busy} onClick={() => onArchive(product.id)} size="sm" variant="ghost">
              <Archive className="size-4" />
              Arquivar
            </Button>
          ) : (
            <Button disabled={busy} onClick={() => onRestore(product.id)} size="sm" variant="ghost">
              <RotateCcw className="size-4" />
              Reativar
            </Button>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">Custo</p>
          <p className="mt-2 text-lg font-semibold text-white">{costValue.primary}</p>
          {costValue.secondary ? <p className="mt-1 text-xs text-[var(--text-soft)]">{costValue.secondary}</p> : null}
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">Preco</p>
          <p className="mt-2 text-lg font-semibold text-white">{priceValue.primary}</p>
          {priceValue.secondary ? <p className="mt-1 text-xs text-[var(--text-soft)]">{priceValue.secondary}</p> : null}
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">Estoque</p>
          <p className="mt-2 text-lg font-semibold text-white">{product.stock}</p>
          <p className="mt-1 text-xs text-[var(--text-soft)]">{stockHelper}</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">Lucro potencial</p>
          <p className="mt-2 text-lg font-semibold text-white">{profitValue.primary}</p>
          {profitValue.secondary ? <p className="mt-1 text-xs text-[var(--text-soft)]">{profitValue.secondary}</p> : null}
        </div>
      </div>
    </article>
  )
}
