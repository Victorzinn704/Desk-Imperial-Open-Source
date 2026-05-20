'use client'

import { ChevronRight } from 'lucide-react'
import type { FinanceSummaryResponse } from '@contracts/contracts'
import { formatCompactCurrency } from '@/lib/currency'
import { getFinanceCategoryColor } from './finance-category-colors'
import { CATEGORY_TONES } from './finance-category-flow.shared'

type FinanceCategoryFlowListProps = Readonly<{
  currency: FinanceSummaryResponse['displayCurrency']
  onSelectCategory: (category: string) => void
  rows: FinanceSummaryResponse['categoryBreakdown']
  total: number
}>

export function FinanceCategoryFlowList({ currency, onSelectCategory, rows, total }: FinanceCategoryFlowListProps) {
  if (rows.length === 0) {
    return (
      <p className="rounded-[16px] border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--text-soft)]">
        Nenhuma categoria encontrada.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {rows.slice(0, 6).map((category, index) => (
        <FinanceCategoryFlowListItem
          category={category}
          currency={currency}
          index={index}
          key={category.category}
          total={total}
          onSelectCategory={onSelectCategory}
        />
      ))}
    </div>
  )
}

function FinanceCategoryFlowListItem({
  category,
  currency,
  index,
  onSelectCategory,
  total,
}: Readonly<{
  category: FinanceSummaryResponse['categoryBreakdown'][number]
  currency: FinanceSummaryResponse['displayCurrency']
  index: number
  onSelectCategory: (category: string) => void
  total: number
}>) {
  const pct = total > 0 ? (category.inventorySalesValue / total) * 100 : 0
  const tone = CATEGORY_TONES[index % CATEGORY_TONES.length]

  return (
    <button
      className="w-full rounded-[16px] border p-3 text-left transition active:scale-[0.99]"
      style={{ background: tone.bg, borderColor: tone.border }}
      type="button"
      onClick={() => onSelectCategory(category.category)}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{category.category}</p>
          <p className="mt-0.5 text-[10px] text-[var(--text-soft)]">
            {category.products} produto{category.products === 1 ? '' : 's'} ·{' '}
            {formatCompactCurrency(category.inventorySalesValue, currency)}
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
}
