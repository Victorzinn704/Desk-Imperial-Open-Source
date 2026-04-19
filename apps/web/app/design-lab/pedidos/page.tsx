'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { PedidosEnvironment } from '@/components/dashboard/environments/pedidos-environment'
import {
  buildDesignLabPedidosHref,
  designLabPedidosTabs,
  parseDesignLabPedidosTab,
} from '@/components/design-lab/design-lab-navigation'
import { LabRouteTabs } from '@/components/design-lab/lab-route-tabs'

function DesignLabPedidosPageContent() {
  const searchParams = useSearchParams()
  const activeTab = parseDesignLabPedidosTab(searchParams.get('tab'))
  const tabs = designLabPedidosTabs.map((tab) => ({
    ...tab,
    href: buildDesignLabPedidosHref(tab.id),
  }))
  const resolvedEnvironmentTab = activeTab === 'historico' ? 'timeline' : activeTab

  return (
    <div className="space-y-6">
      <LabRouteTabs activeId={activeTab} tabs={tabs} />
      <PedidosEnvironment activeTab={resolvedEnvironmentTab} />
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
