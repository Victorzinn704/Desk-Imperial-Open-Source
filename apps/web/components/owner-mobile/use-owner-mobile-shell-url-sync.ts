'use client'

import { useEffect } from 'react'
import {
  dashboardDefaultSettingsSection,
  type DashboardSettingsSectionId,
  parseDashboardSettingsSectionParam,
} from '@/components/dashboard/dashboard-navigation'
import type { OwnerMobileTab } from './owner-mobile-shell-types'

const OWNER_TABS = new Set<OwnerMobileTab>(['today', 'comandas', 'pdv', 'caixa', 'financeiro', 'conta'])

export function resolveOwnerTab(tab: string | null, view: string | null): OwnerMobileTab {
  if (view === 'settings') {
    return 'conta'
  }

  return tab && OWNER_TABS.has(tab as OwnerMobileTab) ? (tab as OwnerMobileTab) : 'today'
}

export function resolveOwnerSettingsSection(value: string | null): DashboardSettingsSectionId {
  return parseDashboardSettingsSectionParam(value) ?? dashboardDefaultSettingsSection
}

export function useOwnerMobileShellUrlSync({
  panelParam,
  setActiveSettingsSection,
  setActiveTab,
  tabParam,
  viewParam,
}: {
  panelParam: string | null
  setActiveSettingsSection: (section: DashboardSettingsSectionId) => void
  setActiveTab: (tab: OwnerMobileTab) => void
  tabParam: string | null
  viewParam: string | null
}) {
  useEffect(() => {
    setActiveTab(resolveOwnerTab(tabParam, viewParam))
  }, [setActiveTab, tabParam, viewParam])

  useEffect(() => {
    setActiveSettingsSection(resolveOwnerSettingsSection(panelParam))
  }, [panelParam, setActiveSettingsSection])
}
