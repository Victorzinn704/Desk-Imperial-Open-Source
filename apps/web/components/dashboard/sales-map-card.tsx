'use client'

import dynamic from 'next/dynamic'
import { Globe2, type LucideIcon, MapPinned } from 'lucide-react'
import { ChartSkeleton } from '@/components/shared/skeleton'
import type { FinanceSummaryResponse } from '@contracts/contracts'
import { formatCurrency } from '@/lib/currency'

const SalesMapCanvas = dynamic(() => import('./sales-map-canvas').then((module) => module.SalesMapCanvas), {
  ssr: false,
  loading: () => (
    <div className="imperial-card-soft flex h-full items-center justify-center border-dashed px-6 text-center">
      <p className="text-sm text-[var(--text-soft)]">Carregando mapa de vendas...</p>
    </div>
  ),
})

export function SalesMapCard({
  finance,
  isLoading = false,
  error = null,
}: Readonly<{
  finance?: FinanceSummaryResponse
  isLoading?: boolean
  error?: string | null
}>) {
  const points = finance?.salesMap ?? []
  const topRegions = finance?.topRegions ?? []
  const displayCurrency = finance?.displayCurrency ?? 'BRL'

  return (
    <section className="grid gap-4 xl:grid-cols-[1.18fr_0.82fr] xl:items-start">
      <article className="imperial-card p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8fffb9]">Inteligência Operacional</p>
            <h2 className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">
              Mapa de Vendas — Monitoramento Geográfico
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-soft)]">
              Monitore a operação em tempo real através da geolocalização automática de cada venda. Cada ponto
              representa um pedido geocodificado por estado e cidade, permitindo análise de mercado, identificação de
              territórios de concentração e validação de padrões de cobertura.
            </p>
          </div>

          <div className="imperial-card-stat px-4 py-3 text-sm text-[var(--text-soft)]">
            {points.length
              ? `${points.length} região(ões) mapeada(s)`
              : 'Complete a localização (cidade e país) nos pedidos para visualizar'}
          </div>
        </div>

        <div className="mt-6 h-[420px] overflow-hidden rounded-[30px] border border-[var(--border)] bg-[var(--surface-soft)]">
          {isLoading ? (
            <ChartSkeleton />
          ) : error ? (
            <div className="flex h-full items-center justify-center px-6 text-center">
              <p className="text-sm text-[var(--danger)]">{error}</p>
            </div>
          ) : points.length ? (
            <SalesMapCanvas displayCurrency={displayCurrency} points={points} />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                  Dados não disponíveis
                </p>
                <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">
                  Complete os dados de localização (bairro, cidade, estado e país) nos pedidos para gerar a análise
                  geográfica.
                </p>
              </div>
            </div>
          )}
        </div>
      </article>

      <article className="imperial-card p-7">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl border border-[rgba(52,242,127,0.2)] bg-[rgba(52,242,127,0.08)] text-[#36f57c]">
            <MapPinned className="size-5" />
          </span>
          <div>
            <p className="text-sm text-[var(--text-soft)]">Desempenho regional</p>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Regiões de maior receita</h2>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <MapMetric
            hint="Total de receita das regiões mapeadas"
            icon={Globe2}
            label="Receita mapeada"
            value={formatCurrency(
              points.reduce((total, point) => total + point.revenue, 0),
              displayCurrency,
            )}
          />
          <MapMetric
            hint="Pedidos usados no mapa"
            icon={MapPinned}
            label="Pedidos mapeados"
            value={String(points.reduce((total, point) => total + point.orders, 0))}
          />
        </div>

        <div className="mt-6 space-y-3">
          {topRegions.length ? (
            topRegions.map((region) => (
              <div className="imperial-card-soft p-4" key={region.label}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">{region.label}</p>
                    <p className="mt-2 text-sm text-[var(--text-soft)]">
                      {region.orders} venda(s) • lucro {formatCurrency(region.profit, displayCurrency)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {formatCurrency(region.revenue, displayCurrency)}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">receita</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="imperial-card-soft border-dashed px-5 py-8 text-center">
              <p className="text-sm leading-7 text-[var(--text-soft)]">
                As regiões aparecem conforme os pedidos são registrados com dados completos de localização.
              </p>
            </div>
          )}
        </div>
      </article>
    </section>
  )
}

function MapMetric({
  hint,
  icon: Icon,
  label,
  value,
}: Readonly<{
  hint: string
  icon: LucideIcon
  label: string
  value: string
}>) {
  return (
    <div className="imperial-card-stat p-4">
      <span className="flex size-10 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[rgba(143,183,255,0.08)] text-[var(--info)]">
        <Icon className="size-4" />
      </span>
      <p className="mt-4 text-sm text-[var(--text-soft)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{value}</p>
      <p className="mt-2 text-sm text-[var(--text-soft)]">{hint}</p>
    </div>
  )
}
