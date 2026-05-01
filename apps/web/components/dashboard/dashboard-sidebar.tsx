'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, LogOut, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BrandMark } from '@/components/shared/brand-mark'
import type {
  DashboardNavigationGroup,
  DashboardQuickAction,
  DashboardSectionId,
  DashboardSettingsSectionId,
} from '@/components/dashboard/dashboard-navigation'

const COLLAPSE_KEY = 'desk_imperial_sidebar_collapsed'

export function DashboardSidebar({
  activeSection,
  companyName,
  email,
  compact = false,
  groups,
  role,
  quickActions: _quickActions,
  onNavigate,
  onOpenSettings,
  onQuickAction: _onQuickAction,
  onSignOut,
  onCollapseChange,
  status: _status,
  userName,
}: Readonly<{
  activeSection: DashboardSectionId
  companyName: string | null
  email: string
  groups: DashboardNavigationGroup[]
  role: 'OWNER' | 'STAFF'
  quickActions: DashboardQuickAction[]
  onNavigate: (section: DashboardSectionId) => void
  onOpenSettings: (section: DashboardSettingsSectionId) => void
  onQuickAction: (action: DashboardQuickAction) => void
  onSignOut: () => void
  onCollapseChange?: (collapsed: boolean) => void
  status: string
  userName: string
  compact?: boolean
}>) {
  const [manualCollapsed, setManualCollapsed] = useState<boolean | null>(() => {
    if (typeof window === 'undefined') {
      return false
    }
    const stored = globalThis.localStorage.getItem(COLLAPSE_KEY)
    if (stored === 'true' || stored === 'false') {
      return stored === 'true'
    }
    return null
  })
  const collapsed = manualCollapsed ?? compact

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    if (manualCollapsed !== null) {
      globalThis.localStorage.setItem(COLLAPSE_KEY, String(manualCollapsed))
    }
    onCollapseChange?.(collapsed)
  }, [collapsed, manualCollapsed, onCollapseChange])

  const getInitials = (name: string) =>
    name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'U'

  return (
    <>
      {/* ═══════════════════════════════════════════
          NAV MOBILE — visível abaixo de lg
          ═══════════════════════════════════════════ */}
      <section
        className="imperial-card sticky top-0 z-40 p-3 sm:p-4 lg:hidden"
        style={{ backdropFilter: 'blur(16px)' }}
      >
        <div className="min-w-0">
          <BrandMark size="sm" wordmark="responsive" />
          <p className="mt-1.5 text-xs text-muted-foreground">{companyName || 'Painel corporativo'}</p>
        </div>

        {/* Separador */}
        <div className="my-4 h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />

        {/* Navegação por grupos */}
        <nav className="space-y-4">
          {groups.map((group) => (
            <div key={group.id}>
              <p className="mb-2 px-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
                {group.label}
              </p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const isActive = activeSection === item.id
                  return (
                    <button
                      className={cn(
                        'flex items-center gap-2 rounded-[14px] border px-2.5 py-2 text-left transition-colors duration-200 sm:gap-2.5 sm:px-3 sm:py-2.5',
                        isActive
                          ? 'border-accent/24 bg-accent/[0.09] text-[var(--text-primary)]'
                          : 'border-[var(--border)] bg-[var(--surface)] text-muted-foreground hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]',
                      )}
                      key={item.id}
                      type="button"
                      onClick={() => onNavigate(item.id)}
                    >
                      <span
                        className={cn(
                          'flex size-7 shrink-0 items-center justify-center rounded-[9px] border transition-colors',
                          isActive
                            ? 'border-accent/20 bg-accent/[0.1] text-accent'
                            : 'border-[var(--border)] bg-[var(--surface)] text-muted-foreground',
                        )}
                      >
                        <Icon className="size-3.5" />
                      </span>
                      <span className="truncate text-[11px] font-semibold sm:text-xs">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-4 border-t border-[var(--border)] pt-4">
          <MobileFooter
            email={email}
            role={role}
            userName={userName || companyName || 'Conta'}
            onOpenSettings={onOpenSettings}
            onSignOut={onSignOut}
          />
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SIDEBAR DESKTOP — visível em lg+
          ═══════════════════════════════════════════ */}
      <aside className="hidden lg:flex lg:h-[100svh] lg:overflow-hidden">
        <div
          className={cn(
            'workspace-sidebar flex h-full min-h-0 flex-col overflow-hidden transition-[padding] duration-300',
            compact || collapsed ? 'px-3 py-4' : 'px-4 py-5',
          )}
        >
          {/* Cabeçalho — Brand + Collapse */}
          <div className={cn('flex shrink-0 items-center gap-2', collapsed ? 'justify-center' : 'justify-between')}>
            {!collapsed && <BrandMark />}
            <button
              aria-expanded={!collapsed}
              className={cn(
                'flex size-7 cursor-pointer items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-muted-foreground transition-colors duration-200 hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]',
                collapsed && 'ml-0',
              )}
              title={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
              type="button"
              onClick={() => {
                setManualCollapsed(!collapsed)
              }}
            >
              {collapsed ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
            </button>
          </div>

          {/* Navegação — flex-1 */}
          <nav
            className={cn('mt-5 flex-1 overflow-y-auto', collapsed ? 'space-y-2' : 'space-y-5')}
            style={{ scrollbarWidth: 'thin' }}
          >
            {groups.map((group) => (
              <section className="workspace-nav-group" key={group.id}>
                {!collapsed ? <p className="workspace-nav-group__label">{group.label}</p> : null}

                <div className={cn('space-y-1', compact ? 'space-y-2' : '')}>
                  {group.items.map((item) => {
                    const Icon = item.icon
                    const isActive = activeSection === item.id

                    if (collapsed) {
                      return (
                        <button
                          aria-current={isActive ? 'page' : undefined}
                          className={cn(
                            'flex w-full cursor-pointer items-center justify-center rounded-[18px] border p-2.5 transition-colors duration-200',
                            isActive
                              ? 'border-accent/24 bg-accent/[0.09] text-[var(--text-primary)]'
                              : 'border-transparent text-muted-foreground hover:border-[var(--border)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]',
                          )}
                          key={item.id}
                          title={item.label}
                          type="button"
                          onClick={() => onNavigate(item.id)}
                        >
                          <Icon className="size-5" />
                        </button>
                      )
                    }

                    return (
                      <button
                        aria-current={isActive ? 'page' : undefined}
                        className={cn('workspace-nav-item group', isActive && 'workspace-nav-item--active')}
                        key={item.id}
                        type="button"
                        onClick={() => onNavigate(item.id)}
                      >
                        <span className="workspace-nav-item__icon">
                          <Icon className="size-4" />
                        </span>
                        <span className="block truncate text-[12px] font-semibold 2xl:text-[13px]">{item.label}</span>
                      </button>
                    )
                  })}
                </div>
              </section>
            ))}
          </nav>

          {/* Rodapé: User + Settings + Logout */}
          <div className={cn('mt-3 shrink-0 border-t border-[var(--border)] pt-3')}>
            {collapsed ? (
              <div className="space-y-2">
                <button
                  className="flex w-full cursor-pointer items-center justify-center rounded-[16px] border border-transparent p-2.5 text-muted-foreground transition-colors duration-200 hover:border-[var(--border)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
                  title="Configurações"
                  type="button"
                  onClick={() => onOpenSettings('account')}
                >
                  <Settings className="size-5" />
                </button>
                <button
                  className="flex w-full items-center justify-center rounded-[16px] border border-transparent p-2.5 text-muted-foreground transition-colors duration-200 hover:border-red-500/20 hover:bg-red-500/[0.06] hover:text-red-400"
                  title="Encerrar sessão"
                  type="button"
                  onClick={onSignOut}
                >
                  <LogOut className="size-5" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* User info */}
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-muted)]">
                    <span className="text-xs font-semibold text-[var(--text-soft)]">
                      {getInitials(userName || 'U')}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-[var(--text-primary)]">
                      {userName || 'Usuário'}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {role === 'OWNER' ? 'admin' : 'equipe'}
                    </p>
                  </div>
                  <button
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-red-500/[0.06] hover:text-red-400"
                    title="Encerrar sessão"
                    type="button"
                    onClick={onSignOut}
                  >
                    <LogOut className="size-3.5" />
                  </button>
                </div>

                {/* Settings button */}
                <button
                  className="flex w-full items-center justify-center gap-1.5 rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-xs font-semibold text-[var(--text-soft)] transition-colors duration-200 hover:border-accent/20 hover:bg-accent/[0.05] hover:text-[var(--text-primary)]"
                  type="button"
                  onClick={() => onOpenSettings('account')}
                >
                  <Settings className="size-3.5" />
                  Configurações
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}

function MobileFooter({
  email,
  role: _role,
  userName,
  onOpenSettings,
  onSignOut,
}: Readonly<{
  email: string
  role: 'OWNER' | 'STAFF'
  userName: string
  onOpenSettings: (section: DashboardSettingsSectionId) => void
  onSignOut: () => void
}>) {
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{userName}</p>
        <p className="truncate text-xs text-muted-foreground">{email}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          className="flex size-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-soft)] transition-colors hover:border-accent/20 hover:text-[var(--text-primary)]"
          type="button"
          onClick={() => onOpenSettings('account')}
        >
          <Settings className="size-3.5" />
        </button>
        <button
          className="flex size-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-soft)] transition-colors hover:border-red-500/25 hover:text-red-400"
          title="Encerrar sessão"
          type="button"
          onClick={onSignOut}
        >
          <LogOut className="size-3.5" />
        </button>
      </div>
    </div>
  )
}
