'use client'

import type { FinanceSummaryResponse } from '@contracts/contracts'
import { formatCompactCurrency } from '@/lib/currency'
import { buildFinanceCategoryMixRows } from './finance-category-mix'

type Props = {
  categoryBreakdown: FinanceSummaryResponse['categoryBreakdown']
  displayCurrency: FinanceSummaryResponse['displayCurrency']
  size?: 'md' | 'sm'
}

export function FinanceDoughnutChart({ categoryBreakdown, displayCurrency, size = 'md' }: Props) {
  const rows = buildFinanceCategoryMixRows(categoryBreakdown, categoryBreakdown.length)
  const data = rows.map((category) => ({
    color: category.color,
    name: category.category,
    share: category.share,
    value: category.inventorySalesValue,
  }))
  const sizeClass = size === 'sm' ? 'size-[104px]' : 'size-[120px]'
  const innerClass = size === 'sm' ? 'inset-[16px] p-2' : 'inset-[18px] p-3'

  if (data.length === 0) {
    return (
      <div
        className={`flex ${sizeClass} items-center justify-center rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)]`}
      >
        <span className="text-xs text-[var(--text-soft)]">Sem dados</span>
      </div>
    )
  }

  const segments = data.map((item, index) => {
    const start = data.slice(0, index).reduce((sum, previousItem) => sum + previousItem.share, 0)
    const end = start + item.share

    return `${item.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`
  })

  const topItem = data[0]

  return (
    <div className={`relative ${sizeClass} shrink-0`}>
      <div
        className="size-full rounded-full"
        style={{
          background: `conic-gradient(${segments.join(', ')})`,
        }}
      />
      <div
        className={`absolute ${innerClass} flex items-center justify-center rounded-full bg-[var(--surface-soft)] text-center`}
      >
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
            {topItem.name}
          </p>
          <p className="mt-1 text-xs font-semibold text-[var(--text-primary)]">
            {formatCompactCurrency(topItem.value, displayCurrency)}
          </p>
        </div>
      </div>
    </div>
  )
}
