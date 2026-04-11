'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  dashboardDefaultSection,
  dashboardDefaultSettingsSection,
  dashboardNavigationGroups,
  dashboardQuickActions,
  type DashboardSectionId,
  type DashboardSettingsSectionId,
  parseDashboardSectionParam,
  parseDashboardSettingsSectionParam,
} from '@/components/dashboard/dashboard-navigation'

type UseDashboardNavigationOptions = {
  initialSection?: DashboardSectionId
  initialSettingsSection?: DashboardSettingsSectionId
  isStaffUser: boolean
}

function buildDashboardUrl(sectionId: DashboardSectionId, settingsSectionId: DashboardSettingsSectionId) {
  const params = new URLSearchParams()
  if (sectionId !== dashboardDefaultSection) {params.set('view', sectionId)}
  if (sectionId === 'settings') {params.set('panel', settingsSectionId)}
  const qs = params.toString()
  return qs ? `/dashboard?${qs}` : '/dashboard'
}

/**
 * Manages dashboard section navigation with URL sync, popstate handling,
 * and role-based section filtering.
 */
export function useDashboardNavigation({
  initialSection = dashboardDefaultSection,
  initialSettingsSection = dashboardDefaultSettingsSection,
  isStaffUser,
}: UseDashboardNavigationOptions) {
  const [activeSection, setActiveSection] = useState<DashboardSectionId>(initialSection)
  const [activeSettingsSection, setActiveSettingsSection] = useState<DashboardSettingsSectionId>(initialSettingsSection)

  const quickActions = isStaffUser ? [] : dashboardQuickActions

  const navigationGroups = useMemo(
    () =>
      isStaffUser
        ? dashboardNavigationGroups
            .map((group) => ({
              ...group,
              items: group.items.filter((item) => ['sales', 'pdv', 'calendario'].includes(item.id)),
            }))
            .filter((group) => group.items.length > 0)
        : dashboardNavigationGroups,
    [isStaffUser],
  )

  const allowedSections = useMemo(
    () =>
      new Set<DashboardSectionId>([
        ...navigationGroups.flatMap((group) => group.items.map((item) => item.id)),
        'settings',
      ]),
    [navigationGroups],
  )

  const resolvedActiveSection = allowedSections.has(activeSection)
    ? activeSection
    : isStaffUser
      ? 'sales'
      : dashboardDefaultSection

  // Sync from URL on mount and on browser back/forward
  useEffect(() => {
    if (typeof window === 'undefined') {return}

    const syncFromLocation = () => {
      const params = new URLSearchParams(globalThis.location.search)
      const sectionFromUrl = parseDashboardSectionParam(params.get('view'))
      const settingsFromUrl = parseDashboardSettingsSectionParam(params.get('panel'))

      if (sectionFromUrl && allowedSections.has(sectionFromUrl)) {
        setActiveSection(sectionFromUrl)
      }
      if (settingsFromUrl) {
        setActiveSettingsSection(settingsFromUrl)
      }
    }

    syncFromLocation()
    globalThis.addEventListener('popstate', syncFromLocation)
    return () => globalThis.removeEventListener('popstate', syncFromLocation)
  }, [allowedSections])

  const navigateToSection = (sectionId: DashboardSectionId) => {
    setActiveSection(sectionId)
    if (typeof window !== 'undefined') {
      globalThis.history.pushState({}, '', buildDashboardUrl(sectionId, activeSettingsSection))
    }
  }

  const navigateToSettings = (settingsSectionId: DashboardSettingsSectionId) => {
    setActiveSection('settings')
    setActiveSettingsSection(settingsSectionId)
    if (typeof window !== 'undefined') {
      globalThis.history.pushState({}, '', buildDashboardUrl('settings', settingsSectionId))
    }
  }

  return {
    activeSection: resolvedActiveSection,
    activeSettingsSection,
    navigationGroups,
    quickActions,
    navigateToSection,
    navigateToSettings,
  }
}
