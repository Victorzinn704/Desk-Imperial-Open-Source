'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTheme } from 'next-themes'
import { usePathname, useRouter } from 'next/navigation'
import { fetchCurrentUser } from '@/lib/api'
import { useDashboardLogout, useDashboardMutations } from '@/components/dashboard/hooks'
import { buildDesignLabConfigHref } from '@/components/design-lab/design-lab-navigation'
import { resolveAuthenticatedRoute } from '@/lib/authenticated-route'
import { useClientViewportWidth } from '@/hooks/use-client-viewport-width'
import {
  COLLAPSED_KEY,
  getForceDesktopShellFromLocation,
  getInitials,
  getStoredBoolean,
  NAV_OWNER,
  NAV_STAFF,
  resolveActiveNavigation,
  type Role,
} from './lab-shell.shared'

// eslint-disable-next-line max-lines-per-function
export function useLabShellModel() {
  const pathname = usePathname()
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const viewportWidth = useClientViewportWidth()
  const [collapsed, setCollapsed] = useState(() => getStoredBoolean(COLLAPSED_KEY, false))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [forceDesktopShell] = useState(getForceDesktopShellFromLocation)

  const sessionQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchCurrentUser,
    retry: false,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
  const { logoutMutation } = useDashboardMutations()
  const { logout, isPending: isLoggingOut } = useDashboardLogout(logoutMutation)

  const currentUser = sessionQuery.data?.user ?? null
  const role: Role = currentUser?.role === 'STAFF' ? 'STAFF' : 'OWNER'
  const navigation = role === 'STAFF' ? NAV_STAFF : NAV_OWNER
  const isDark = resolvedTheme !== 'light'
  const configHref = buildDesignLabConfigHref('account')
  const isConfigRoute = pathname === '/design-lab/config'
  const activeNavigation = resolveActiveNavigation(pathname, navigation, configHref)
  const accountLabel = currentUser?.fullName?.trim() || 'Conta'
  const accountMeta = currentUser?.role === 'STAFF' ? 'Operação' : 'Administração'
  const accountInitials = getInitials(currentUser?.fullName)
  const mobileShellHref = currentUser ? resolveAuthenticatedRoute(role, viewportWidth) : null
  const shouldRedirectToMobileShell = !forceDesktopShell && Boolean(mobileShellHref?.startsWith('/app/'))

  useEffect(() => {
    if (shouldRedirectToMobileShell && mobileShellHref) {
      router.replace(mobileShellHref)
    }
  }, [mobileShellHref, router, shouldRedirectToMobileShell])

  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, String(collapsed))
  }, [collapsed])

  useEffect(() => {
    document.documentElement.classList.add('design-lab-shell-open')
    document.body.classList.add('design-lab-shell-open')
    return () => {
      document.documentElement.classList.remove('design-lab-shell-open')
      document.body.classList.remove('design-lab-shell-open')
    }
  }, [])

  return useMemo(
    () => ({
      accountInitials,
      accountLabel,
      accountMeta,
      activeNavigation,
      collapsed,
      configHref,
      currentUser,
      isConfigRoute,
      isDark,
      isLoggingOut,
      logout,
      mobileOpen,
      navigation,
      pathname,
      setCollapsed,
      setMobileOpen,
      setTheme,
      shouldRedirectToMobileShell,
    }),
    [
      accountInitials,
      accountLabel,
      accountMeta,
      activeNavigation,
      collapsed,
      configHref,
      currentUser,
      isConfigRoute,
      isDark,
      isLoggingOut,
      logout,
      mobileOpen,
      navigation,
      pathname,
      setTheme,
      shouldRedirectToMobileShell,
    ],
  )
}
