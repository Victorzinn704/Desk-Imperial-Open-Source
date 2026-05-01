'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  buildDashboardHref,
  dashboardDefaultSection,
  dashboardDefaultSettingsSection,
  dashboardNavigationGroups,
  dashboardQuickActions,
  getDashboardDisplaySection,
  getDashboardDisplayTab,
  getDashboardSectionTabs,
  parseDashboardSectionParam,
  parseDashboardSettingsSectionParam,
  parseDashboardTabParam,
  type DashboardProductSectionId,
  type DashboardSectionId,
  type DashboardSettingsSectionId,
  type DashboardTabId,
} from '@/components/dashboard/dashboard-navigation'

type UseDashboardNavigationOptions = {
  basePath?: string
  initialSection?: DashboardSectionId
  initialSettingsSection?: DashboardSettingsSectionId
  initialTab?: DashboardTabId | null
  isStaffUser: boolean
}

/**
 * Manages dashboard section navigation with URL sync, popstate handling,
 * top-level tabs and role-based section filtering.
 */
export function useDashboardNavigation({
  basePath = '/dashboard',
  initialSection = dashboardDefaultSection,
  initialSettingsSection = dashboardDefaultSettingsSection,
  initialTab = null,
  isStaffUser,
}: UseDashboardNavigationOptions) {
  const [activeSection, setActiveSection] = useState<DashboardSectionId>(initialSection)
  const [activeTab, setActiveTab] = useState<DashboardTabId | null>(
    initialTab ?? getDashboardDisplayTab(initialSection),
  )
  const [activeSettingsSection, setActiveSettingsSection] = useState<DashboardSettingsSectionId>(initialSettingsSection)

  const quickActions = isStaffUser ? [] : dashboardQuickActions

  const navigationGroups = useMemo(
    () =>
      isStaffUser
        ? dashboardNavigationGroups
            .map((group) => ({
              ...group,
              items: group.items.filter((item) => ['pdv', 'salao', 'pedidos'].includes(item.id)),
            }))
            .filter((group) => group.items.length > 0)
        : dashboardNavigationGroups,
    [isStaffUser],
  )

  const allowedSections = useMemo(() => {
    const primarySections = navigationGroups.flatMap((group) => group.items.map((item) => item.id))
    const legacyOwnerSections: DashboardSectionId[] = isStaffUser
      ? []
      : ['sales', 'portfolio', 'calendario', 'map', 'payroll']

    return new Set<DashboardSectionId>([...primarySections, ...legacyOwnerSections, 'settings'])
  }, [isStaffUser, navigationGroups])

  const resolvedActiveSection = allowedSections.has(activeSection)
    ? activeSection
    : isStaffUser
      ? 'pdv'
      : dashboardDefaultSection

  const activeDisplaySection = getDashboardDisplaySection(resolvedActiveSection)
  const resolvedActiveTab = getDashboardDisplayTab(resolvedActiveSection, activeTab)
  const sectionTabs = getDashboardSectionTabs(resolvedActiveSection)

  // Sync from URL on mount and on browser back/forward
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const syncFromLocation = () => {
      const params = new URLSearchParams(globalThis.location.search)
      const hasView = params.has('view')
      const hasPanel = params.has('panel')
      const hasTab = params.has('tab')
      const sectionFromUrl = parseDashboardSectionParam(params.get('view'))
      const settingsFromUrl = parseDashboardSettingsSectionParam(params.get('panel'))
      const roleDefaultSection: DashboardSectionId = isStaffUser ? 'pdv' : dashboardDefaultSection
      const fallbackSection: DashboardSectionId = allowedSections.has(initialSection)
        ? initialSection
        : roleDefaultSection
      let nextSection: DashboardSectionId = fallbackSection
      let nextTab = getDashboardDisplayTab(fallbackSection, initialTab)
      let nextSettingsSection = settingsFromUrl ?? initialSettingsSection

      if (sectionFromUrl && allowedSections.has(sectionFromUrl)) {
        const tabFromUrl = parseDashboardTabParam(sectionFromUrl, params.get('tab'))
        nextSection = sectionFromUrl
        nextTab = tabFromUrl ?? getDashboardDisplayTab(sectionFromUrl)
      } else if (settingsFromUrl && !sectionFromUrl) {
        nextSection = 'settings'
        nextTab = null
      }

      if (settingsFromUrl) {
        nextSettingsSection = settingsFromUrl
      }

      setActiveSection(nextSection)
      setActiveTab(nextTab)
      setActiveSettingsSection(nextSettingsSection)

      const canonicalHref =
        nextSection === 'settings'
          ? buildDashboardHref('settings', nextSettingsSection, undefined, basePath)
          : buildDashboardHref(nextSection, nextSettingsSection, nextTab, basePath)
      const shouldCanonicalize =
        nextSection === 'settings'
          ? !(hasView && hasPanel)
          : !(hasView && hasTab) || globalThis.location.search !== new URL(canonicalHref, 'http://localhost').search

      if (shouldCanonicalize) {
        globalThis.history.replaceState({}, '', canonicalHref)
      }
    }

    syncFromLocation()
    globalThis.addEventListener('popstate', syncFromLocation)
    return () => globalThis.removeEventListener('popstate', syncFromLocation)
  }, [allowedSections, basePath, initialSection, initialSettingsSection, initialTab, isStaffUser])

  const navigateToSection = (sectionId: DashboardSectionId, tabId?: DashboardTabId | null) => {
    const nextTab = sectionId === 'settings' ? null : (tabId ?? getDashboardDisplayTab(sectionId))
    setActiveSection(sectionId)
    setActiveTab(nextTab)
    if (typeof window !== 'undefined') {
      globalThis.history.pushState({}, '', buildDashboardHref(sectionId, activeSettingsSection, nextTab, basePath))
    }
  }

  const navigateToTab = (tabId: DashboardTabId) => {
    if (activeDisplaySection === 'settings') {
      return
    }

    const nextSection = activeDisplaySection as DashboardProductSectionId
    setActiveSection(nextSection)
    setActiveTab(tabId)
    if (typeof window !== 'undefined') {
      globalThis.history.pushState({}, '', buildDashboardHref(nextSection, activeSettingsSection, tabId, basePath))
    }
  }

  const navigateToSettings = (settingsSectionId: DashboardSettingsSectionId) => {
    setActiveSection('settings')
    setActiveTab(null)
    setActiveSettingsSection(settingsSectionId)
    if (typeof window !== 'undefined') {
      globalThis.history.pushState({}, '', buildDashboardHref('settings', settingsSectionId, undefined, basePath))
    }
  }

  return {
    activeSection: resolvedActiveSection,
    activeDisplaySection,
    activeSettingsSection,
    activeTab: resolvedActiveTab,
    navigationGroups,
    quickActions,
    sectionTabs,
    navigateToSection,
    navigateToSettings,
    navigateToTab,
  }
}
