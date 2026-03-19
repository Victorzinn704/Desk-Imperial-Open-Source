'use client'

import { useState } from 'react'
import type { FinanceSummaryResponse } from '@contracts/contracts'
import { ChevronRight } from 'lucide-react'
import { formatCompactCurrency } from '@/lib/currency'
import { cn } from '@/lib/utils'
import { CardSkeleton } from '@/components/shared/skeleton'

type Props = {
  finance: FinanceSummaryResponse
  isLoading?: boolean
}

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

  const total = categoryBreakdown.reduce((sum, c) => sum + c.inventorySalesValue, 0)

  if (isLoading) {
    return <CardSkeleton rows={4} />
  }

  // Filter products by selected category
  const categoryProducts = selectedCategory
    ? topProducts.filter((p) => p.category === selectedCategory)
    : []

  return (
    <div className="imperial-card flex flex-col gap-6 p-6">
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
          Registro de Fluxo de Categoria
        </h2>

        <div className="space-y-2">
          {categoryBreakdown.slice(0, 6).map((cat, i) => {
            const pct = total > 0 ? (cat.inventorySalesValue / total) * 100 : 0
            const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length]
            const isSelected = selectedCategory === cat.category

            return (
              <button
                key={cat.category}
                onClick={() => setSelectedCategory(isSelected ? null : cat.category)}
                className={cn(
                  'w-full text-left transition-all duration-200',
                  'rounded-xl p-3 cursor-pointer',
                  isSelected
                    ? 'ring-2 ring-[var(--accent)] ' + color.bg
                    : color.bg + ' hover:border hover:border-[rgba(255,255,255,0.1)]'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{cat.category}</p>
                    <p className="text-[10px] text-[var(--text-soft)] mt-0.5">
                      {cat.products} produto{cat.products !== 1 ? 's' : ''} • {formatCompactCurrency(cat.inventorySalesValue, displayCurrency)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <p className={cn('text-xs font-semibold', color.text)}>
                      {pct.toFixed(0)}%
                    </p>
                    <ChevronRight className={cn('size-4 transition-transform', isSelected && 'rotate-90', color.text)} />
                  </div>
                </div>
                
                {/* Progress bar */}
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

      {/* Category Products Detailed View */}
      {selectedCategory && categoryProducts.length > 0 && (
        <section className="border-t border-[rgba(255,255,255,0.04)] pt-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
            Produtos em "{selectedCategory}"
          </h3>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {categoryProducts.map((product) => (
              <div
                key={product.id}
                className="flex flex-col gap-2 rounded-xl border border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.02)] p-3 text-[11px]"
              >
                {/* Product Name */}
                <p className="font-semibold text-white truncate">{product.name}</p>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Valor */}
                  <div className="rounded px-2 py-1.5 bg-[rgba(52,242,127,0.08)] border border-[rgba(52,242,127,0.12)]">
                    <p className="text-[10px] text-[var(--text-soft)]">Valor</p>
                    <p className="text-xs font-bold text-[#36f57c]">
                      {formatCompactCurrency(product.inventorySalesValue, displayCurrency)}
                    </p>
                  </div>

                  {/* Venda em Potencial (usando inventorySalesValue como base para cálculo) */}
                  <div className="rounded px-2 py-1.5 bg-[rgba(201,168,76,0.08)] border border-[rgba(201,168,76,0.12)]">
                    <p className="text-[10px] text-[var(--text-soft)]">Potencial</p>
                    <p className="text-xs font-bold text-[#C9A84C]">
                      {formatCompactCurrency(product.inventorySalesValue * 1.2, displayCurrency)}
                    </p>
                  </div>
                </div>

                {/* Unidades Discriminadas */}
                <div className="rounded px-2 py-1.5 bg-[rgba(34,101,216,0.08)] border border-[rgba(34,101,216,0.12)]">
                  <p className="text-[10px] text-blue-300">Unidades em Estoque</p>
                  <p className="text-xs font-bold text-blue-300">
                    {Math.ceil(product.inventorySalesValue / 100)} un.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Top Products Section (only show if no category selected) */}
      {!selectedCategory && topProducts.length > 0 && (
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
      )}
    </div>
  )
}
