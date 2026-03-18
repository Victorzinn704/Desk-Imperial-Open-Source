'use client'

import type { CurrencyCode, FinanceSummaryResponse } from '@contracts/contracts'
import { formatCurrency } from '@/lib/currency'
import { cn } from '@/lib/utils'

type MapTab = 'revenue' | 'orders' | 'profit'

const TABS: { id: MapTab; label: string }[] = [
  { id: 'revenue', label: 'Receita' },
  { id: 'orders', label: 'Pedidos' },
  { id: 'profit', label: 'Lucro' },
]

export function MapRankingPanel({
  displayCurrency,
  finance,
  tab,
  onTabChange,
}: Readonly<{
  displayCurrency: CurrencyCode
  finance: FinanceSummaryResponse
  tab: MapTab
  onTabChange: (tab: MapTab) => void
}>) {
  const regions = finance.topRegions ?? []

  const getValue = (r: (typeof regions)[0]) =>
    tab === 'revenue' ? r.revenue : tab === 'orders' ? r.orders : r.profit

  const maxValue = Math.max(1, ...regions.map(getValue))

  return (
    <article className="imperial-card flex flex-col p-6">
      {/* Tabs */}
      <div className="flex gap-1.5 rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-1">
        {TABS.map((t) => (
          <button
            className={cn(
              'flex-1 cursor-pointer rounded-[14px] border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition-all duration-200',
              tab === t.id
                ? 'border-[rgba(52,242,127,0.3)] bg-[rgba(52,242,127,0.1)] text-[#36f57c]'
                : 'border-transparent text-[var(--text-soft)] hover:text-white',
            )}
            key={t.id}
            type="button"
            onClick={() => onTabChange(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Ranking */}
      <div className="mt-5 flex-1 space-y-3 overflow-y-auto">
        {regions.length === 0 ? (
          <div className="flex h-40 items-center justify-center px-4 text-center">
            <p className="text-sm leading-7 text-[var(--text-soft)]">
              Registre pedidos com estado e cidade para ver o ranking de regiões.
            </p>
          </div>
        ) : (
          regions.map((region, i) => {
            const value = getValue(region)
            const pct = maxValue > 0 ? Math.round((value / maxValue) * 100) : 0
            const displayValue =
              tab === 'orders'
                ? String(region.orders)
                : formatCurrency(value, displayCurrency)

            return (
              <div className="imperial-card-soft p-4" key={region.label}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[rgba(52,242,127,0.12)] text-[10px] font-bold text-[#36f57c]">
                        {i + 1}
                      </span>
                      <p className="truncate text-sm font-semibold text-white">{region.label}</p>
                    </div>
                    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
                      <div
                        className="h-full rounded-full bg-[#36f57c] transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-[var(--text-soft)]">
                      {region.orders} venda(s) · lucro {formatCurrency(region.profit, displayCurrency)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-white">{displayValue}</p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-[var(--text-soft)]">{pct}%</p>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </article>
  )
}
