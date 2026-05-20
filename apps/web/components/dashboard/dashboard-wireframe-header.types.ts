import type {
  DashboardNavigationGroup,
  DashboardProductSectionId,
  DashboardSectionId,
  DashboardSectionTab,
  DashboardSettingsSectionId,
  DashboardTabId,
} from '@/components/dashboard/dashboard-navigation'

export type DashboardWireframeHeaderProps = {
  activeDisplaySection: DashboardProductSectionId | 'settings'
  activeSettingsSection: DashboardSettingsSectionId
  activeTab: DashboardTabId | null
  basePath: string
  compact: boolean
  navigationGroups: DashboardNavigationGroup[]
  onNavigate: (sectionId: DashboardSectionId, tabId?: DashboardTabId | null) => void
  onNavigateSettings: (sectionId: DashboardSettingsSectionId) => void
  onNavigateTab: (tabId: DashboardTabId) => void
  onSignOut: () => void
  sectionTabs: DashboardSectionTab[]
  user: {
    companyName: string | null
    email: string
    fullName: string
    role: string
  }
}
