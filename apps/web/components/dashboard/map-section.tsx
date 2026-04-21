'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import type { CurrencyCode, FinanceSummaryResponse } from '@contracts/contracts'
import { MapRankingPanel } from '@/components/dashboard/map-ranking-panel'
import { LabEmptyState, LabFactPill, LabPanel, LabStatusPill } from '@/components/design-lab/lab-primitives'
import { formatCurrency } from '@/lib/currency'

type MapTab = 'revenue' | 'orders' | 'profit'

const MapCanvas = dynamic(() => import('./map-canvas').then((m) => m.MapCanvas), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[520px] items-center justify-center">
      <p className="text-sm text-[var(--lab-fg-soft)]">Carregando monitoramento geográfico...</p>
    </div>
  ),
})

export function MapSection({
  displayCurrency,
  error = null,
  finance,
  isLoading = false,
  totalOrderCount,
}: Readonly<{
  displayCurrency: CurrencyCode
  error?: string | null
  finance?: FinanceSummaryResponse
  isLoading?: boolean
  totalOrderCount?: number
}>) {
  const [tab, setTab] = useState<MapTab>('revenue')

  const points = finance?.salesMap ?? []
  const mappedRevenue = points.reduce((s, p) => s + p.revenue, 0)
  const mappedOrders = points.reduce((s, p) => s + p.orders, 0)
  const regionCount = points.length
  const coveragePct =
    totalOrderCount && totalOrderCount > 0
      ? Math.min(100, Math.round((mappedOrders / totalOrderCount) * 100))
      : null
  const topChannel = finance?.salesByChannel[0]
  const topCustomer = finance?.topCustomers[0]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        <LabFactPill label="regiões" value={String(regionCount)} />
        <LabFactPill label="receita mapeada" value={formatCurrency(mappedRevenue, displayCurrency)} />
        {coveragePct !== null ? <LabFactPill label="cobertura" value={`${coveragePct}%`} /> : null}
        {topChannel ? <LabFactPill label="canal líder" value={topChannel.channel} /> : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px] xl:items-start">
        <LabPanel
          action={
            <LabStatusPill tone={points.length > 0 ? 'info' : 'neutral'}>
              {tab === 'revenue' ? 'receita' : tab === 'orders' ? 'pedidos' : 'lucro'}
            </LabStatusPill>
          }
          contentClassName="p-0"
          padding="none"
          subtitle="Leitura geográfica da receita, volume e resultado por região."
          title="Cobertura geográfica"
        >
          <div className="h-[520px]">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-[var(--lab-fg-soft)]">Carregando dados geográficos...</p>
              </div>
            ) : error ? (
              <div className="flex h-full items-center justify-center px-6 text-center">
                <p className="text-sm text-[var(--lab-danger)]">{error}</p>
              </div>
            ) : points.length === 0 ? (
              <div className="grid h-full gap-5 px-6 py-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-center">
                <div className="space-y-5">
                  <LabEmptyState
                    compact
                    description="Os pedidos já existem, mas ainda não carregam cidade e estado suficientes para ligar a camada territorial."
                    title="Nenhuma venda mapeada"
                  />
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <LabFactPill label="pedidos na base" value={String(totalOrderCount ?? 0)} />
                    <LabFactPill label="cobertura atual" value={coveragePct !== null ? `${coveragePct}%` : '0%'} />
                    <LabFactPill label="regiões lidas" value={String(regionCount)} />
                  </div>
                </div>

                <div className="rounded-2xl border border-dashed border-[var(--lab-border)] bg-[var(--lab-surface-raised)] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--lab-fg-muted)]">
                    Como ativar
                  </p>
                  <div className="mt-4 space-y-3">
                    <MapSignalRow label="estado e cidade" value="obrigatórios no pedido" />
                    <MapSignalRow
                      label="canal líder"
                      value={topChannel?.channel ?? 'sem leitura'}
                    />
                    <MapSignalRow
                      label="cliente líder"
                      value={topCustomer?.customerName ?? 'sem leitura'}
                    />
                    <MapSignalRow
                      label="próximo passo"
                      value="capturar localização no checkout"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <MapCanvas displayCurrency={displayCurrency} points={points} tab={tab} />
            )}
          </div>
        </LabPanel>

        {finance ? (
          <MapRankingPanel displayCurrency={displayCurrency} finance={finance} tab={tab} onTabChange={setTab} />
        ) : (
          <LabPanel padding="md" title="Ranking territorial">
            <div className="h-48 animate-pulse rounded-2xl bg-[var(--lab-surface-hover)]" />
          </LabPanel>
        )}
      </div>
    </div>
  )
}

function MapSignalRow({
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
