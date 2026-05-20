import { redirect } from 'next/navigation'
import {
  dashboardDefaultSection,
  dashboardDefaultSettingsSection,
  getDashboardDisplayTab,
  parseDashboardSectionParam,
  parseDashboardSettingsSectionParam,
  parseDashboardTabParam,
} from '@/components/dashboard/dashboard-navigation'
import {
  buildDesignLabFinanceiroHref,
  buildDesignLabHref,
  parseDesignLabFinanceiroTab,
  mapDashboardLocationToDesignLabHref,
} from '@/components/design-lab/design-lab-navigation'

type DashboardPageProps = {
  searchParams?: Promise<{
    panel?: string
    tab?: string
    view?: string
  }>
}

export default async function DashboardPage({ searchParams }: Readonly<DashboardPageProps>) {
  const params = (await searchParams) ?? {}
  const standaloneHref = resolveStandaloneDashboardHref(params)
  if (standaloneHref) {
    redirect(standaloneHref)
  }

  const requestedSection = parseDashboardSectionParam(params.view) ?? dashboardDefaultSection
  const parsedTab = parseDashboardTabParam(requestedSection, params.tab)
  const initialTab = getDashboardDisplayTab(requestedSection, parsedTab)
  const initialSettingsSection = parseDashboardSettingsSectionParam(params.panel) ?? dashboardDefaultSettingsSection

  redirect(
    mapDashboardLocationToDesignLabHref({
      sectionId: requestedSection,
      settingsSectionId: initialSettingsSection,
      tabId: initialTab,
    }),
  )
}

function resolveStandaloneDashboardHref({ tab, view }: { tab?: string; view?: string }) {
  const normalizedView = view?.trim().toLowerCase()

  if (normalizedView === 'ia' || normalizedView === 'ai') {
    return buildDesignLabHref('ia')
  }

  if (normalizedView === 'cozinha' || normalizedView === 'kds') {
    return buildDesignLabHref('cozinha')
  }

  if (normalizedView === 'financeiro' || normalizedView === 'finance' || normalizedView === 'financial') {
    return buildDesignLabFinanceiroHref(parseDesignLabFinanceiroTab(tab))
  }

  return null
}
