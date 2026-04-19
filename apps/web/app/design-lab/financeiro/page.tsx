'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { FinanceiroEnvironment } from '@/components/dashboard/environments/financeiro-environment'
import { MapEnvironment } from '@/components/dashboard/environments/map-environment'
import {
  buildDesignLabFinanceiroHref,
  designLabFinanceiroTabs,
  parseDesignLabFinanceiroTab,
} from '@/components/design-lab/design-lab-navigation'
import { LabRouteTabs } from '@/components/design-lab/lab-route-tabs'

function DesignLabFinanceiroPageContent() {
  const searchParams = useSearchParams()
  const activeTab = parseDesignLabFinanceiroTab(searchParams.get('tab'))
  const tabs = designLabFinanceiroTabs.map((tab) => ({
    ...tab,
    href: buildDesignLabFinanceiroHref(tab.id),
  }))

  return (
    <div className="space-y-6">
      <LabRouteTabs activeId={activeTab} tabs={tabs} />
      {activeTab === 'mapa' ? <MapEnvironment /> : <FinanceiroEnvironment activeTab={activeTab} />}
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
