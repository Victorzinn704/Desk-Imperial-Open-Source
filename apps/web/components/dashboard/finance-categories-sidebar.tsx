'use client'

import { useState } from 'react'
import type { FinanceSummaryResponse } from '@contracts/contracts'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { formatCompactCurrency } from '@/lib/currency'
import { cn } from '@/lib/utils'
import { CardSkeleton } from '@/components/shared/skeleton'

type Props = {
  finance: FinanceSummaryResponse
  isLoading?: boolean
}

type Tab = 'products' | 'metrics'

const CATEGORY_COLORS = [
  { bar: 'bg-[#36f57c]', text: 'text-[#36f57c]', bg: 'bg-[rgba(52,242,127,0.08)]' },
  { bar: 'bg-[#2265d8]', text: 'text-blue-400', bg: 'bg-[rgba(34,101,216,0.1)]' },
  { bar: 'bg-[#C9A84C]', text: 'text-[#C9A84C]', bg: 'bg-[rgba(201,168,76,0.08)]' },
  { bar: 'bg-[#f04438]', text: 'text-red-400', bg: 'bg-[rgba(240,68,56,0.08)]' },
  { bar: 'bg-[#a78bfa]', text: 'text-purple-400', bg: 'bg-[rgba(167,139,250,0.08)]' },
  { bar: 'bg-[#38bdf8]', text: 'text-sky-400', bg: 'bg-[rgba(56,189,248,0.08)]' },
]

export function FinanceCategoriesSidebar({ finance, isLoading }: Props) {
  const { categoryBreakdown, topProducts, displayCurrency } = finance
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('products')

  const total = categoryBreakdown.reduce((sum, c) => sum + c.inventorySalesValue, 0)

  if (isLoading) {
    return <CardSkeleton rows={4} />
  }

  const handleSelectCategory = (category: string) => {
    setSelectedCategory(category)
    setActiveTab('products')
  }

  const handleBack = () => setSelectedCategory(null)

  const selectedCat = selectedCategory
    ? categoryBreakdown.find((c) => c.category === selectedCategory)
    : null

  const selectedCatIndex = selectedCategory
    ? categoryBreakdown.findIndex((c) => c.category === selectedCategory)
    : -1

  const selectedColor =
    selectedCatIndex >= 0
      ? CATEGORY_COLORS[selectedCatIndex % CATEGORY_COLORS.length]
      : CATEGORY_COLORS[0]

  const categoryProducts = selectedCategory
    ? (finance.categoryTopProducts[selectedCategory] ?? [])
    : []

  // ── Detail view ─────────────────────────────────────────────────────────────

  if (selectedCategory && selectedCat) {
    const catPct = total > 0 ? (selectedCat.inventorySalesValue / total) * 100 : 0
    const catMargin =
      selectedCat.inventorySalesValue > 0
        ? (selectedCat.potentialProfit / selectedCat.inventorySalesValue) * 100
        : 0

    return (
      <div className="imperial-card flex min-w-0 flex-col gap-4 p-6">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[rgba(255,255,255,0.04)] text-[var(--text-soft)] transition-colors hover:bg-[rgba(255,255,255,0.08)] hover:text-white"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">{selectedCategory}</p>
            <p className="text-[10px] text-[var(--text-soft)]">
              {selectedCat.products} produto{selectedCat.products !== 1 ? 's' : ''} ·{' '}
              {catPct.toFixed(0)}% do portfólio
            </p>
          </div>
          <span
            className={cn(
              'shrink-0 rounded-md px-2 py-0.5 text-xs font-bold',
              selectedColor.bg,
              selectedColor.text,
            )}
          >
            {formatCompactCurrency(selectedCat.inventorySalesValue, displayCurrency)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-[18px] border border-white/6 bg-[rgba(255,255,255,0.02)] p-1">
          {(['products', 'metrics'] as Tab[]).map((id) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'rounded-[14px] py-2 text-xs font-semibold transition-colors duration-200',
                activeTab === id
                  ? 'border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.08)] text-white shadow-sm'
                  : 'text-[var(--text-soft)] hover:text-white',
              )}
            >
              {id === 'products' ? 'Produtos' : 'Métricas'}
            </button>
          ))}
        </div>

        {activeTab === 'products' && (
          <div className="max-h-96 space-y-2 overflow-y-auto pr-0.5">
            {categoryProducts.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--text-soft)]">
                Nenhum produto disponível nesta categoria.
              </p>
            ) : (
              categoryProducts.map((product) => (
                <div
                  key={product.id}
                  className="space-y-3 rounded-[22px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4"
                >
                  <p className="truncate text-sm font-semibold text-white">{product.name}</p>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-[16px] border border-white/6 bg-[rgba(255,255,255,0.025)] px-3 py-2">
                      <p className="text-[10px] text-[var(--text-soft)]">Custo</p>
                      <p className="text-xs font-bold text-white">
                        {formatCompactCurrency(product.inventoryCostValue, displayCurrency)}
                      </p>
                    </div>

                    <div className="rounded-[16px] border border-[rgba(52,242,127,0.12)] bg-[rgba(52,242,127,0.06)] px-3 py-2">
                      <p className="text-[10px] text-[var(--text-soft)]">Valor</p>
                      <p className="text-xs font-bold text-[#36f57c]">
                        {formatCompactCurrency(product.inventorySalesValue, displayCurrency)}
                      </p>
                    </div>

                    <div className="rounded-[16px] border border-[rgba(201,168,76,0.12)] bg-[rgba(201,168,76,0.06)] px-3 py-2">
                      <p className="text-[10px] text-[var(--text-soft)]">Potencial</p>
                      <p className="text-xs font-bold text-[#C9A84C]">
                        {formatCompactCurrency(product.potentialProfit, displayCurrency)}
                      </p>
                    </div>

                    <div className="rounded-[16px] border border-[rgba(167,139,250,0.12)] bg-[rgba(167,139,250,0.06)] px-3 py-2">
                      <p className="text-[10px] text-[var(--text-soft)]">Margem</p>
                      <p className="text-xs font-bold text-purple-400">
                        {product.marginPercent.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-[16px] border border-[rgba(34,101,216,0.12)] bg-[rgba(34,101,216,0.06)] px-3 py-2">
                    <p className="text-[10px] text-blue-300">Unidades em Estoque</p>
                    <p className="text-xs font-bold text-blue-300">{product.stock} un.</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'metrics' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-[18px] border border-white/6 bg-[rgba(255,255,255,0.025)] px-3 py-3">
              <p className="text-xs text-[var(--text-soft)]">Custo Total</p>
              <p className="text-sm font-bold text-white">
                {formatCompactCurrency(selectedCat.inventoryCostValue, displayCurrency)}
              </p>
            </div>

            <div className="flex items-center justify-between rounded-[18px] border border-[rgba(52,242,127,0.12)] bg-[rgba(52,242,127,0.05)] px-3 py-3">
              <p className="text-xs text-[var(--text-soft)]">Valor em Estoque</p>
              <p className="text-sm font-bold text-[#36f57c]">
                {formatCompactCurrency(selectedCat.inventorySalesValue, displayCurrency)}
              </p>
            </div>

            <div className="flex items-center justify-between rounded-[18px] border border-[rgba(201,168,76,0.12)] bg-[rgba(201,168,76,0.05)] px-3 py-3">
              <p className="text-xs text-[var(--text-soft)]">Lucro Potencial</p>
              <p className="text-sm font-bold text-[#C9A84C]">
                {formatCompactCurrency(selectedCat.potentialProfit, displayCurrency)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="rounded-[18px] border border-[rgba(167,139,250,0.12)] bg-[rgba(167,139,250,0.05)] px-3 py-3 text-center">
                <p className="text-[10px] text-[var(--text-soft)]">Margem</p>
                <p className="text-sm font-bold text-purple-400">{catMargin.toFixed(1)}%</p>
              </div>
              <div className="rounded-[18px] border border-[rgba(34,101,216,0.12)] bg-[rgba(34,101,216,0.05)] px-3 py-3 text-center">
                <p className="text-[10px] text-[var(--text-soft)]">Unidades</p>
                <p className="text-sm font-bold text-blue-400">{selectedCat.units} un.</p>
              </div>
            </div>

            <div className="rounded-[18px] border border-white/6 bg-[rgba(255,255,255,0.025)] px-3 py-3">
              <p className="mb-1.5 text-[10px] text-[var(--text-soft)]">Representatividade</p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
                <div
                  className={cn('h-full rounded-full transition-all duration-700', selectedColor.bar)}
                  style={{ width: `${catPct}%` }}
                />
              </div>
              <p className={cn('mt-1 text-right text-xs font-bold', selectedColor.text)}>
                {catPct.toFixed(0)}%
              </p>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── List view (default) ──────────────────────────────────────────────────────

  return (
    <div className="imperial-card flex min-w-0 flex-col gap-6 p-6">
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
          Registro de Fluxo por Categoria
        </h2>

        <div className="space-y-2">
          {categoryBreakdown.slice(0, 6).map((cat, i) => {
            const pct = total > 0 ? (cat.inventorySalesValue / total) * 100 : 0
            const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length]

            return (
              <button
                key={cat.category}
                onClick={() => handleSelectCategory(cat.category)}
                className={cn(
                  'w-full cursor-pointer rounded-[22px] border p-4 text-left transition-colors duration-200',
                  color.bg,
                  'border-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.1)]',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">{cat.category}</p>
                    <p className="mt-0.5 text-[10px] text-[var(--text-soft)]">
                      {cat.products} produto{cat.products !== 1 ? 's' : ''} ·{' '}
                      {formatCompactCurrency(cat.inventorySalesValue, displayCurrency)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <p className={cn('text-xs font-semibold', color.text)}>{pct.toFixed(0)}%</p>
                    <ChevronRight className={cn('size-4', color.text)} />
                  </div>
                </div>

                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
                  <div
                    className={cn('h-full rounded-full transition-all duration-700', color.bar)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </button>
            )
          })}

          {categoryBreakdown.length === 0 && (
            <p className="text-sm text-[var(--text-soft)]">Nenhuma categoria encontrada.</p>
          )}
        </div>
      </section>

      {/* Top Products */}
      {topProducts.length > 0 && (
        <section>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
            Top produtos globais
          </h2>

          <div className="space-y-2">
            {topProducts.slice(0, 5).map((product, i) => (
              <div
                key={product.id}
                className="flex items-center gap-3 rounded-xl border border-[rgba(255,255,255,0.04)] p-3 transition-colors hover:border-[rgba(255,255,255,0.08)]"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[rgba(255,255,255,0.04)] text-xs font-bold text-[var(--text-soft)]">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{product.name}</p>
                  <p className="text-[11px] text-[var(--text-soft)]">{product.category}</p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-[#36f57c]">
                  {formatCompactCurrency(product.inventorySalesValue, displayCurrency)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
