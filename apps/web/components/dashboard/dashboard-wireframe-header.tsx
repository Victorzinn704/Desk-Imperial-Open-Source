'use client'

import type {
  DashboardNavigationGroup,
  DashboardProductSectionId,
  DashboardSectionId,
  DashboardSectionTab,
  DashboardSettingsSectionId,
  DashboardTabId,
} from '@/components/dashboard/dashboard-navigation'
import {
  WireframeBrandLink,
  WireframeHeaderActions,
  WireframePeriod,
  WireframePrimaryNav,
  WireframeSubnav,
} from './dashboard-wireframe-header.parts'

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

export function DashboardWireframeHeader({
  activeDisplaySection,
  activeSettingsSection,
  activeTab,
  basePath,
  compact,
  navigationGroups,
  onNavigate,
  onNavigateSettings,
  onNavigateTab,
  onSignOut,
  sectionTabs,
  user,
}: Readonly<DashboardWireframeHeaderProps>) {
  const activePrimaryId = activeDisplaySection === 'settings' ? null : activeDisplaySection
  const initials = getInitials(user.fullName)

  return (
    <header className="wireframe-header">
      <div className={`wireframe-header__bar ${compact ? 'wireframe-header__bar--compact' : ''}`}>
        <WireframeBrandLink activeSettingsSection={activeSettingsSection} basePath={basePath} onNavigate={onNavigate} />
        <WireframeHeaderActions
          basePath={basePath}
          initials={initials}
          user={user}
          onNavigateSettings={onNavigateSettings}
          onSignOut={onSignOut}
        />
      </div>

      <div className="wireframe-header__nav-row">
        <WireframePrimaryNav
          activePrimaryId={activePrimaryId}
          activeSettingsSection={activeSettingsSection}
          basePath={basePath}
          navigationGroups={navigationGroups}
          onNavigate={onNavigate}
        />
        <WireframePeriod compact={compact} initials={initials} role={user.role} />
      </div>

      <WireframeSubnav
        activeDisplaySection={activeDisplaySection}
        activeSettingsSection={activeSettingsSection}
        activeTab={activeTab}
        basePath={basePath}
        sectionTabs={sectionTabs}
        onNavigateTab={onNavigateTab}
      />
    </header>
  )
}

function getInitials(name: string) {
  return (
    name
      ?.split(' ')
      .map((part) => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'U'
  )
}
