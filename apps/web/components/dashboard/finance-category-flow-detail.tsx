'use client'

import type { FinanceSummaryResponse, ProductRecord } from '@contracts/contracts'
import { ArrowLeft } from 'lucide-react'
import { ProductThumb } from '@/components/shared/product-thumb'
import { formatCompactCurrency } from '@/lib/currency'
import { cn } from '@/lib/utils'
import { getFinanceCategoryColor } from './finance-category-colors'
import {
  type FinanceCategoryFlowTab,
  getDetailTone,
  METRIC_LINE_COLORS,
  PRODUCT_METRIC_TONE_CLASSES,
  resolveFinanceProductVisual,
} from './finance-category-flow.shared'

type FinanceCategoryDetailProps = Readonly<{
  activeTab: FinanceCategoryFlowTab
  category: FinanceSummaryResponse['categoryBreakdown'][number]
  categoryProducts: FinanceSummaryResponse['topProducts']
  currency: FinanceSummaryResponse['displayCurrency']
  onBack: () => void
  onSetActiveTab: (tab: FinanceCategoryFlowTab) => void
  productsById: Map<string, ProductRecord>
  selectedIndex: number
  total: number
}>

export function FinanceCategoryDetail({
  activeTab,
  category,
  categoryProducts,
  currency,
  onBack,
  onSetActiveTab,
  productsById,
  selectedIndex,
  total,
}: FinanceCategoryDetailProps) {
  const pct = total > 0 ? (category.inventorySalesValue / total) * 100 : 0
  const margin = category.inventorySalesValue > 0 ? (category.potentialProfit / category.inventorySalesValue) * 100 : 0

  return (
    <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <FinanceCategoryDetailHeader
        category={category}
        currency={currency}
        pct={pct}
        selectedIndex={selectedIndex}
        onBack={onBack}
      />
      <FinanceCategoryDetailTabs activeTab={activeTab} onSetActiveTab={onSetActiveTab} />
      {activeTab === 'products' ? (
        <FinanceCategoryProducts currency={currency} products={categoryProducts} productsById={productsById} />
      ) : (
        <FinanceCategoryMetrics
          category={category}
          currency={currency}
          margin={margin}
          pct={pct}
          selectedIndex={selectedIndex}
        />
      )}
    </section>
  )
}

function FinanceCategoryDetailHeader({
  category,
  currency,
  onBack,
  pct,
  selectedIndex,
}: Readonly<{
  category: FinanceSummaryResponse['categoryBreakdown'][number]
  currency: FinanceSummaryResponse['displayCurrency']
  onBack: () => void
  pct: number
  selectedIndex: number
}>) {
  const tone = getDetailTone(selectedIndex)

  return (
    <div className="flex items-center gap-3">
      <button
        className="flex size-9 shrink-0 items-center justify-center rounded-[12px] border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-soft)] transition active:scale-95"
        type="button"
        onClick={onBack}
      >
        <ArrowLeft className="size-4" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{category.category}</p>
        <p className="mt-0.5 text-[10px] text-[var(--text-soft)]">
          {category.products} produto{category.products === 1 ? '' : 's'} · {pct.toFixed(0)}% do portfólio
        </p>
      </div>
      <span className="shrink-0 rounded-[10px] px-2.5 py-1 text-xs font-semibold" style={tone}>
        {formatCompactCurrency(category.inventorySalesValue, currency)}
      </span>
    </div>
  )
}

function FinanceCategoryDetailTabs({
  activeTab,
  onSetActiveTab,
}: Readonly<{
  activeTab: FinanceCategoryFlowTab
  onSetActiveTab: (tab: FinanceCategoryFlowTab) => void
}>) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-1 rounded-[16px] bg-[var(--surface-muted)] p-1">
      <FinanceCategoryTab
        active={activeTab === 'products'}
        label="Produtos"
        onClick={() => onSetActiveTab('products')}
      />
      <FinanceCategoryTab active={activeTab === 'metrics'} label="Métricas" onClick={() => onSetActiveTab('metrics')} />
    </div>
  )
}

function FinanceCategoryTab({
  active,
  label,
  onClick,
}: Readonly<{
  active: boolean
  label: string
  onClick: () => void
}>) {
  return (
    <button
      className={cn(
        'rounded-[12px] py-2 text-sm font-semibold transition',
        active ? 'bg-[var(--surface-soft)] text-[var(--text-primary)]' : 'text-[var(--text-soft)]',
      )}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  )
}

function FinanceCategoryProducts({
  currency,
  products,
  productsById,
}: Readonly<{
  currency: FinanceSummaryResponse['displayCurrency']
  products: FinanceSummaryResponse['topProducts']
  productsById: Map<string, ProductRecord>
}>) {
  if (products.length === 0) {
    return (
      <p className="mt-4 rounded-[16px] border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--text-soft)]">
        Nenhum produto disponível nesta categoria.
      </p>
    )
  }

  return (
    <div className="mt-4 max-h-[26rem] space-y-2 overflow-y-auto pr-1">
      {products.map((product) => (
        <FinanceCategoryProductRow currency={currency} key={product.id} product={product} productsById={productsById} />
      ))}
    </div>
  )
}

function FinanceCategoryProductRow({
  currency,
  product,
  productsById,
}: Readonly<{
  currency: FinanceSummaryResponse['displayCurrency']
  product: FinanceSummaryResponse['topProducts'][number]
  productsById: Map<string, ProductRecord>
}>) {
  const catalogProduct = productsById.get(product.id)
  const productBrand = product.brand?.trim() || catalogProduct?.brand?.trim() || null

  return (
    <article className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-muted)] p-3">
      <div className="flex items-center gap-3">
        <ProductThumb product={resolveFinanceProductVisual(product, catalogProduct)} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{product.name}</p>
          <p className="mt-1 truncate text-[11px] text-[var(--text-soft)]">
            {productBrand ? `${productBrand} · ` : ''}
            {product.category}
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        <FinanceCategoryProductMetric
          label="Custo"
          tone="neutral"
          value={formatCompactCurrency(product.inventoryCostValue, currency)}
        />
        <FinanceCategoryProductMetric
          label="Valor"
          tone="success"
          value={formatCompactCurrency(product.inventorySalesValue, currency)}
        />
        <FinanceCategoryProductMetric
          label="Potencial"
          tone="warning"
          value={formatCompactCurrency(product.potentialProfit, currency)}
        />
        <FinanceCategoryProductMetric label="Margem" tone="purple" value={`${product.marginPercent.toFixed(1)}%`} />
      </div>
      <div className="mt-1.5 flex items-center justify-between rounded-[10px] border border-[rgba(34,101,216,0.16)] bg-[rgba(34,101,216,0.08)] px-2.5 py-2">
        <p className="text-[10px] text-blue-300">Unidades em estoque</p>
        <p className="text-xs font-semibold text-blue-300">{product.stock} un.</p>
      </div>
    </article>
  )
}

function FinanceCategoryProductMetric({
  label,
  tone,
  value,
}: Readonly<{
  label: string
  tone: keyof typeof PRODUCT_METRIC_TONE_CLASSES
  value: string
}>) {
  return (
    <div className={cn('rounded-[10px] border px-2.5 py-2', PRODUCT_METRIC_TONE_CLASSES[tone])}>
      <p className="text-[10px] text-[var(--text-soft)]">{label}</p>
      <p className="mt-0.5 text-xs font-semibold">{value}</p>
    </div>
  )
}

function FinanceCategoryMetrics({
  category,
  currency,
  margin,
  pct,
  selectedIndex,
}: Readonly<{
  category: FinanceSummaryResponse['categoryBreakdown'][number]
  currency: FinanceSummaryResponse['displayCurrency']
  margin: number
  pct: number
  selectedIndex: number
}>) {
  const color = getFinanceCategoryColor(Math.max(0, selectedIndex))

  return (
    <div className="mt-4 space-y-2">
      <FinanceCategoryMetricLine
        label="Custo total"
        tone="neutral"
        value={formatCompactCurrency(category.inventoryCostValue, currency)}
      />
      <FinanceCategoryMetricLine
        label="Valor em estoque"
        tone="success"
        value={formatCompactCurrency(category.inventorySalesValue, currency)}
      />
      <FinanceCategoryMetricLine
        label="Lucro potencial"
        tone="warning"
        value={formatCompactCurrency(category.potentialProfit, currency)}
      />
      <div className="grid grid-cols-2 gap-2">
        <FinanceCategoryProductMetric label="Margem" tone="purple" value={`${margin.toFixed(1)}%`} />
        <FinanceCategoryProductMetric label="Unidades" tone="neutral" value={`${category.units} un.`} />
      </div>
      <div className="rounded-[14px] bg-[var(--surface-muted)] px-3 py-3">
        <p className="mb-2 text-[10px] text-[var(--text-soft)]">Representatividade</p>
        <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-soft)]">
          <div
            className="h-full rounded-full"
            style={{ background: color, width: `${Math.max(8, Math.min(pct, 100))}%` }}
          />
        </div>
        <p className="mt-1 text-right text-xs font-semibold" style={{ color }}>
          {pct.toFixed(0)}%
        </p>
      </div>
    </div>
  )
}

function FinanceCategoryMetricLine({
  label,
  tone,
  value,
}: Readonly<{
  label: string
  tone: keyof typeof METRIC_LINE_COLORS
  value: string
}>) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[14px] bg-[var(--surface-muted)] px-3 py-3">
      <p className="text-xs text-[var(--text-soft)]">{label}</p>
      <p className="text-sm font-semibold" style={{ color: METRIC_LINE_COLORS[tone] }}>
        {value}
      </p>
    </div>
  )
}
