'use client'

import type { FinanceSummaryResponse } from '@contracts/contracts'
import { formatCompactCurrency } from '@/lib/currency'
import { getFinanceCategoryColor } from './finance-category-colors'

type Props = {
  categoryBreakdown: FinanceSummaryResponse['categoryBreakdown']
  displayCurrency: FinanceSummaryResponse['displayCurrency']
}

export function FinanceDoughnutChart({ categoryBreakdown, displayCurrency }: Props) {
  const data = categoryBreakdown
    .filter((category) => category.inventorySalesValue > 0)
    .map((category) => ({
      name: category.category,
      value: category.inventorySalesValue,
    }))

  if (data.length === 0) {
    return (
      <div className="flex size-[120px] items-center justify-center rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)]">
        <span className="text-xs text-[var(--text-soft)]">Sem dados</span>
      </div>
    )
  }

  const total = data.reduce((sum, item) => sum + item.value, 0)
  const segments = data.map((item, index) => {
    const start = data
      .slice(0, index)
      .reduce((sum, previousItem) => sum + (total > 0 ? (previousItem.value / total) * 100 : 0), 0)
    const share = total > 0 ? (item.value / total) * 100 : 0
    const end = start + share

    return `${getFinanceCategoryColor(index)} ${start.toFixed(2)}% ${end.toFixed(2)}%`
  })

  const topItem = data[0]

  return (
    <div className="relative size-[120px] shrink-0">
      <div
        className="size-full rounded-full"
        style={{
          background: `conic-gradient(${segments.join(', ')})`,
        }}
      />
      <div className="absolute inset-[18px] flex items-center justify-center rounded-full bg-[var(--surface-soft)] p-3 text-center">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">{topItem.name}</p>
          <p className="mt-1 text-xs font-semibold text-[var(--text-primary)]">
            {formatCompactCurrency(topItem.value, displayCurrency)}
          </p>
        </div>
      </div>
    </div>
  )
}
