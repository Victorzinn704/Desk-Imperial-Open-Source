'use client'

import {
  WireframeBrandLink,
  WireframeHeaderActions,
  WireframePeriod,
  WireframePrimaryNav,
  WireframeSubnav,
} from './dashboard-wireframe-header.parts'
import type { DashboardWireframeHeaderProps } from './dashboard-wireframe-header.types'
export type { DashboardWireframeHeaderProps } from './dashboard-wireframe-header.types'

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
