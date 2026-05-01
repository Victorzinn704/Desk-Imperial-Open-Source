'use client'

import { ConnectionBanner } from '@/components/shared/connection-banner'
import { PullIndicator } from '@/components/shared/pull-indicator'
import { OwnerMobileShellBottomNav } from './owner-mobile-shell-bottom-nav'
import { OwnerMobileShellContent } from './owner-mobile-shell-content'
import { OwnerMobileShellHeader } from './owner-mobile-shell-header'
import { OwnerPwaInstallPrompt } from './owner-pwa-install-prompt'
import type { OwnerMobileShellProps, OwnerMobileTab, PendingAction } from './owner-mobile-shell-types'
import { useOwnerMobileShellController } from './use-owner-mobile-shell-controller'

function OwnerScreenErrorBanner({ message, onDismiss }: Readonly<{ message: string; onDismiss: () => void }>) {
  return (
    <div className="border-b border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.08)] px-4 py-3 text-sm text-[#fca5a5]">
      {message}
      <button className="ml-3 text-xs font-semibold underline opacity-70" type="button" onClick={onDismiss}>
        OK
      </button>
    </div>
  )
}

function OwnerShellNavigation({
  activeComandasCount,
  activeTab,
  pendingAction,
  setActiveTab,
  setFocusedComandaId,
}: Readonly<{
  activeComandasCount: number
  activeTab: OwnerMobileTab
  pendingAction: PendingAction | null
  setActiveTab: (tab: OwnerMobileTab) => void
  setFocusedComandaId: (id: string | null) => void
}>) {
  return (
    <OwnerMobileShellBottomNav
      activeComandasCount={activeComandasCount}
      activeTab={activeTab}
      pendingAction={pendingAction}
      onSelectTab={(tab) => {
        setActiveTab(tab)
        if (tab !== 'comandas') {
          setFocusedComandaId(null)
        }
      }}
    />
  )
}

function OwnerShellMain({
  controller,
  isPdvBuilderOpen,
}: Readonly<{
  controller: ReturnType<typeof useOwnerMobileShellController>
  isPdvBuilderOpen: boolean
}>) {
  const { containerRef, indicatorStyle, isRefreshing, progress } = controller

  return (
    <main
      className={`relative min-h-0 flex-1 ${
        isPdvBuilderOpen ? 'flex flex-col overflow-hidden pb-0' : 'overflow-y-auto overscroll-y-contain pb-[7.25rem]'
      }`}
      ref={containerRef}
    >
      <PullIndicator isRefreshing={isRefreshing} progress={progress} style={indicatorStyle} />
      <OwnerMobileShellContent controller={controller} />
    </main>
  )
}

export function OwnerMobileShell({ currentUser }: OwnerMobileShellProps) {
  const controller = useOwnerMobileShellController(currentUser)
  const {
    activeComandas,
    activeTab,
    companyName,
    displayName,
    logoutMutation,
    pendingAction,
    realtimeStatus,
    screenError,
    setActiveTab,
    setFocusedComandaId,
    setScreenError,
  } = controller
  const isPdvBuilderOpen = activeTab === 'pdv' && Boolean(pendingAction)

  return (
    <div className="flex min-h-screen min-h-[100svh] flex-col overflow-hidden bg-[var(--bg)] text-[var(--text-primary)]">
      <OwnerMobileShellHeader
        companyName={companyName}
        displayName={displayName}
        isLoggingOut={logoutMutation.isPending}
        realtimeStatus={realtimeStatus}
        onLogout={() => logoutMutation.mutate()}
      />
      <ConnectionBanner status={realtimeStatus} />
      {screenError ? <OwnerScreenErrorBanner message={screenError} onDismiss={() => setScreenError(null)} /> : null}
      <OwnerShellMain controller={controller} isPdvBuilderOpen={isPdvBuilderOpen} />
      <OwnerPwaInstallPrompt />
      {isPdvBuilderOpen ? null : (
        <OwnerShellNavigation
          activeComandasCount={activeComandas.length}
          activeTab={activeTab}
          pendingAction={pendingAction}
          setActiveTab={setActiveTab}
          setFocusedComandaId={setFocusedComandaId}
        />
      )}
    </div>
  )
}
