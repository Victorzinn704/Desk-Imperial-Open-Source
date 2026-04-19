'use client'

import type { FinanceSummaryResponse } from '@contracts/contracts'
import { Package2, TrendingUp } from 'lucide-react'
import { LabPanel, LabStatusPill } from '@/components/design-lab/lab-primitives'
import { formatCurrency } from '@/lib/currency'
import { cn } from '@/lib/utils'

type TopProductsProps = {
  finance?: FinanceSummaryResponse
  isLoading?: boolean
  surface?: 'default' | 'lab'
}

export function OverviewTopProducts({
  finance,
  isLoading = false,
  surface = 'default',
}: Readonly<TopProductsProps>) {
  const displayCurrency = finance?.displayCurrency ?? 'BRL'
  const topProducts = finance?.topProducts?.slice(0, 6) ?? []

  if (surface === 'lab') {
    if (isLoading) {
      return (
        <LabPanel
          title="Top produtos"
          subtitle="Itens com maior tração de receita e margem"
          action={
            <span className="inline-flex items-center gap-2 text-xs text-[var(--lab-fg-muted)]">
              <Package2 className="size-4" />
              carregando
            </span>
          }
          padding="md"
        >
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div className="skeleton-shimmer h-[72px] rounded-2xl" key={i} />
            ))}
          </div>
        </LabPanel>
      )
    }

    return (
      <LabPanel
        title="Top produtos"
        subtitle="Itens que mais puxam venda, margem e ritmo comercial"
        action={<LabStatusPill tone="info">{topProducts.length} itens</LabStatusPill>}
        padding="md"
      >
        {topProducts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--lab-border)] px-5 py-10 text-center text-sm text-[var(--lab-fg-muted)]">
            Sem vendas registradas ainda.
          </div>
        ) : (
          <div className="space-y-3">
            {topProducts.map((product, index) => {
              const maxValue = topProducts[0]?.inventorySalesValue ?? 1
              const widthPercent = Math.max(8, (product.inventorySalesValue / maxValue) * 100)
              const marginPercent = product.marginPercent ?? 0
              const marginTone = marginPercent >= 30 ? 'success' : marginPercent >= 20 ? 'info' : 'warning'

              return (
                <article
                  className="rounded-2xl border border-[var(--lab-border)] bg-[var(--lab-surface-raised)] px-4 py-3"
                  key={product.id}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex size-7 items-center justify-center rounded-full border border-[var(--lab-border)] bg-[var(--lab-surface)] text-xs font-medium text-[var(--lab-fg-muted)]">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[var(--lab-fg)]">{product.name}</p>
                          <p className="mt-1 text-xs text-[var(--lab-fg-muted)]">
                            {product.stock} em estoque · potencial de lucro {formatCurrency(product.potentialProfit, displayCurrency)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[var(--lab-fg)]">
                        {formatCurrency(product.inventorySalesValue, displayCurrency)}
                      </p>
                      <p className="mt-1 text-xs text-[var(--lab-fg-muted)]">receita gerada</p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--lab-surface-hover)]">
                      <div
                        className="h-full rounded-full bg-[var(--lab-blue)] transition-all duration-500"
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="text-xs text-[var(--lab-fg-muted)]">participação relativa</span>
                      <div className="flex items-center gap-2">
                        <LabStatusPill icon={<TrendingUp className="size-3" />} tone={marginTone}>
                          margem {marginPercent.toFixed(1)}%
                        </LabStatusPill>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </LabPanel>
    )
  }

  if (isLoading) {
    return (
      <div className="rounded-[8px] border border-[var(--border-strong)] bg-[var(--surface)] p-5">
        <div className="skeleton-shimmer h-4 w-28 rounded-full" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div className="skeleton-shimmer h-10 rounded-[8px]" key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-[8px] border border-[var(--border-strong)] bg-[var(--surface)] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            Top produtos
          </h3>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">mais vendidos hoje</p>
        </div>
        <span className="font-mono text-xs text-[var(--text-muted)]">{topProducts.length} itens</span>
      </div>

      <div className="mt-5 space-y-3">
        {topProducts.length === 0 ? (
          <p className="py-8 text-center text-xs text-[var(--text-muted)]">Sem vendas registradas ainda</p>
        ) : (
          topProducts.map((product, index) => {
            const maxValue = topProducts[0]?.inventorySalesValue ?? 1
            const widthPercent = Math.max(8, (product.inventorySalesValue / maxValue) * 100)
            const opacity = Math.max(0.34, 0.9 - index * 0.12)

            return (
              <div key={product.id}>
                <div className="flex items-center justify-between">
                  <span className="truncate pr-3 text-sm text-[var(--text-primary)]">{product.name}</span>
                  <div className="flex items-center gap-2 font-mono text-[11px] text-[var(--text-soft)]">
                    <span>{product.stock}x</span>
                    <span className="font-semibold text-[var(--text-primary)]">
                      {formatCurrency(product.inventorySalesValue, displayCurrency)}
                    </span>
                  </div>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-soft)]">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500')}
                    style={{
                      width: `${widthPercent}%`,
                      backgroundColor: `color-mix(in srgb, var(--accent) ${Math.round(opacity * 100)}%, transparent)`,
                    }}
                  />
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
