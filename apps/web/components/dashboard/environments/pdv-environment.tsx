'use client'

import { Tags } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { ApiError, fetchOperationsLive } from '@/lib/api'
import { useDashboardQueries } from '@/components/dashboard/hooks/useDashboardQueries'
import { buildOperationsViewModel } from '@/lib/operations'
import { DashboardSectionHeading } from '@/components/dashboard/dashboard-section-heading'
import { CaixaPanel } from '@/components/dashboard/caixa-panel'
import { OperationsExecutiveGrid, OperationsTimeline } from '@/components/operations'
import { PdvBoard } from '@/components/pdv/pdv-board'

export function PdvEnvironment() {
  const { productsQuery, sessionQuery } = useDashboardQueries()

  const user = sessionQuery.data?.user
  const operationsQuery = useQuery({
    queryKey: ['operations', 'live'],
    queryFn: () => fetchOperationsLive(),
    enabled: Boolean(user?.userId),
    refetchInterval: 15_000,
  })

  const products = productsQuery.data?.items ?? []
  const operations = operationsQuery.data
  const operationsError = operationsQuery.error instanceof ApiError ? operationsQuery.error.message : null

  const boardProducts = products
    .filter((product) => product.active)
    .map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      unitPrice: p.unitPrice,
      currency: String(p.currency),
    }))
  const operationsView = buildOperationsViewModel(operations)
  const showExecutiveOperations = user?.role === 'OWNER'

  if (!user) return null

  return (
    <section className="space-y-6">
      <DashboardSectionHeading
        description="Gerencie comandas abertas, em preparo e prontas. Arraste entre colunas para atualizar o status em tempo real."
        eyebrow="Kanban de comandas"
        icon={Tags}
        title="PDV — Ponto de Venda"
      />
      <PdvBoard currentUser={user} operations={operations} products={boardProducts} />
      {showExecutiveOperations ? (
        <div className="space-y-6">
          <CaixaPanel operations={operations} />
          {operationsError ? (
            <div className="imperial-card px-5 py-4 text-sm text-[var(--text-soft)]">
              Nao foi possivel carregar a operacao viva agora. {operationsError}
            </div>
          ) : null}
          <OperationsExecutiveGrid
            description={
              operationsQuery.isLoading
                ? 'Carregando a camada operacional para conectar funcionario, mesa e caixa em uma unica leitura.'
                : 'Leitura consolidada do caixa e das mesas por funcionario, pronta para crescer com o realtime.'
            }
            rows={operationsView.rows}
          />
          <OperationsTimeline
            description="Linha do tempo dos atendimentos por funcionario e mesa, desenhada para evoluir junto do FullCalendar Timeline."
            items={operationsView.timelineItems}
            resources={operationsView.resources}
          />
        </div>
      ) : null}
    </section>
  )
}
