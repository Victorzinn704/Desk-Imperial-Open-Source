'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import type { CurrencyCode, FinanceSummaryResponse } from '@contracts/contracts'
import { formatCurrency } from '@/lib/currency'
import { MapRankingPanel } from '@/components/dashboard/map-ranking-panel'

type MapTab = 'revenue' | 'orders' | 'profit'

const MapCanvas = dynamic(
  () => import('./map-canvas').then((m) => m.MapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-[var(--text-soft)]">Carregando monitoramento geográfico...</p>
      </div>
    ),
  },
)

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
  const regionCount = points.length
  const coveragePct =
    totalOrderCount && totalOrderCount > 0
      ? Math.min(100, Math.round((points.reduce((s, p) => s + p.orders, 0) / totalOrderCount) * 100))
      : null

  return (
    <div className="space-y-5">
      {/* Status pills */}
      <div className="flex flex-wrap gap-3">
        <StatusPill value={`${regionCount} ${regionCount === 1 ? 'região' : 'regiões'}`} />
        <StatusPill value={`${formatCurrency(mappedRevenue, displayCurrency)} mapeado`} />
        {coveragePct !== null && (
          <StatusPill value={`${coveragePct}% cobertura geocodificada`} />
        )}
      </div>

      {/* Main grid */}
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        {/* Map canvas */}
        <article className="imperial-card overflow-hidden p-0">
          <div className="h-[520px]">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-[var(--text-soft)]">Carregando dados geográficos...</p>
              </div>
            ) : error ? (
              <div className="flex h-full items-center justify-center px-6 text-center">
                <p className="text-sm text-[var(--danger)]">{error}</p>
              </div>
            ) : points.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                  Nenhuma venda mapeada
                </p>
                <p className="max-w-sm text-sm leading-7 text-[var(--text-soft)]">
                  Registre pedidos com <strong className="text-white">estado</strong> e{' '}
                  <strong className="text-white">cidade</strong> informados para ativar o monitoramento geográfico e análise da cobertura de mercado.
                </p>
              </div>
            ) : (
              <MapCanvas displayCurrency={displayCurrency} points={points} tab={tab} />
            )}
          </div>
        </article>

        {/* Ranking panel */}
        {finance ? (
          <MapRankingPanel
            displayCurrency={displayCurrency}
            finance={finance}
            tab={tab}
            onTabChange={setTab}
          />
        ) : (
          <article className="imperial-card p-6">
            <div className="h-full animate-pulse rounded-2xl bg-[rgba(255,255,255,0.04)]" />
          </article>
        )}
      </div>
    </div>
  )
}

function StatusPill({ value }: Readonly<{ value: string }>) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-[rgba(52,242,127,0.2)] bg-[rgba(52,242,127,0.06)] px-4 py-2">
      <span className="relative flex size-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#36f57c] opacity-60" />
        <span className="relative inline-flex size-2 rounded-full bg-[#36f57c]" />
      </span>
      <span className="text-xs font-semibold text-[#8fffb9]">{value}</span>
    </div>
  )
}
