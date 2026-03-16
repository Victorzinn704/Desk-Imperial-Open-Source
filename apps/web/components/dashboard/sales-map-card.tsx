'use client'

import dynamic from 'next/dynamic'
import type { LucideIcon } from 'lucide-react'
import { Globe2, MapPinned } from 'lucide-react'
import type { FinanceSummaryResponse } from '@contracts/contracts'
import { formatCurrency } from '@/lib/currency'

const SalesMapCanvas = dynamic(
  () => import('./sales-map-canvas').then((module) => module.SalesMapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center rounded-[28px] border border-dashed border-[var(--border-strong)] bg-[var(--surface-soft)] px-6 text-center">
        <p className="text-sm text-[var(--text-soft)]">Carregando mapa de vendas...</p>
      </div>
    ),
  },
)

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
    <section className="grid gap-4 xl:grid-cols-[1.18fr_0.82fr]">
      <article className="rounded-[36px] border border-[rgba(255,255,255,0.08)] bg-[var(--surface)] p-7 shadow-[var(--shadow-panel)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8fffb9]">
              Mapa de vendas
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-white">
              Onde a operacao converte melhor por regiao
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-soft)]">
              O mapa consolida vendas por bairro, cidade e estado para destacar concentracao geografica com leitura mais executiva.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--text-soft)]">
            {points.length
              ? `${points.length} ponto(s) geocodificado(s)`
              : 'Adicione cidade e pais nos pedidos para preencher o mapa'}
          </div>
        </div>

        <div className="mt-6 h-[420px] overflow-hidden rounded-[30px] border border-[var(--border)] bg-[var(--surface-soft)]">
          {isLoading ? (
            <div className="flex h-full items-center justify-center px-6 text-center">
              <p className="text-sm text-[var(--text-soft)]">Carregando vendas geograficas...</p>
            </div>
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
                  Sem pontos no mapa
                </p>
                <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">
                  Registre pedidos com bairro/regiao, cidade e pais para liberar a leitura geografica do dashboard.
                </p>
              </div>
            </div>
          )}
        </div>
      </article>

      <article className="rounded-[36px] border border-[rgba(255,255,255,0.08)] bg-[var(--surface)] p-7 shadow-[var(--shadow-panel)]">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl border border-[rgba(52,242,127,0.2)] bg-[rgba(52,242,127,0.08)] text-[#36f57c]">
            <MapPinned className="size-5" />
          </span>
          <div>
            <p className="text-sm text-[var(--text-soft)]">Ranking regional</p>
            <h2 className="text-xl font-semibold text-white">Top regioes de venda</h2>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <MapMetric
            hint="Faturamento com coordenadas validas"
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
              <div
                className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-soft)] p-4"
                key={region.label}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-white">{region.label}</p>
                    <p className="mt-2 text-sm text-[var(--text-soft)]">
                      {region.orders} venda(s) • lucro {formatCurrency(region.profit, displayCurrency)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">
                      {formatCurrency(region.revenue, displayCurrency)}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">
                      receita
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[24px] border border-dashed border-[var(--border-strong)] bg-[var(--surface-soft)] px-5 py-8 text-center">
              <p className="text-sm leading-7 text-[var(--text-soft)]">
                As regioes aparecem aqui conforme os pedidos forem sendo registrados com local da venda.
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
    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-soft)] p-4">
      <span className="flex size-10 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[rgba(143,183,255,0.08)] text-[var(--info)]">
        <Icon className="size-4" />
      </span>
      <p className="mt-4 text-sm text-[var(--text-soft)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-[var(--text-soft)]">{hint}</p>
    </div>
  )
}
