'use client'

import { cn } from '@/lib/utils'
import { LabShellSidebar } from './lab-shell.sidebar'
import { LabShellTopbar } from './lab-shell.topbar'
import { useLabShellModel } from './use-lab-shell-model'

// eslint-disable-next-line max-lines-per-function
export function LabShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const model = useLabShellModel()

  if (model.shouldRedirectToMobileShell) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-6 text-center text-sm text-[var(--text-soft)]">
        Abrindo o app operacional...
      </main>
    )
  }

  return (
    <div
      data-lab
      className={cn('lab-root flex h-dvh min-h-dvh overflow-hidden', model.isDark ? 'lab-dark' : 'lab-light')}
    >
      {model.mobileOpen ? (
        <button
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          type="button"
          onClick={() => model.setMobileOpen(false)}
        />
      ) : null}

      <LabShellSidebar
        accountInitials={model.accountInitials}
        accountLabel={model.accountLabel}
        accountMeta={model.accountMeta}
        collapsed={model.collapsed}
        configHref={model.configHref}
        isConfigRoute={model.isConfigRoute}
        mobileOpen={model.mobileOpen}
        navigation={model.navigation}
        pathname={model.pathname}
        setMobileOpen={model.setMobileOpen}
      />

      <div className="lab-main flex flex-1 flex-col overflow-hidden">
        <LabShellTopbar
          accountInitials={model.accountInitials}
          accountLabel={model.accountLabel}
          accountMeta={model.accountMeta}
          activeGroupLabel={model.activeNavigation.groupLabel}
          activeItemLabel={model.activeNavigation.item?.label ?? 'Desk Imperial'}
          configHref={model.configHref}
          currentUser={model.currentUser}
          isConfigRoute={model.isConfigRoute}
          isDark={model.isDark}
          isLoggingOut={model.isLoggingOut}
          logout={model.logout}
          setTheme={model.setTheme}
          toggleNavigation={model.toggleNavigation}
        />
        <main className="lab-content">{children}</main>
      </div>
    </div>
  )
}
