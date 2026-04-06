'use client'

import { useEffect, useState } from 'react'
import {
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleDot,
  LogOut,
  PanelLeftOpen,
  Settings,
  UserRound,
  X,
} from 'lucide-react'
import { formatAccountStatus } from '@/lib/dashboard-format'
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
  groups,
  role,
  quickActions,
  onNavigate,
  onOpenSettings,
  onQuickAction,
  onSignOut,
  onCollapseChange,
  status,
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
}>) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(COLLAPSE_KEY) === 'true'
  })
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.map((group) => [group.id, true])),
  )

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, String(collapsed))
    onCollapseChange?.(collapsed)
  }, [collapsed, onCollapseChange])

  useEffect(() => {
    document.body.classList.toggle('overflow-hidden', mobileOpen)

    return () => {
      document.body.classList.remove('overflow-hidden')
    }
  }, [mobileOpen])

  const toggleGroup = (groupId: string) => {
    setOpenGroups((current) => ({
      ...current,
      [groupId]: !(current[groupId] ?? true),
    }))
  }

  const handleNavigate = (section: DashboardSectionId) => {
    onNavigate(section)
    setMobileOpen(false)
  }

  const handleOpenSettings = (section: DashboardSettingsSectionId) => {
    onOpenSettings(section)
    setMobileOpen(false)
  }

  const handleQuickAction = (action: DashboardQuickAction) => {
    onQuickAction(action)
    setMobileOpen(false)
  }

  return (
    <>
      {/* ═══════════════════════════════════════════
          NAV MOBILE — visível abaixo de xl
          ═══════════════════════════════════════════ */}
      <div className="sticky top-0 z-40 border-b border-white/[0.06] bg-[rgba(5,6,9,0.92)] p-2 backdrop-blur-xl xl:hidden">
        <button
          type="button"
          className="flex size-10 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04] text-muted-foreground transition hover:bg-white/[0.07] hover:text-white"
          aria-controls="dashboard-mobile-sidebar"
          aria-expanded={mobileOpen}
          aria-haspopup="dialog"
          aria-label="Abrir navegação"
          onClick={() => setMobileOpen(true)}
        >
          <PanelLeftOpen className="size-5" />
        </button>
      </div>

      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px] xl:hidden"
          aria-label="Fechar navegação"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        id="dashboard-mobile-sidebar"
        className={cn(
          'fixed inset-y-0 left-0 z-[60] flex w-72 max-w-[86vw] flex-col border-r border-white/[0.07] bg-[rgba(7,9,13,0.98)] shadow-[24px_0_60px_rgba(0,0,0,0.42)] transition-transform duration-300 xl:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        role="dialog"
        aria-label="Navegação do painel"
        aria-modal="true"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 p-4">
          <BrandMark />
          <button
            type="button"
            className="flex size-8 items-center justify-center rounded-full border border-white/8 bg-white/[0.04] text-muted-foreground transition hover:bg-white/[0.08] hover:text-white"
            aria-label="Fechar navegação"
            onClick={() => setMobileOpen(false)}
          >
            <X className="size-4" />
          </button>
        </header>

        <SidebarNavigation
          activeSection={activeSection}
          collapsed={false}
          groups={groups}
          openGroups={openGroups}
          onNavigate={handleNavigate}
          onToggleGroup={toggleGroup}
        />

        <div className="shrink-0 border-t border-white/[0.06] p-3">
          <MobileAccountDock
            email={email}
            role={role}
            status={status}
            userName={userName || companyName || 'Conta'}
            onOpenSettings={handleOpenSettings}
            onSignOut={onSignOut}
          />
        </div>
      </aside>

      {/* ═══════════════════════════════════════════
          SIDEBAR DESKTOP — visível em xl+
          ═══════════════════════════════════════════ */}
      <aside className="hidden xl:flex xl:h-screen xl:overflow-hidden">
        <div
          className={cn(
            'workspace-sidebar flex h-full flex-col overflow-hidden transition-[padding] duration-300',
            collapsed ? 'px-3 py-4' : 'px-4 py-5',
          )}
        >
          {/* Cabeçalho — shrink-0 */}
          <div className={cn('flex shrink-0 items-center', collapsed ? 'justify-center' : 'justify-between gap-2')}>
            {!collapsed && <BrandMark />}
            {collapsed && (
              <span className="flex size-10 items-center justify-center rounded-2xl border border-accent/20 bg-accent/[0.08] text-accent">
                <Building2 className="size-4" />
              </span>
            )}
            <button
              className="ml-auto flex size-7 cursor-pointer items-center justify-center rounded-xl border border-white/8 bg-white/[0.03] text-muted-foreground transition-colors duration-200 hover:bg-white/[0.07] hover:text-white"
              aria-expanded={!collapsed}
              title={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
              type="button"
              onClick={() => setCollapsed((v) => !v)}
            >
              {collapsed ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
            </button>
          </div>

          {/* Workspace info + ações rápidas — shrink-0 */}
          {!collapsed && (
            <div className="workspace-sidebar__surface mt-4 shrink-0">
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[16px] border border-accent/18 bg-accent/[0.07] text-accent">
                  <Building2 className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{companyName || 'Painel corporativo'}</p>
                  <p className="truncate text-xs text-muted-foreground">Centro principal da operação</p>
                </div>
              </div>

              <div className="mt-4 grid gap-2">
                {quickActions.map((action) => {
                  const Icon = action.icon
                  return (
                    <button
                      className="workspace-quick-action workspace-quick-action--compact"
                      key={action.id}
                      onClick={() => handleQuickAction(action)}
                      type="button"
                    >
                      <span className="workspace-quick-action__icon">
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-white">{action.label}</span>
                        <span className="block truncate text-xs text-muted-foreground">{action.description}</span>
                      </span>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <SidebarNavigation
            activeSection={activeSection}
            collapsed={collapsed}
            groups={groups}
            openGroups={openGroups}
            onNavigate={handleNavigate}
            onToggleGroup={toggleGroup}
          />

          {/* Rodapé: bloco de conta unificado — shrink-0 */}
          <div className={cn('mt-3 shrink-0 border-t border-white/[0.06] pt-3')}>
            {collapsed ? (
              <div className="space-y-2">
                <button
                  className="flex w-full cursor-pointer items-center justify-center rounded-[16px] border border-transparent p-2.5 text-muted-foreground transition-colors duration-200 hover:border-white/8 hover:bg-white/[0.04] hover:text-white"
                  title="Configurações"
                  type="button"
                  onClick={() => handleOpenSettings('account')}
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
              <DesktopAccountDock
                companyName={companyName}
                email={email}
                role={role}
                status={status}
                userName={userName}
                onOpenSettings={handleOpenSettings}
                onSignOut={onSignOut}
              />
            )}
          </div>
        </div>
      </aside>
    </>
  )
}

function SidebarNavigation({
  activeSection,
  collapsed,
  groups,
  openGroups,
  onNavigate,
  onToggleGroup,
}: Readonly<{
  activeSection: DashboardSectionId
  collapsed: boolean
  groups: DashboardNavigationGroup[]
  openGroups: Record<string, boolean>
  onNavigate: (section: DashboardSectionId) => void
  onToggleGroup: (groupId: string) => void
}>) {
  return (
    <nav
      className={cn(
        'mt-2 flex-1 overflow-y-auto px-2 pb-4 [&::-webkit-scrollbar-thumb]:rounded-none [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-2',
        collapsed ? 'space-y-2 px-0' : 'space-y-1',
      )}
      style={{ scrollbarWidth: 'thin' }}
    >
      {groups.map((group) => {
        const isOpen = openGroups[group.id] ?? true

        return (
          <section className={cn('workspace-nav-group', collapsed && 'items-center')} key={group.id}>
            {collapsed ? null : (
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70 transition hover:bg-white/[0.04] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent/60"
                aria-controls={`dashboard-sidebar-group-${group.id}`}
                aria-expanded={isOpen}
                onClick={() => onToggleGroup(group.id)}
              >
                <span className="min-w-0 flex-1 truncate">{group.label}</span>
                {isOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              </button>
            )}

            <div
              className={cn(
                'overflow-hidden transition-[height,opacity] duration-200',
                isOpen || collapsed ? 'h-auto opacity-100' : 'h-0 opacity-0',
              )}
              id={`dashboard-sidebar-group-${group.id}`}
            >
              <div className={cn('space-y-1', collapsed ? 'space-y-2' : 'pb-2')}>
                {group.items.map((item) => {
                  const Icon = item.icon
                  const isActive = activeSection === item.id

                  if (collapsed) {
                    return (
                      <button
                        className={cn(
                          'flex w-full cursor-pointer items-center justify-center rounded-[18px] border p-2.5 transition-colors duration-200',
                          isActive
                            ? 'border-accent/24 bg-accent/[0.09] text-white'
                            : 'border-transparent text-muted-foreground hover:border-white/8 hover:bg-white/[0.04] hover:text-white',
                        )}
                        key={item.id}
                        onClick={() => onNavigate(item.id)}
                        title={item.label}
                        type="button"
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <Icon className="size-5" />
                      </button>
                    )
                  }

                  return (
                    <button
                      className={cn('workspace-nav-item group', isActive && 'workspace-nav-item--active')}
                      key={item.id}
                      onClick={() => onNavigate(item.id)}
                      type="button"
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <span className="workspace-nav-item__icon">
                        <Icon className="size-4" />
                      </span>
                      <span className="block min-w-0 flex-1 truncate text-sm font-semibold">{item.label}</span>
                      <ChevronRight className="size-3.5 text-muted-foreground/60 transition group-hover:text-white/70" />
                    </button>
                  )
                })}
              </div>
            </div>
          </section>
        )
      })}
    </nav>
  )
}

function DesktopAccountDock({
  companyName,
  email,
  role,
  status,
  userName,
  onOpenSettings,
  onSignOut,
}: Readonly<{
  companyName: string | null
  email: string
  role: 'OWNER' | 'STAFF'
  status: string
  userName: string
  onOpenSettings: (section: DashboardSettingsSectionId) => void
  onSignOut: () => void
}>) {
  return (
    <div className="workspace-sidebar__surface">
      {/* Linha de identidade */}
      <div className="flex items-center gap-2.5">
        <span className="desk-avatar-ring flex size-9 shrink-0 items-center justify-center rounded-[12px] border border-white/8 bg-white/[0.03] text-white">
          <UserRound className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{userName || companyName || 'Conta'}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </div>
      </div>

      {/* Chips de status */}
      <div className="mt-2.5 flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(52,242,127,0.22)] bg-[rgba(52,242,127,0.07)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#8fffb9]">
          <CircleDot className="size-2.5" />
          {formatAccountStatus(status)}
        </span>
        <span className="inline-flex items-center rounded-full border border-white/8 bg-white/[0.03] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
          {role === 'OWNER' ? 'Admin' : 'Staff'}
        </span>
      </div>

      {/* Ações integradas no mesmo bloco */}
      <div className="mt-3 flex items-center gap-1.5 border-t border-white/[0.05] pt-3">
        <button
          type="button"
          onClick={() => onOpenSettings('account')}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-white/[0.06] bg-white/[0.02] py-2 text-xs font-semibold text-[var(--text-soft)] transition-colors duration-200 hover:border-accent/20 hover:bg-accent/[0.05] hover:text-white"
        >
          <Settings className="size-3.5" />
          Configurações
        </button>
        <button
          type="button"
          onClick={onSignOut}
          className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] border border-white/[0.06] bg-white/[0.02] text-[var(--text-soft)] transition-colors duration-200 hover:border-red-500/25 hover:bg-red-500/[0.07] hover:text-red-400"
          title="Encerrar sessão"
        >
          <LogOut className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

function MobileAccountDock({
  email,
  role,
  status,
  userName,
  onOpenSettings,
  onSignOut,
}: Readonly<{
  email: string
  role: 'OWNER' | 'STAFF'
  status: string
  userName: string
  onOpenSettings: (section: DashboardSettingsSectionId) => void
  onSignOut: () => void
}>) {
  return (
    <div className="workspace-sidebar__surface">
      <div className="flex items-center gap-3">
        <span className="desk-avatar-ring flex size-10 shrink-0 items-center justify-center rounded-[12px] border border-white/8 bg-white/[0.03] text-white">
          <UserRound className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{userName}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(52,242,127,0.22)] bg-[rgba(52,242,127,0.07)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8fffb9]">
          <CircleDot className="size-3" />
          {formatAccountStatus(status)}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
          {role === 'OWNER' ? 'Admin' : 'Operação'}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-1.5 border-t border-white/[0.05] pt-3">
        <button
          type="button"
          onClick={() => onOpenSettings('account')}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-white/[0.06] bg-white/[0.02] py-2 text-xs font-semibold text-[var(--text-soft)] transition-colors duration-200 hover:border-accent/20 hover:bg-accent/[0.05] hover:text-white"
        >
          <Settings className="size-3.5" />
          Configurações
        </button>
        <button
          type="button"
          onClick={onSignOut}
          className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] border border-white/[0.06] bg-white/[0.02] text-[var(--text-soft)] transition-colors duration-200 hover:border-red-500/25 hover:bg-red-500/[0.07] hover:text-red-400"
          title="Encerrar sessão"
        >
          <LogOut className="size-3.5" />
        </button>
      </div>
    </div>
  )
}
