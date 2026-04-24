'use client'

import type { FinanceSummaryResponse } from '@contracts/contracts'
import { buildFinanceCategoryMixRows } from '@/components/dashboard/finance-category-mix'
import { FinanceDoughnutChart } from '@/components/dashboard/finance-doughnut-chart'
import { formatCurrency } from '@/lib/currency'

export function OwnerFinanceCategoryMix({
  categoryBreakdown,
  displayCurrency,
}: Readonly<{
  categoryBreakdown: FinanceSummaryResponse['categoryBreakdown']
  displayCurrency: FinanceSummaryResponse['displayCurrency']
}>) {
  const rows = buildFinanceCategoryMixRows(categoryBreakdown, 4)

  if (rows.length === 0) {
    return null
  }

  return (
    <section className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft,#7a8896)]">
              Mix por categoria
            </p>
            <p className="mt-1 text-xs leading-5 text-[var(--text-soft)]">
              Peso comercial do período no bolso do dono.
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1 text-[10px] font-semibold text-[var(--text-primary)]">
            {rows.length} faixas
          </span>
        </div>
      </div>

      <div className="grid gap-4 px-4 py-4 min-[420px]:grid-cols-[104px_minmax(0,1fr)] min-[420px]:items-center">
        <div className="flex justify-center min-[420px]:justify-start">
          <FinanceDoughnutChart categoryBreakdown={categoryBreakdown} displayCurrency={displayCurrency} size="sm" />
        </div>

        <div className="divide-y divide-[var(--border)]">
          {rows.map((category) => (
            <OwnerFinanceCategoryRow
              category={category.category}
              color={category.color}
              currency={displayCurrency}
              key={category.category}
              share={category.share}
              value={category.inventorySalesValue}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function OwnerFinanceCategoryRow({
  category,
  color,
  currency,
  share,
  value,
}: {
  category: string
  color: string
  currency: FinanceSummaryResponse['displayCurrency']
  share: number
  value: number
}) {
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="size-2.5 shrink-0 rounded-full" style={{ background: color }} />
          <span className="truncate text-sm font-semibold text-[var(--text-primary)]">{category}</span>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold text-[var(--text-primary)]">{formatCurrency(value, currency)}</p>
          <p className="text-[10px] text-[var(--text-soft)]">{share.toFixed(1).replace('.', ',')}%</p>
        </div>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]">
        <div
          className="h-full rounded-full"
          style={{ background: color, width: `${Math.max(10, Math.min(share, 100))}%` }}
        />
      </div>
    </div>
  )
}
