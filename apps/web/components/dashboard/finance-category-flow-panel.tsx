'use client'

import { useState } from 'react'
import type { FinanceSummaryResponse, ProductRecord } from '@contracts/contracts'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { ProductThumb } from '@/components/shared/product-thumb'
import { formatCompactCurrency } from '@/lib/currency'
import { cn } from '@/lib/utils'
import { getFinanceCategoryColor } from './finance-category-colors'

type FinanceCategoryFlowPanelProps = Readonly<{
  finance: FinanceSummaryResponse
  products?: ProductRecord[]
  title?: string
  className?: string
}>

type Tab = 'products' | 'metrics'

const CATEGORY_TONES = [
  { bg: 'rgba(52,242,127,0.08)', border: 'rgba(52,242,127,0.16)', text: '#36f57c' },
  { bg: 'rgba(34,101,216,0.10)', border: 'rgba(34,101,216,0.18)', text: '#60a5fa' },
  { bg: 'rgba(201,168,76,0.08)', border: 'rgba(201,168,76,0.18)', text: '#C9A84C' },
  { bg: 'rgba(240,68,56,0.08)', border: 'rgba(240,68,56,0.18)', text: '#f87171' },
  { bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.18)', text: '#a78bfa' },
  { bg: 'rgba(56,189,248,0.08)', border: 'rgba(56,189,248,0.18)', text: '#38bdf8' },
]

export function FinanceCategoryFlowPanel({
  className,
  finance,
  products = [],
  title = 'Registro de fluxo por categoria',
}: FinanceCategoryFlowPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('products')
  const productsById = new Map(products.map((product) => [product.id, product]))
  const total = finance.categoryBreakdown.reduce((sum, category) => sum + category.inventorySalesValue, 0)
  const selectedIndex = selectedCategory
    ? finance.categoryBreakdown.findIndex((category) => category.category === selectedCategory)
    : -1
  const selected = selectedIndex >= 0 ? finance.categoryBreakdown[selectedIndex] : null

  if (selectedCategory && selected) {
    return (
      <CategoryDetail
        activeTab={activeTab}
        category={selected}
        categoryProducts={finance.categoryTopProducts[selectedCategory] ?? []}
        currency={finance.displayCurrency}
        productsById={productsById}
        selectedIndex={selectedIndex}
        total={total}
        onBack={() => setSelectedCategory(null)}
        onSetActiveTab={setActiveTab}
      />
    )
  }

  return (
    <section className={cn('rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4', className)}>
      <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
        {title}
      </h2>
      <div className="space-y-2">
        {finance.categoryBreakdown.slice(0, 6).map((category, index) => {
          const pct = total > 0 ? (category.inventorySalesValue / total) * 100 : 0
          const tone = CATEGORY_TONES[index % CATEGORY_TONES.length]
          return (
            <button
              className="w-full rounded-[16px] border p-3 text-left transition active:scale-[0.99]"
              key={category.category}
              style={{ background: tone.bg, borderColor: tone.border }}
              type="button"
              onClick={() => {
                setSelectedCategory(category.category)
                setActiveTab('products')
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{category.category}</p>
                  <p className="mt-0.5 text-[10px] text-[var(--text-soft)]">
                    {category.products} produto{category.products === 1 ? '' : 's'} ·{' '}
                    {formatCompactCurrency(category.inventorySalesValue, finance.displayCurrency)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs font-semibold" style={{ color: tone.text }}>
                    {pct.toFixed(0)}%
                  </span>
                  <ChevronRight className="size-4" style={{ color: tone.text }} />
                </div>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    background: getFinanceCategoryColor(index),
                    width: `${Math.max(8, Math.min(pct, 100))}%`,
                  }}
                />
              </div>
            </button>
          )
        })}
        {finance.categoryBreakdown.length === 0 ? (
          <p className="rounded-[16px] border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--text-soft)]">
            Nenhuma categoria encontrada.
          </p>
        ) : null}
      </div>
      <TopProducts finance={finance} productsById={productsById} />
    </section>
  )
}

function CategoryDetail({
  activeTab,
  category,
  categoryProducts,
  currency,
  productsById,
  selectedIndex,
  total,
  onBack,
  onSetActiveTab,
}: {
  activeTab: Tab
  category: FinanceSummaryResponse['categoryBreakdown'][number]
  categoryProducts: FinanceSummaryResponse['topProducts']
  currency: FinanceSummaryResponse['displayCurrency']
  productsById: Map<string, ProductRecord>
  selectedIndex: number
  total: number
  onBack: () => void
  onSetActiveTab: (tab: Tab) => void
}) {
  const pct = total > 0 ? (category.inventorySalesValue / total) * 100 : 0
  const margin =
    category.inventorySalesValue > 0 ? (category.potentialProfit / category.inventorySalesValue) * 100 : 0
  const tone = CATEGORY_TONES[Math.max(0, selectedIndex) % CATEGORY_TONES.length]

  return (
    <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4">
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
        <span
          className="shrink-0 rounded-[10px] px-2.5 py-1 text-xs font-semibold"
          style={{ background: tone.bg, color: tone.text }}
        >
          {formatCompactCurrency(category.inventorySalesValue, currency)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-1 rounded-[16px] bg-[var(--surface-muted)] p-1">
        <CategoryTab active={activeTab === 'products'} label="Produtos" onClick={() => onSetActiveTab('products')} />
        <CategoryTab active={activeTab === 'metrics'} label="Métricas" onClick={() => onSetActiveTab('metrics')} />
      </div>

      {activeTab === 'products' ? (
        <CategoryProducts currency={currency} products={categoryProducts} productsById={productsById} />
      ) : (
        <CategoryMetrics category={category} currency={currency} margin={margin} pct={pct} selectedIndex={selectedIndex} />
      )}
    </section>
  )
}

function CategoryTab({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
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

function CategoryProducts({
  currency,
  products,
  productsById,
}: {
  currency: FinanceSummaryResponse['displayCurrency']
  products: FinanceSummaryResponse['topProducts']
  productsById: Map<string, ProductRecord>
}) {
  if (products.length === 0) {
    return (
      <p className="mt-4 rounded-[16px] border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--text-soft)]">
        Nenhum produto disponível nesta categoria.
      </p>
    )
  }

  return (
    <div className="mt-4 max-h-[26rem] space-y-2 overflow-y-auto pr-1">
      {products.map((product) => {
        const catalogProduct = productsById.get(product.id)
        const productBrand = product.brand?.trim() || catalogProduct?.brand?.trim() || null
        return (
          <article className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-muted)] p-3" key={product.id}>
            <div className="flex items-center gap-3">
              <ProductThumb
                product={{
                  name: product.name,
                  brand: productBrand,
                  category: product.category,
                  barcode: product.barcode ?? catalogProduct?.barcode,
                  packagingClass: product.packagingClass ?? catalogProduct?.packagingClass,
                  quantityLabel: product.quantityLabel ?? catalogProduct?.quantityLabel,
                  imageUrl: product.imageUrl ?? catalogProduct?.imageUrl,
                  catalogSource: product.catalogSource ?? catalogProduct?.catalogSource,
                  isCombo: product.isCombo ?? catalogProduct?.isCombo,
                }}
                size="sm"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{product.name}</p>
                <p className="mt-1 truncate text-[11px] text-[var(--text-soft)]">
                  {productBrand ? `${productBrand} · ` : ''}
                  {product.category}
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              <ProductMetric label="Custo" value={formatCompactCurrency(product.inventoryCostValue, currency)} />
              <ProductMetric
                label="Valor"
                tone="success"
                value={formatCompactCurrency(product.inventorySalesValue, currency)}
              />
              <ProductMetric
                label="Potencial"
                tone="warning"
                value={formatCompactCurrency(product.potentialProfit, currency)}
              />
              <ProductMetric label="Margem" tone="purple" value={`${product.marginPercent.toFixed(1)}%`} />
            </div>
            <div className="mt-1.5 flex items-center justify-between rounded-[10px] border border-[rgba(34,101,216,0.16)] bg-[rgba(34,101,216,0.08)] px-2.5 py-2">
              <p className="text-[10px] text-blue-300">Unidades em estoque</p>
              <p className="text-xs font-semibold text-blue-300">{product.stock} un.</p>
            </div>
          </article>
        )
      })}
    </div>
  )
}

function ProductMetric({
  label,
  tone = 'neutral',
  value,
}: {
  label: string
  tone?: 'neutral' | 'purple' | 'success' | 'warning'
  value: string
}) {
  const styleByTone = {
    neutral: 'bg-[var(--surface-soft)] text-[var(--text-primary)] border-[var(--border)]',
    purple: 'border-[rgba(167,139,250,0.16)] bg-[rgba(167,139,250,0.08)] text-[#c084fc]',
    success: 'border-[rgba(52,242,127,0.16)] bg-[rgba(52,242,127,0.08)] text-[#36f57c]',
    warning: 'border-[rgba(201,168,76,0.16)] bg-[rgba(201,168,76,0.08)] text-[#C9A84C]',
  }[tone]

  return (
    <div className={cn('rounded-[10px] border px-2.5 py-2', styleByTone)}>
      <p className="text-[10px] text-[var(--text-soft)]">{label}</p>
      <p className="mt-0.5 text-xs font-semibold">{value}</p>
    </div>
  )
}

function CategoryMetrics({
  category,
  currency,
  margin,
  pct,
  selectedIndex,
}: {
  category: FinanceSummaryResponse['categoryBreakdown'][number]
  currency: FinanceSummaryResponse['displayCurrency']
  margin: number
  pct: number
  selectedIndex: number
}) {
  const color = getFinanceCategoryColor(Math.max(0, selectedIndex))
  return (
    <div className="mt-4 space-y-2">
      <MetricLine label="Custo total" value={formatCompactCurrency(category.inventoryCostValue, currency)} />
      <MetricLine
        label="Valor em estoque"
        tone="success"
        value={formatCompactCurrency(category.inventorySalesValue, currency)}
      />
      <MetricLine
        label="Lucro potencial"
        tone="warning"
        value={formatCompactCurrency(category.potentialProfit, currency)}
      />
      <div className="grid grid-cols-2 gap-2">
        <ProductMetric label="Margem" tone="purple" value={`${margin.toFixed(1)}%`} />
        <ProductMetric label="Unidades" value={`${category.units} un.`} />
      </div>
      <div className="rounded-[14px] bg-[var(--surface-muted)] px-3 py-3">
        <p className="mb-2 text-[10px] text-[var(--text-soft)]">Representatividade</p>
        <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-soft)]">
          <div className="h-full rounded-full" style={{ background: color, width: `${Math.max(8, Math.min(pct, 100))}%` }} />
        </div>
        <p className="mt-1 text-right text-xs font-semibold" style={{ color }}>
          {pct.toFixed(0)}%
        </p>
      </div>
    </div>
  )
}

function MetricLine({
  label,
  tone = 'neutral',
  value,
}: {
  label: string
  tone?: 'neutral' | 'success' | 'warning'
  value: string
}) {
  const color = tone === 'success' ? '#36f57c' : tone === 'warning' ? '#C9A84C' : 'var(--text-primary)'
  return (
    <div className="flex items-center justify-between gap-3 rounded-[14px] bg-[var(--surface-muted)] px-3 py-3">
      <p className="text-xs text-[var(--text-soft)]">{label}</p>
      <p className="text-sm font-semibold" style={{ color }}>{value}</p>
    </div>
  )
}

function TopProducts({
  finance,
  productsById,
}: {
  finance: FinanceSummaryResponse
  productsById: Map<string, ProductRecord>
}) {
  if (finance.topProducts.length === 0) {
    return null
  }

  return (
    <section className="mt-6">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
        Top produtos globais
      </h3>
      <div className="space-y-2">
        {finance.topProducts.slice(0, 3).map((product, index) => {
          const catalogProduct = productsById.get(product.id)
          const productBrand = product.brand?.trim() || catalogProduct?.brand?.trim() || null
          return (
            <div className="flex items-center gap-3 rounded-[14px] border border-[var(--border)] p-3" key={product.id}>
              <span className="flex size-7 shrink-0 items-center justify-center rounded-[9px] bg-[var(--surface-muted)] text-xs font-semibold text-[var(--text-soft)]">
                {index + 1}
              </span>
              <ProductThumb
                product={{
                  name: product.name,
                  brand: productBrand,
                  category: product.category,
                  barcode: product.barcode ?? catalogProduct?.barcode,
                  packagingClass: product.packagingClass ?? catalogProduct?.packagingClass,
                  quantityLabel: product.quantityLabel ?? catalogProduct?.quantityLabel,
                  imageUrl: product.imageUrl ?? catalogProduct?.imageUrl,
                  catalogSource: product.catalogSource ?? catalogProduct?.catalogSource,
                  isCombo: product.isCombo ?? catalogProduct?.isCombo,
                }}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{product.name}</p>
                <p className="mt-0.5 text-[11px] text-[var(--text-soft)]">
                  {product.category}
                  {productBrand ? ` · ${productBrand}` : ''}
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold text-[#36f57c]">
                {formatCompactCurrency(product.inventorySalesValue, finance.displayCurrency)}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
