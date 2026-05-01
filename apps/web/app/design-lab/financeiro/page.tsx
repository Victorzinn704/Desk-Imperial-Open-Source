'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { FinanceiroEnvironment } from '@/components/dashboard/environments/financeiro-environment'
import { MapEnvironment } from '@/components/dashboard/environments/map-environment'
import { useDashboardSessionQuery } from '@/components/dashboard/hooks/useDashboardQueries'
import {
  buildDesignLabFinanceiroHref,
  designLabFinanceiroTabs,
  parseDesignLabFinanceiroTab,
} from '@/components/design-lab/design-lab-navigation'
import { LabRouteLoadingState, LabRouteLockedState } from '@/components/design-lab/lab-route-state'
import { LabRouteTabs } from '@/components/design-lab/lab-route-tabs'

function DesignLabFinanceiroPageContent() {
  const searchParams = useSearchParams()
  const sessionQuery = useDashboardSessionQuery()
  const user = sessionQuery.data?.user
  const activeTab = parseDesignLabFinanceiroTab(searchParams.get('tab'))
  const tabs = designLabFinanceiroTabs.map((tab) => ({
    ...tab,
    href: buildDesignLabFinanceiroHref(tab.id),
  }))

  if (sessionQuery.isLoading) {
    return (
      <div className="space-y-6">
        <LabRouteTabs activeId={activeTab} tabs={tabs} />
        <LabRouteLoadingState message="Carregando sessão para abrir financeiro." />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <LabRouteTabs activeId={activeTab} tabs={tabs} />
        <LabRouteLockedState
          ctaLabel="Entrar para liberar financeiro"
          description="Movimentação, fluxo de caixa, DRE, contas e mapa territorial."
          eyebrow="Gestão"
          facts={[
            { label: 'receita', value: 'real' },
            { label: 'fluxo', value: 'caixa' },
            { label: 'DRE', value: 'resultado' },
            { label: 'mapa', value: 'território' },
          ]}
          previewSignals={[
            {
              label: 'movimentação',
              note: 'receita, lucro, pedidos e margem no período',
              tone: 'success',
              value: 'sim',
            },
            {
              label: 'fluxo e DRE',
              note: 'entradas, saídas e resultado sem duplicar métrica',
              tone: 'info',
              value: 'sim',
            },
            {
              label: 'mapa territorial',
              note: 'vendas por região entram como análise financeira, não mapa de salão',
              tone: 'warning',
              value: 'sim',
            },
          ]}
          previewTitle="O que abre no financeiro"
          signals={[
            {
              label: 'dados financeiros',
              note: 'o login libera resumo, pedidos e derivados do período',
              tone: 'success',
              value: 'bloqueado',
            },
            {
              label: 'contas',
              note: 'recebimentos, cancelamentos e pendências ficam por recorte',
              tone: 'info',
              value: 'ao entrar',
            },
            {
              label: 'território',
              note: 'o mapa volta com comportamento claro em light e dark',
              tone: 'warning',
              value: 'real',
            },
          ]}
          title="Financeiro"
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <LabRouteTabs activeId={activeTab} tabs={tabs} />
      {activeTab === 'mapa' ? <MapEnvironment /> : <FinanceiroEnvironment activeTab={activeTab} surface="lab" />}
    </div>
  )
}

export default function DesignLabFinanceiroPage() {
  return (
    <Suspense fallback={null}>
      <DesignLabFinanceiroPageContent />
    </Suspense>
  )
}
