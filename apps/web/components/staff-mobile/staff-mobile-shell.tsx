'use client'

import { ConnectionBanner } from '@/components/shared/connection-banner'
import { PullIndicator } from '@/components/shared/pull-indicator'
import { StaffMobileShellBottomNav } from './staff-mobile-shell-bottom-nav'
import { StaffMobileShellContent } from './staff-mobile-shell-content'
import { StaffMobileShellHeader } from './staff-mobile-shell-header'
import { useStaffMobileShellController } from './use-staff-mobile-shell-controller'
import type { StaffMobileShellProps } from './staff-mobile-shell-types'

export function StaffMobileShell({ currentUser }: StaffMobileShellProps) {
  const controller = useStaffMobileShellController(currentUser)
  const {
    containerRef,
    indicatorStyle,
    isRefreshing,
    progress,
    realtimeStatus,
    screenError,
    setScreenError,
    ...viewModel
  } = controller
  const orderBuilderActive = viewModel.activeTab === 'pedido' && Boolean(viewModel.pendingAction)

  return (
    <div className="flex min-h-screen min-h-[100svh] flex-col overflow-hidden bg-[var(--bg)] text-[var(--text-primary)]">
      <StaffMobileShellHeader controller={{ ...viewModel, realtimeStatus }} />
      <ConnectionBanner status={realtimeStatus} />

      {screenError ? (
        <div className="border-b border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.08)] px-4 py-3 text-sm text-[#fca5a5]">
          {screenError}
          <button
            className="ml-3 text-xs font-semibold underline opacity-70"
            type="button"
            onClick={() => setScreenError(null)}
          >
            OK
          </button>
        </div>
      ) : null}

      <main
        className={`relative min-h-0 flex-1 ${orderBuilderActive ? 'flex flex-col overflow-hidden' : 'overflow-y-auto overscroll-y-contain'}`}
        ref={containerRef}
      >
        <PullIndicator isRefreshing={isRefreshing} progress={progress} style={indicatorStyle} />
        <StaffMobileShellContent controller={{ ...viewModel, realtimeStatus }} />
      </main>

      <StaffMobileShellBottomNav controller={{ ...viewModel, realtimeStatus }} />
    </div>
  )
}
