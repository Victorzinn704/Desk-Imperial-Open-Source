'use client'

import { Suspense, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { PdvEnvironment } from '@/components/dashboard/environments/pdv-environment'
import {
  buildDesignLabPdvHref,
  designLabPdvTabs,
  parseDesignLabPdvTab,
} from '@/components/design-lab/design-lab-navigation'
import { LabRouteTabs } from '@/components/design-lab/lab-route-tabs'

function DesignLabPdvPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = parseDesignLabPdvTab(searchParams.get('tab'))
  const mesaId = searchParams.get('mesaId')?.trim() ?? ''
  const mesaLabel = searchParams.get('mesaLabel')?.trim() ?? ''
  const comandaId = searchParams.get('comanda')?.trim() ?? ''
  const tabs = designLabPdvTabs.map((tab) => ({
    ...tab,
    href: buildDesignLabPdvHref({ tab: tab.id }),
  }))

  const mesaIntent = useMemo(
    () =>
      mesaId && mesaLabel
        ? {
            mesaId,
            mesaLabel,
            comandaId: comandaId || undefined,
            requestId: Date.now(),
          }
        : null,
    [comandaId, mesaId, mesaLabel],
  )

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
