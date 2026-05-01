'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { PedidosEnvironment } from '@/components/dashboard/environments/pedidos-environment'
import { useDashboardSessionQuery } from '@/components/dashboard/hooks/useDashboardQueries'
import {
  buildDesignLabPedidosHref,
  designLabPedidosTabs,
  parseDesignLabPedidosTab,
} from '@/components/design-lab/design-lab-navigation'
import { LabRouteLoadingState, LabRouteLockedState } from '@/components/design-lab/lab-route-state'
import { LabRouteTabs } from '@/components/design-lab/lab-route-tabs'

function DesignLabPedidosPageContent() {
  const searchParams = useSearchParams()
  const sessionQuery = useDashboardSessionQuery()
  const user = sessionQuery.data?.user
  const activeTab = parseDesignLabPedidosTab(searchParams.get('tab'))
  const tabs = designLabPedidosTabs.map((tab) => ({
    ...tab,
    href: buildDesignLabPedidosHref(tab.id),
  }))

  if (sessionQuery.isLoading) {
    return (
      <div className="space-y-6">
        <LabRouteTabs activeId={activeTab} tabs={tabs} />
        <LabRouteLoadingState message="Carregando sessão para abrir pedidos." />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <LabRouteTabs activeId={activeTab} tabs={tabs} />
        <LabRouteLockedState
          ctaLabel="Entrar para liberar pedidos"
          description="Auditoria operacional por tabela, timeline, kanban, detalhe e histórico."
          eyebrow="Operação"
          facts={[
            { label: 'tabela', value: 'filtros' },
            { label: 'timeline', value: 'ordem' },
            { label: 'kanban', value: 'status' },
            { label: 'histórico', value: 'auditoria' },
          ]}
          previewSignals={[
            {
              label: 'tabela',
              note: 'leitura densa com totais, filtros e exportação',
              tone: 'success',
              value: 'sim',
            },
            {
              label: 'timeline',
              note: 'sequência cronológica para entender fluxo de atendimento',
              tone: 'info',
              value: 'sim',
            },
            {
              label: 'kanban',
              note: 'colunas de status, incluindo cancelamento como hipótese operacional',
              tone: 'warning',
              value: 'sim',
            },
          ]}
          previewTitle="O que abre em pedidos"
          signals={[
            {
              label: 'pedidos reais',
              note: 'o login libera os pedidos do workspace e seus status',
              tone: 'success',
              value: 'bloqueado',
            },
            {
              label: 'histórico',
              note: 'a auditoria consolidada deixa de depender de dados demo',
              tone: 'info',
              value: 'ao entrar',
            },
            {
              label: 'cancelamento',
              note: 'o fluxo visual já considera pedido cancelado como coluna e evento',
              tone: 'warning',
              value: 'previsto',
            },
          ]}
          title="Pedidos"
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <LabRouteTabs activeId={activeTab} tabs={tabs} />
      <PedidosEnvironment activeTab={activeTab} surface="lab" />
    </div>
  )
}

export default function DesignLabPedidosPage() {
  return (
    <Suspense fallback={null}>
      <DesignLabPedidosPageContent />
    </Suspense>
  )
}
