'use client'

import type { CurrencyCode, FinanceSummaryResponse } from '@contracts/contracts'
import { LabFilterChip, LabPanel, LabStatusPill } from '@/components/design-lab/lab-primitives'
import { formatCurrency } from '@/lib/currency'

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
  const topChannel = finance.salesByChannel[0]
  const topCustomer = finance.topCustomers[0]
  const completedOrders = finance.totals.completedOrders

  const getValue = (r: (typeof regions)[0]) => (tab === 'revenue' ? r.revenue : tab === 'orders' ? r.orders : r.profit)

  const maxValue = Math.max(1, ...regions.map(getValue))

  return (
    <LabPanel
      action={<LabStatusPill tone="neutral">{regions.length} regiões</LabStatusPill>}
      padding="md"
      subtitle="Concentração regional por receita, pedidos e lucro."
      title="Ranking territorial"
    >
      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <LabFilterChip
            active={tab === item.id}
            key={item.id}
            label={item.label}
            onClick={() => onTabChange(item.id)}
          />
        ))}
      </div>

      <div className="mt-5 flex-1 space-y-3 overflow-y-auto">
        {regions.length === 0 ? (
          <div className="space-y-3 rounded-[18px] border border-dashed border-[var(--lab-border)] bg-[var(--lab-surface-raised)] p-4">
            <EmptyRankingRow label="regiões lidas" value="0" />
            <EmptyRankingRow label="pedidos na base" value={String(completedOrders)} />
            <EmptyRankingRow label="canal líder" value={topChannel?.channel ?? 'sem leitura'} />
            <EmptyRankingRow label="cliente líder" value={topCustomer?.customerName ?? 'sem leitura'} />
            <p className="pt-1 text-xs leading-6 text-[var(--lab-fg-soft)]">
              Registre pedidos com estado e cidade para transformar essa base em ranking territorial.
            </p>
          </div>
        ) : (
          regions.map((region, i) => {
            const value = getValue(region)
            const pct = maxValue > 0 ? Math.round((value / maxValue) * 100) : 0
            const displayValue = tab === 'orders' ? String(region.orders) : formatCurrency(value, displayCurrency)

            return (
              <div className="rounded-[18px] border border-[var(--lab-border)] bg-[var(--lab-surface-raised)] p-4" key={region.label}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--lab-blue-soft)] text-[10px] font-bold text-[var(--lab-blue)]">
                        {i + 1}
                      </span>
                      <p className="truncate text-sm font-semibold text-[var(--lab-fg)]">{region.label}</p>
                    </div>
                    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[var(--lab-surface-hover)]">
                      <div
                        className="h-full rounded-full bg-[var(--lab-blue)] transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-[var(--lab-fg-soft)]">
                      {region.orders} venda(s) · lucro {formatCurrency(region.profit, displayCurrency)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-[var(--lab-fg)]">{displayValue}</p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-[var(--lab-fg-soft)]">{pct}%</p>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </LabPanel>
  )
}

function EmptyRankingRow({
  label,
  value,
}: Readonly<{
  label: string
  value: string
}>) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--lab-border)] pb-3 last:border-b-0 last:pb-0">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--lab-fg-muted)]">{label}</span>
      <span className="text-sm font-medium text-[var(--lab-fg)]">{value}</span>
    </div>
  )
}
