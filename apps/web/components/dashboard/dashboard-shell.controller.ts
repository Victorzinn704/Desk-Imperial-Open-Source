'use client'

import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, type AuthUser, fetchCurrentUser } from '@/lib/api'
import { useDashboardMutations } from '@/components/dashboard/hooks'
import { COMPACT_DESKTOP_BREAKPOINT, useMobileDetection } from '@/components/dashboard/hooks/useMobileDetection'
import { useDashboardNavigation } from '@/components/dashboard/hooks/useDashboardNavigation'
import { useDashboardScopedQueries } from '@/components/dashboard/hooks/useDashboardQueries'
import { useScrollMemory } from '@/components/dashboard/hooks/useScrollMemory'
import { useDashboardLogout } from '@/components/dashboard/hooks/useDashboardLogout'
import { useOperationsRealtime } from '@/components/operations/use-operations-realtime'
import {
  dashboardDefaultSection,
  dashboardDefaultSettingsSection,
  type DashboardSectionId,
  type DashboardSettingsSectionId,
  type DashboardTabId,
} from '@/components/dashboard/dashboard-navigation'
import { getSessionErrorMessage } from '@/components/dashboard/dashboard-shell.helpers'
import type { DashboardShellDesktopProps } from '@/components/dashboard/dashboard-shell-desktop'
import type { PdvMesaIntent } from '@/components/pdv/pdv-navigation-intent'

export type DashboardShellProps = {
  basePath?: string
  initialSection?: DashboardSectionId
  initialSettingsSection?: DashboardSettingsSectionId
  initialTab?: DashboardTabId | null
}

export type DashboardShellState =
  | { kind: 'loading'; compact: boolean }
  | { kind: 'unauthorized'; message: string }
  | { kind: 'email-verification'; email: string }
  | { kind: 'staff-mobile'; currentUser: AuthUser }
  | { kind: 'owner-mobile'; currentUser: AuthUser }
  | { kind: 'desktop'; props: DashboardShellDesktopProps }

type DashboardShellController = {
  activeDisplaySection: DashboardShellDesktopProps['activeDisplaySection']
  activeSection: DashboardShellDesktopProps['activeSection']
  activeSettingsSection: DashboardShellDesktopProps['activeSettingsSection']
  activeTab: DashboardShellDesktopProps['activeTab']
  basePath: string
  compact: boolean
  employees: DashboardShellDesktopProps['employees']
  finance: DashboardShellDesktopProps['finance']
  isLoading: boolean
  isMobile: boolean
  isStaffUser: boolean
  isUnauthorized: boolean
  navigationGroups: DashboardShellDesktopProps['navigationGroups']
  onConsumePdvMesaIntent: DashboardShellDesktopProps['onConsumePdvMesaIntent']
  onNavigateSection: DashboardShellDesktopProps['onNavigateSection']
  onNavigateSettings: DashboardShellDesktopProps['onNavigateSettings']
  onNavigateTab: DashboardShellDesktopProps['onNavigateTab']
  onOpenPdvFromMesa: DashboardShellDesktopProps['onOpenPdvFromMesa']
  onScroll: DashboardShellDesktopProps['onScroll']
  onSignOut: DashboardShellDesktopProps['onSignOut']
  pdvMesaIntent: PdvMesaIntent | null
  scrollRef: DashboardShellDesktopProps['scrollRef']
  sectionTabs: DashboardShellDesktopProps['sectionTabs']
  sessionError: string
  user: AuthUser | null
}

export function useDashboardShellState({
  basePath = '/dashboard',
  initialSection = dashboardDefaultSection,
  initialSettingsSection = dashboardDefaultSettingsSection,
  initialTab = null,
}: Readonly<DashboardShellProps>): DashboardShellState {
  return resolveDashboardShellState(
    useDashboardShellController({ basePath, initialSection, initialSettingsSection, initialTab }),
  )
}

function useDashboardShellController({
  basePath,
  initialSection,
  initialSettingsSection,
  initialTab,
}: Required<DashboardShellProps>): DashboardShellController {
  const queryClient = useQueryClient()
  const { compact, isMobile } = useDashboardResponsiveState()
  const { currentUser, isStaffUser, sessionQuery } = useDashboardSessionState()
  const { logoutMutation } = useDashboardMutations()
  const navigation = useDashboardNavigation({
    basePath,
    initialSection,
    initialSettingsSection,
    initialTab,
    isStaffUser,
  })
  const { navigateToSection } = navigation
  const scopedData = useDashboardScopedData(currentUser, navigation.activeSection)
  const { scrollRef, onScroll, scrollIntoView } = useScrollMemory(navigation.activeSection, isMobile)
  const { logout } = useDashboardLogout(logoutMutation)
  const pdvIntent = usePdvMesaIntentController({ navigateToSection, scrollIntoView })
  useDashboardRealtime(currentUser?.userId ?? null, queryClient)

  return {
    ...navigation,
    basePath,
    compact,
    employees: scopedData.employees,
    finance: scopedData.finance,
    isLoading: sessionQuery.isLoading,
    isMobile,
    isStaffUser,
    isUnauthorized: sessionQuery.error instanceof ApiError && sessionQuery.error.status === 401,
    onConsumePdvMesaIntent: pdvIntent.consume,
    onNavigateSection: navigation.navigateToSection,
    onNavigateSettings: navigation.navigateToSettings,
    onNavigateTab: navigation.navigateToTab,
    onOpenPdvFromMesa: pdvIntent.openFromMesa,
    onScroll,
    onSignOut: logout,
    pdvMesaIntent: pdvIntent.intent,
    scrollRef,
    sessionError: getSessionErrorMessage(sessionQuery.error),
    user: currentUser,
  }
}

function useDashboardResponsiveState() {
  const { isMobile } = useMobileDetection()
  const { isMobile: compact } = useMobileDetection(COMPACT_DESKTOP_BREAKPOINT)
  return { compact, isMobile }
}

function useDashboardSessionState() {
  const sessionQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchCurrentUser,
    retry: false,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
  const currentUser = sessionQuery.data?.user ?? null

  return {
    currentUser,
    isStaffUser: currentUser?.role === 'STAFF',
    sessionQuery,
  }
}

function useDashboardScopedData(
  currentUser: AuthUser | null,
  activeSection: DashboardShellDesktopProps['activeSection'],
) {
  const scopedQueries = useDashboardScopedQueries({
    userId: currentUser?.userId,
    isOwner: currentUser?.role === 'OWNER',
    section: activeSection,
  })

  return {
    employees: scopedQueries.employeesQuery.data?.items ?? [],
    finance: scopedQueries.financeQuery.data,
  }
}

function useDashboardRealtime(currentUserId: string | null, queryClient: ReturnType<typeof useQueryClient>) {
  useOperationsRealtime(Boolean(currentUserId), queryClient, {
    currentUserId,
    notificationChannel: 'WEB_TOAST',
  })
}

function usePdvMesaIntentController({
  navigateToSection,
  scrollIntoView,
}: {
  navigateToSection: DashboardShellDesktopProps['onNavigateSection']
  scrollIntoView: (element: HTMLElement) => void
}) {
  const [intent, setIntent] = useState<PdvMesaIntent | null>(null)
  const consume = useCallback(() => {
    setIntent(null)
  }, [])
  const openFromMesa = useCallback(
    (nextIntent: Omit<PdvMesaIntent, 'requestId'>) => {
      setIntent({ ...nextIntent, requestId: Date.now() })
      navigateToSection('pdv')
      scrollWorkspaceHeaderIntoView(scrollIntoView)
    },
    [navigateToSection, scrollIntoView],
  )

  return { consume, intent, openFromMesa }
}

function resolveDashboardShellState(controller: DashboardShellController): DashboardShellState {
  if (controller.isLoading) {
    return { kind: 'loading', compact: controller.compact }
  }

  if (!controller.user) {
    return { kind: 'unauthorized', message: controller.sessionError }
  }

  if (controller.isUnauthorized) {
    return { kind: 'unauthorized', message: controller.sessionError }
  }

  const user = controller.user
  if (!user.emailVerified) {
    return { kind: 'email-verification', email: user.email }
  }

  if (shouldRenderStaffMobile(controller)) {
    return { kind: 'staff-mobile', currentUser: user }
  }

  if (shouldRenderOwnerMobile(controller)) {
    return { kind: 'owner-mobile', currentUser: user }
  }

  return { kind: 'desktop', props: buildDesktopProps(controller, user) }
}

function shouldRenderStaffMobile({ activeSection, isMobile, isStaffUser }: DashboardShellController) {
  const canUseMobileShell = activeSection !== 'settings'
  return isStaffUser && isMobile && canUseMobileShell
}

function shouldRenderOwnerMobile({ isMobile, isStaffUser }: DashboardShellController) {
  return isMobile && !isStaffUser
}

function buildDesktopProps(controller: DashboardShellController, user: AuthUser): DashboardShellDesktopProps {
  return {
    activeDisplaySection: controller.activeDisplaySection,
    activeSection: controller.activeSection,
    activeSettingsSection: controller.activeSettingsSection,
    activeTab: controller.activeTab,
    basePath: controller.basePath,
    compact: controller.compact,
    employees: controller.employees,
    finance: controller.finance,
    navigationGroups: controller.navigationGroups,
    onConsumePdvMesaIntent: controller.onConsumePdvMesaIntent,
    onNavigateSection: controller.onNavigateSection,
    onNavigateSettings: controller.onNavigateSettings,
    onNavigateTab: controller.onNavigateTab,
    onOpenPdvFromMesa: controller.onOpenPdvFromMesa,
    onScroll: controller.onScroll,
    onSignOut: controller.onSignOut,
    pdvMesaIntent: controller.pdvMesaIntent,
    scrollRef: controller.scrollRef,
    sectionTabs: controller.sectionTabs,
    user,
  }
}

function scrollWorkspaceHeaderIntoView(scrollIntoView: (element: HTMLElement) => void) {
  if (typeof document === 'undefined') {
    return
  }

  globalThis.setTimeout(() => {
    const targetElement = document.getElementById('workspace-header')
    if (targetElement instanceof HTMLElement) {
      scrollIntoView(targetElement)
    }
  }, 80)
}
