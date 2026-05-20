'use client'

import dynamic from 'next/dynamic'
import {
  type DashboardShellProps,
  type DashboardShellState,
  useDashboardShellState,
} from '@/components/dashboard/dashboard-shell.controller'
import { DashboardShellDesktop } from '@/components/dashboard/dashboard-shell-desktop'
import {
  EmailVerificationLockState,
  LoadingState,
  MobileShellLoadingState,
  UnauthorizedState,
} from '@/components/dashboard/dashboard-shell-states'

export { getSessionErrorMessage, resolveActiveNavigation } from '@/components/dashboard/dashboard-shell.helpers'

const StaffMobileShell = dynamic(() => import('@/components/staff-mobile').then((module) => module.StaffMobileShell), {
  ssr: false,
  loading: () => <MobileShellLoadingState label="Carregando operacional mobile..." />,
})

const OwnerMobileShell = dynamic(
  () => import('@/components/owner-mobile/owner-mobile-shell').then((module) => module.OwnerMobileShell),
  {
    ssr: false,
    loading: () => <MobileShellLoadingState label="Carregando painel mobile..." />,
  },
)

export function DashboardShell(props: Readonly<DashboardShellProps>) {
  return renderDashboardShellState(useDashboardShellState(props))
}

function renderDashboardShellState(state: DashboardShellState) {
  switch (state.kind) {
    case 'loading':
      return <LoadingState compact={state.compact} />
    case 'unauthorized':
      return <UnauthorizedState message={state.message} />
    case 'email-verification':
      return <EmailVerificationLockState email={state.email} />
    case 'staff-mobile':
      return <StaffMobileShell currentUser={state.currentUser} />
    case 'owner-mobile':
      return <OwnerMobileShell currentUser={state.currentUser} />
    case 'desktop':
      return <DashboardShellDesktop {...state.props} />
    default:
      return assertNeverDashboardShellState(state)
  }
}

function assertNeverDashboardShellState(state: never) {
  return state
}
