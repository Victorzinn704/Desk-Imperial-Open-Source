'use client'

import { TrendingDown, TrendingUp } from 'lucide-react'
import { CardRowSkeleton } from '@/components/shared/skeleton'
import { usePillars } from '@/hooks/use-pillars'

export function PillarsExecutiveCard() {
  const { data: pillars, isLoading, error } = usePillars()

  if (isLoading) {
    return <CardRowSkeleton rows={5} />
  }

  if (error || !pillars) {
    return <div className="text-sm text-[var(--text-soft)]">Erro ao carregar pilares.</div>
  }

  const pillarsList = [
    pillars.weeklyRevenue,
    pillars.monthlyRevenue,
    pillars.profit,
    pillars.eventRevenue,
    pillars.normalRevenue,
  ]

  return (
    <div className="space-y-4">
      {pillarsList.map((pillar) => (
        <div className="imperial-card-soft p-5" key={pillar.label}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-soft)]">{pillar.label}</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: pillar.currency,
                  minimumFractionDigits: 2,
                }).format(pillar.value)}
              </p>
              {pillar.changePercent !== 0 && (
                <div className="mt-2 flex items-center gap-1">
                  {pillar.changePercent > 0 ? (
                    <TrendingUp className="size-4 text-green-500" />
                  ) : (
                    <TrendingDown className="size-4 text-red-500" />
                  )}
                  <span className={pillar.changePercent > 0 ? 'text-green-500' : 'text-red-500'}>
                    {pillar.changePercent > 0 ? '+' : ''}
                    {pillar.changePercent}%
                  </span>
                </div>
              )}
            </div>

            {/* Mini sparkline */}
            <div className="flex h-10 items-end gap-1">
              {pillar.trend.map((value, i) => {
                const maxValue = Math.max(...pillar.trend)
                const minValue = Math.min(...pillar.trend)
                const range = maxValue - minValue || 1
                const height = ((value - minValue) / range) * 100

                return (
                  <div
                    className="w-1 rounded-sm bg-[var(--accent)] opacity-60"
                    key={i}
                    style={{ height: `${Math.max(20, height)}%` }}
                  />
                )
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
