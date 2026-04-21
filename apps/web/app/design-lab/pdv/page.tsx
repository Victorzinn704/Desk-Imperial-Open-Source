'use client'

import { Suspense, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { PdvEnvironment } from '@/components/dashboard/environments/pdv-environment'
import { useDashboardSessionQuery } from '@/components/dashboard/hooks/useDashboardQueries'
import {
  buildDesignLabPdvHref,
  designLabPdvTabs,
  parseDesignLabPdvTab,
} from '@/components/design-lab/design-lab-navigation'
import { LabRouteLoadingState, LabRouteLockedState } from '@/components/design-lab/lab-route-state'
import { LabRouteTabs } from '@/components/design-lab/lab-route-tabs'

function createIntentRequestId(source: string) {
  let hash = 0

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) | 0
  }

  return Math.abs(hash) || 1
}

function DesignLabPdvPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionQuery = useDashboardSessionQuery()
  const user = sessionQuery.data?.user
  const activeTab = parseDesignLabPdvTab(searchParams.get('tab'))
  const mesaId = searchParams.get('mesaId')?.trim() ?? ''
  const mesaLabel = searchParams.get('mesaLabel')?.trim() ?? ''
  const comandaId = searchParams.get('comanda')?.trim() ?? ''
  const tabs = designLabPdvTabs.map((tab) => ({
    ...tab,
    href: buildDesignLabPdvHref({ tab: tab.id }),
  }))
  const mesaIntentKey = mesaId && mesaLabel ? [mesaId, mesaLabel, comandaId].join('|') : null

  const mesaIntent = useMemo(
    () =>
      mesaIntentKey
        ? {
            mesaId,
            mesaLabel,
            comandaId: comandaId || undefined,
            requestId: createIntentRequestId(mesaIntentKey),
          }
        : null,
    [comandaId, mesaId, mesaIntentKey, mesaLabel],
  )

  if (sessionQuery.isLoading) {
    return (
      <div className="space-y-6">
        <LabRouteTabs activeId={activeTab} tabs={tabs} />
        <LabRouteLoadingState message="Carregando sessão para abrir o PDV." />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <LabRouteTabs activeId={activeTab} tabs={tabs} />
        <LabRouteLockedState
          ctaLabel="Entrar para liberar PDV"
          description="Venda, comanda, cozinha e cobrança no fluxo operacional."
          eyebrow="Operação"
          facts={[
            { label: 'venda', value: 'grid' },
            { label: 'comandas', value: 'abertas' },
            { label: 'cozinha', value: 'KDS' },
            { label: 'cobrança', value: 'final' },
          ]}
          previewSignals={[
            {
              label: 'grid de venda',
              note: 'catálogo, filtros e comanda na mesma superfície operacional',
              tone: 'success',
              value: 'sim',
            },
            {
              label: 'comandas abertas',
              note: 'status, mesa e cliente ficam prontos para ação',
              tone: 'info',
              value: 'sim',
            },
            {
              label: 'cobrança',
              note: 'fechamento fica concentrado em uma comanda por vez',
              tone: 'warning',
              value: 'sim',
            },
          ]}
          previewTitle="O que abre no PDV"
          signals={[
            {
              label: 'produtos reais',
              note: 'o login libera o catálogo ativo do workspace',
              tone: 'success',
              value: 'bloqueado',
            },
            {
              label: 'mesa para PDV',
              note: 'o contexto do salão volta a abrir a comanda certa',
              tone: 'info',
              value: 'ao entrar',
            },
            {
              label: 'cozinha',
              note: 'itens com preparo voltam a alimentar o KDS',
              tone: 'warning',
              value: 'real',
            },
          ]}
          title="PDV / Comandas"
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <LabRouteTabs activeId={activeTab} tabs={tabs} />
      <PdvEnvironment
        mesaIntent={mesaIntent}
        onConsumeMesaIntent={() => {
          router.replace(buildDesignLabPdvHref({ tab: activeTab }), { scroll: false })
        }}
        variant={activeTab}
      />
    </div>
  )
}

export default function DesignLabPdvPage() {
  return (
    <Suspense fallback={null}>
      <DesignLabPdvPageContent />
    </Suspense>
  )
}
