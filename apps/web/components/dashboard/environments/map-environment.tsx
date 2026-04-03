'use client'

import { MapPin } from 'lucide-react'
import { ApiError } from '@/lib/api'
import { useDashboardQueries } from '@/components/dashboard/hooks/useDashboardQueries'
import { DashboardSectionHeading } from '@/components/dashboard/dashboard-section-heading'
import { MapSection } from '@/components/dashboard/map-section'

export function MapEnvironment() {
  const { financeQuery, ordersQuery, sessionQuery } = useDashboardQueries({ section: 'map' })

  const user = sessionQuery.data?.user
  const finance = financeQuery.data
  const financeError = financeQuery.error instanceof ApiError ? financeQuery.error.message : null
  const ordersTotals = ordersQuery.data?.totals

  if (!user) return null

  const displayCurrency = finance?.displayCurrency ?? user.preferredCurrency

  return (
    <section className="space-y-6">
      <DashboardSectionHeading
        description="Visualize a concentração geográfica da operação. Cada ponto representa um local de venda geocodificado automaticamente a partir do estado e cidade do pedido."
        eyebrow="Inteligência territorial"
        icon={MapPin}
        title="Mapa de Vendas — Território de Guerra"
      />
      <MapSection
        displayCurrency={displayCurrency}
        error={financeError}
        finance={finance}
        isLoading={financeQuery.isLoading}
        totalOrderCount={ordersTotals?.completedOrders}
      />
    </section>
  )
}
