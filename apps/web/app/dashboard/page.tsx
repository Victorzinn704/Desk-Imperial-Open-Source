import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import {
  dashboardDefaultSection,
  dashboardDefaultSettingsSection,
  parseDashboardSectionParam,
  parseDashboardSettingsSectionParam,
} from '@/components/dashboard/dashboard-navigation'

type DashboardPageProps = {
  searchParams?: Promise<{
    panel?: string
    view?: string
  }>
}

export default async function DashboardPage({ searchParams }: Readonly<DashboardPageProps>) {
  const params = (await searchParams) ?? {}
  const initialSection = parseDashboardSectionParam(params.view) ?? dashboardDefaultSection
  const initialSettingsSection =
    parseDashboardSettingsSectionParam(params.panel) ?? dashboardDefaultSettingsSection

  return (
    <DashboardShell
      initialSection={initialSection}
      initialSettingsSection={initialSettingsSection}
    />
  )
}
