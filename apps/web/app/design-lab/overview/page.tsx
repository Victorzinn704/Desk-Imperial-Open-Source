'use client'

import { DesignLabOverviewEnvironment } from '@/components/dashboard/environments/overview-environment'
import { useDashboardSessionQuery } from '@/components/dashboard/hooks/useDashboardQueries'
import { LabRouteLoadingState, LabRouteLockedState } from '@/components/design-lab/lab-route-state'

export default function DesignLabOverviewPage() {
  const sessionQuery = useDashboardSessionQuery()
  const user = sessionQuery.data?.user

  if (sessionQuery.isLoading) {
    return <LabRouteLoadingState message="Carregando sessão para abrir o overview." />
  }

  if (!user) {
    return (
      <LabRouteLockedState
        ctaLabel="Entrar para liberar overview"
        description="Receita, lucro, ritmo operacional e alertas comerciais em uma visão curta."
        eyebrow="Visão geral"
        facts={[
          { label: 'receita', value: 'real' },
          { label: 'lucro', value: 'período' },
          { label: 'pedidos', value: 'status' },
          { label: 'alertas', value: 'ao vivo' },
        ]}
        previewSignals={[
          {
            label: 'executivo',
            note: 'primeiro bloco resume saúde do negócio sem card decorativo',
            tone: 'success',
            value: 'sim',
          },
          {
            label: 'radar',
            note: 'leitura de canal, produto líder e estoque crítico',
            tone: 'info',
            value: 'sim',
          },
          {
            label: 'operações',
            note: 'pedidos e caixa voltam com dados reais da sessão',
            tone: 'warning',
            value: 'real',
          },
        ]}
        previewTitle="O que abre no overview"
        signals={[
          {
            label: 'receita e lucro',
            note: 'o login libera valores consolidados do financeiro',
            tone: 'success',
            value: 'bloqueado',
          },
          {
            label: 'pedidos fechados',
            note: 'a leitura operacional vem dos pedidos reais do workspace',
            tone: 'info',
            value: 'ao entrar',
          },
          {
            label: 'estoque crítico',
            note: 'alertas aparecem quando produto e financeiro estiverem disponíveis',
            tone: 'warning',
            value: 'real',
          },
        ]}
        title="Overview"
      />
    )
  }

  return <DesignLabOverviewEnvironment />
}
