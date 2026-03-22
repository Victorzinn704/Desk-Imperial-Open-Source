'use client'

import { Archive, PencilLine, RotateCcw } from 'lucide-react'
import type { ProductRecord } from '@contracts/contracts'
import { formatCurrencyComparison } from '@/lib/currency'
import { formatMeasurement, formatStockBreakdown } from '@/lib/product-packaging'
import { Button } from '@/components/shared/button'
import { ListMetric, ListRow } from '@/components/shared/list-primitives'

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
  const stockBreakdown = formatStockBreakdown(product.stock, product.unitsPerPackage)
  const packageHelper =
    product.unitsPerPackage > 1
      ? `${product.unitsPerPackage} und por caixa/fardo`
      : 'Produto operado apenas por unidade'

  return (
    <ListRow
      actions={
        <>
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
        </>
      }
      details={
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ListMetric label="Custo" value={costValue.primary} hint={costValue.secondary ?? undefined} />
          <ListMetric label="Preço" value={priceValue.primary} hint={priceValue.secondary ?? undefined} />
          <ListMetric
            label="Estoque"
            value={stockBreakdown}
            hint={`${product.stock} und totais • ${packageHelper}`}
          />
          <ListMetric
            label="Lucro potencial"
            value={profitValue.primary}
            hint={profitValue.secondary ?? undefined}
          />
        </div>
      }
      leading={
        <div className="flex size-12 items-center justify-center rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-[var(--accent)]">
          <span className="text-xs font-semibold uppercase tracking-[0.18em]">{product.name.slice(0, 2)}</span>
        </div>
      }
      meta={`${product.category} · ${measurementLabel}${product.brand ? ` · ${product.brand}` : ''}`}
      status={
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
            product.active
              ? 'border border-[rgba(123,214,138,0.28)] bg-[rgba(123,214,138,0.12)] text-[var(--success)]'
              : 'border border-[var(--border-strong)] bg-[rgba(255,255,255,0.04)] text-[var(--text-soft)]'
          }`}
        >
          {product.active ? 'ativo' : 'arquivado'}
        </span>
      }
      subtitle={
        <div className="space-y-2">
          {product.packagingClass && product.packagingClass !== 'UN' ? (
            <p className="text-sm font-medium text-white">{product.packagingClass}</p>
          ) : null}
          <p>{product.description || 'Produto sem descrição cadastrada.'}</p>
        </div>
      }
      title={<h3 className="text-lg font-semibold text-white">{product.name}</h3>}
    />
  )
}
