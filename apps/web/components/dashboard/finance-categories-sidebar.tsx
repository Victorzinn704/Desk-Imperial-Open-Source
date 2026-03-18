'use client'

import type { FinanceSummaryResponse } from '@contracts/contracts'
import { formatCompactCurrency } from '@/lib/currency'
import { cn } from '@/lib/utils'

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

  const total = categoryBreakdown.reduce((sum, c) => sum + c.inventorySalesValue, 0)

  if (isLoading) {
    return (
      <div className="imperial-card animate-pulse space-y-4 p-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-[rgba(255,255,255,0.04)]" />
        ))}
      </div>
    )
  }

  return (
    <div className="imperial-card flex flex-col gap-6 p-6">
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
          Top categorias
        </h2>

        <div className="space-y-3">
          {categoryBreakdown.slice(0, 6).map((cat, i) => {
            const pct = total > 0 ? (cat.inventorySalesValue / total) * 100 : 0
            const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length]

            return (
              <div key={cat.category} className={cn('flex flex-col gap-2 rounded-xl p-3', color.bg)}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">{cat.category}</p>
                  <p className={cn('text-xs font-semibold', color.text)}>
                    {pct.toFixed(0)}%
                  </p>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
                  <div
                    className={cn('h-full rounded-full transition-all duration-700', color.bar)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-[var(--text-soft)]">
                    {cat.products} produto{cat.products !== 1 ? 's' : ''}
                  </p>
                  <p className="text-[11px] text-[var(--text-soft)]">
                    {formatCompactCurrency(cat.inventorySalesValue, displayCurrency)}
                  </p>
                </div>
              </div>
            )
          })}

          {categoryBreakdown.length === 0 && (
            <p className="text-sm text-[var(--text-soft)]">Nenhuma categoria encontrada.</p>
          )}
        </div>
      </section>

      {topProducts.length > 0 && (
        <section>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
            Top produtos
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
