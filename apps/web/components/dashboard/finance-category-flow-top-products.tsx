'use client'

import type { FinanceSummaryResponse, ProductRecord } from '@contracts/contracts'
import { ProductThumb } from '@/components/shared/product-thumb'
import { formatCompactCurrency } from '@/lib/currency'
import { resolveFinanceProductVisual } from './finance-category-flow.shared'

type FinanceCategoryTopProductsProps = Readonly<{
  finance: FinanceSummaryResponse
  productsById: Map<string, ProductRecord>
}>

export function FinanceCategoryTopProducts({ finance, productsById }: FinanceCategoryTopProductsProps) {
  if (finance.topProducts.length === 0) {
    return null
  }

  return (
    <section className="mt-6">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
        Top produtos globais
      </h3>
      <div className="space-y-2">
        {finance.topProducts.slice(0, 3).map((product, index) => (
          <FinanceCategoryTopProductRow index={index} key={product.id} product={product} productsById={productsById} />
        ))}
      </div>
    </section>
  )
}

function FinanceCategoryTopProductRow({
  index,
  product,
  productsById,
}: Readonly<{
  index: number
  product: FinanceSummaryResponse['topProducts'][number]
  productsById: Map<string, ProductRecord>
}>) {
  const catalogProduct = productsById.get(product.id)
  const productBrand = product.brand?.trim() || catalogProduct?.brand?.trim() || null

  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-[var(--border)] p-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-[9px] bg-[var(--surface-muted)] text-xs font-semibold text-[var(--text-soft)]">
        {index + 1}
      </span>
      <ProductThumb product={resolveFinanceProductVisual(product, catalogProduct)} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{product.name}</p>
        <p className="mt-0.5 text-[11px] text-[var(--text-soft)]">
          {product.category}
          {productBrand ? ` · ${productBrand}` : ''}
        </p>
      </div>
      <p className="shrink-0 text-sm font-semibold text-[#36f57c]">
        {formatCompactCurrency(product.inventorySalesValue, product.displayCurrency)}
      </p>
    </div>
  )
}
