import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import {
  dashboardDefaultSection,
  dashboardDefaultSettingsSection,
  getDashboardDisplaySection,
  getDashboardDisplayTab,
  parseDashboardTabParam,
  parseDashboardSectionParam,
  parseDashboardSettingsSectionParam,
} from '@/components/dashboard/dashboard-navigation'

type DashboardWireframePageProps = {
  searchParams?: Promise<{
    panel?: string
    tab?: string
    view?: string
  }>
}

export default async function DashboardWireframePage({ searchParams }: Readonly<DashboardWireframePageProps>) {
  const params = (await searchParams) ?? {}
  const requestedSection = parseDashboardSectionParam(params.view) ?? dashboardDefaultSection
  const initialSection = getDashboardDisplaySection(requestedSection)
  const parsedTab = parseDashboardTabParam(requestedSection, params.tab)
  const initialTab = getDashboardDisplayTab(requestedSection, parsedTab)
  const initialSettingsSection = parseDashboardSettingsSectionParam(params.panel) ?? dashboardDefaultSettingsSection

  return (
    <DashboardShell
      basePath="/dashboard-wireframe"
      initialSection={initialSection}
      initialSettingsSection={initialSettingsSection}
      initialTab={initialTab}
    />
  )
}
