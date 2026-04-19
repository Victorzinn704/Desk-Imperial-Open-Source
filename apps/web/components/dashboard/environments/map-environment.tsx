'use client'

import { Globe2 } from 'lucide-react'
import { ApiError } from '@/lib/api'
import { useDashboardQueries } from '@/components/dashboard/hooks/useDashboardQueries'
import { DashboardSectionHeading } from '@/components/dashboard/dashboard-section-heading'
import { MapSection } from '@/components/dashboard/map-section'

export function MapEnvironment() {
  const { financeQuery, ordersQuery, sessionQuery } = useDashboardQueries({ section: 'map' })

  const user = sessionQuery.data?.user
  if (!user) {
    return null
  }

  const finance = financeQuery.data
  const displayCurrency = finance?.displayCurrency ?? user.preferredCurrency
  const mapError = financeQuery.error instanceof ApiError ? financeQuery.error.message : null
  const totalOrderCount = ordersQuery.data?.totals.completedOrders

  return (
    <section className="space-y-6">
      <DashboardSectionHeading
        description="Mapa operacional de vendas por território para leitura de cobertura geográfica e concentração de receita."
        eyebrow="Inteligência territorial"
        icon={Globe2}
        title="Mapa de vendas"
      />

      <MapSection
        displayCurrency={displayCurrency}
        error={mapError}
        finance={finance}
        isLoading={financeQuery.isLoading}
        totalOrderCount={totalOrderCount}
      />
    </section>
  )
}
