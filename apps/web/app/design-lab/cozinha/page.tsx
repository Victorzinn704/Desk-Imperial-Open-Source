'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ChefHat } from 'lucide-react'
import { LabPageHeader, LabPanel } from '@/components/design-lab/lab-primitives'
import { KitchenOrdersView } from '@/components/staff-mobile/kitchen-orders-view'
import { ApiError, fetchOperationsKitchen } from '@/lib/api'
import { OPERATIONS_KITCHEN_QUERY_KEY } from '@/lib/operations'

export default function DesignLabCozinhaPage() {
  const kitchenQuery = useQuery({
    queryKey: OPERATIONS_KITCHEN_QUERY_KEY,
    queryFn: () => fetchOperationsKitchen(),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })
  const errorMessage = kitchenQuery.error instanceof ApiError ? kitchenQuery.error.message : null

  return (
    <section className="space-y-5">
      <LabPageHeader
        description="Fila real da cozinha com atualização de status e leitura operacional do preparo."
        eyebrow="Operação da cozinha"
        title="Cozinha / KDS"
        meta={
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--lab-border)] pb-3">
              <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--lab-fg-muted)]">itens vivos</span>
              <span className="text-sm font-semibold text-[var(--lab-fg)]">{kitchenQuery.data?.items.length ?? 0}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[var(--lab-fg-soft)]">
              <ChefHat className="size-4 text-[var(--accent)]" />
              fluxo operacional em tempo real
            </div>
          </div>
        }
      />
      <LabPanel padding="none">
        <KitchenOrdersView
          data={kitchenQuery.data}
          errorMessage={errorMessage}
          isLoading={kitchenQuery.isLoading}
          queryKey={OPERATIONS_KITCHEN_QUERY_KEY}
        />
      </LabPanel>
    </section>
  )
}
