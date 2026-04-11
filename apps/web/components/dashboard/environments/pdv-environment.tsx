'use client'

import { Tags } from 'lucide-react'
import dynamic from 'next/dynamic'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ApiError, fetchOperationsLive } from '@/lib/api'
import { useDashboardQueries } from '@/components/dashboard/hooks/useDashboardQueries'
import { buildOperationsViewModel, OPERATIONS_LIVE_COMPACT_QUERY_KEY } from '@/lib/operations'
import { DashboardSectionHeading } from '@/components/dashboard/dashboard-section-heading'
import { CaixaPanel } from '@/components/dashboard/caixa-panel'
import { PdvBoard } from '@/components/pdv/pdv-board'

const OperationsExecutiveGrid = dynamic(
  () => import('@/components/operations/operations-executive-grid').then((module) => module.OperationsExecutiveGrid),
  {
    ssr: false,
    loading: () => <OperationsPanelSkeleton lines={5} />,
  },
)

const OperationsTimeline = dynamic(
  () => import('@/components/operations/operations-timeline').then((module) => module.OperationsTimeline),
  {
    ssr: false,
    loading: () => <OperationsPanelSkeleton lines={4} />,
  },
)

export function PdvEnvironment() {
  const { productsQuery, sessionQuery } = useDashboardQueries({ section: 'pdv' })

  const user = sessionQuery.data?.user
  const operationsQuery = useQuery({
    queryKey: OPERATIONS_LIVE_COMPACT_QUERY_KEY,
    queryFn: () => fetchOperationsLive({ includeCashMovements: false, compactMode: true }),
    enabled: Boolean(user?.userId),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
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
      stock: p.stock,
      isLowStock: p.isLowStock,
      isCombo: p.isCombo ?? false,
      comboDescription: p.comboDescription ?? null,
      comboItems: p.comboItems ?? [],
    }))
  const operationsView = buildOperationsViewModel(operations)
  const showExecutiveOperations = user?.role === 'OWNER'

  if (!user) {return null}

  return (
    <section className="space-y-6">
      <DashboardSectionHeading
        description="Gerencie comandas abertas, em preparo e prontas. Arraste entre colunas para atualizar o status em tempo real."
        eyebrow="Kanban de comandas"
        icon={Tags}
        title="PDV — Ponto de Venda"
      />
      <PdvBoard operations={operations} products={boardProducts} />
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
            description="Linha do tempo manual dos atendimentos por funcionário e mesa, pensada para leitura rápida sem depender da camada pesada de calendário."
            items={operationsView.timelineItems}
            resources={operationsView.resources}
          />
        </div>
      ) : null}
    </section>
  )
}

function OperationsPanelSkeleton({ lines }: { lines: number }) {
  return (
    <div className="imperial-card space-y-3 p-5">
      {Array.from({ length: lines }).map((_, index) => (
        <div className="h-10 animate-pulse rounded-xl bg-[rgba(255,255,255,0.05)]" key={index} />
      ))}
    </div>
  )
}
