'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  dashboardDefaultSettingsSection,
  parseDashboardSettingsSectionParam,
} from '@/components/dashboard/dashboard-navigation'
import { SettingsEnvironment } from '@/components/dashboard/environments/settings-environment'
import {
  buildDesignLabConfigHref,
  mapDashboardSectionToDesignLabHref,
} from '@/components/design-lab/design-lab-navigation'

function DesignLabConfigPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeSettingsSection =
    parseDashboardSettingsSectionParam(searchParams.get('tab')) ?? dashboardDefaultSettingsSection

  return (
    <SettingsEnvironment
      activeSettingsSection={activeSettingsSection}
      presentation="lab"
      onNavigateSection={(sectionId) => {
        router.push(mapDashboardSectionToDesignLabHref(sectionId))
      }}
      onSettingsSectionChange={(sectionId) => {
        router.replace(buildDesignLabConfigHref(sectionId), { scroll: false })
      }}
    />
  )
}

export default function DesignLabConfigPage() {
  return (
    <Suspense fallback={null}>
      <DesignLabConfigPageContent />
    </Suspense>
  )
}
