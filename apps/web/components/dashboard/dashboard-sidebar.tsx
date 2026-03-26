'use client'

import { useEffect, useState } from 'react'
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  LogOut,
  Settings,
  UserRound,
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

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, String(collapsed))
    onCollapseChange?.(collapsed)
  }, [collapsed, onCollapseChange])

  return (
    <>
      {/* ═══════════════════════════════════════════
          NAV MOBILE — visível abaixo de xl
          ═══════════════════════════════════════════ */}
      <section className="imperial-card sticky top-0 z-40 p-4 xl:hidden" style={{ backdropFilter: 'blur(16px)' }}>
        <div className="min-w-0">
          <BrandMark />
          <p className="mt-1.5 text-xs text-muted-foreground">
            {companyName || 'Painel corporativo'}
            <span className="mx-1.5 text-white/20">·</span>
            {formatAccountStatus(status)}
          </p>
        </div>

        {/* Ações rápidas */}
        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <button
                className="rounded-[18px] border border-white/6 bg-white/[0.025] px-4 py-3 text-left transition-colors duration-200 hover:border-accent/24 hover:bg-accent/[0.06]"
                key={action.id}
                onClick={() => onQuickAction(action)}
                type="button"
              >
                <div className="flex items-center gap-2">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-[10px] border border-white/8 bg-white/[0.03]">
                    <Icon className="size-3.5 text-accent" />
                  </span>
                  <span className="text-sm font-semibold text-white">{action.label}</span>
                </div>
                <p className="mt-1.5 text-[11px] leading-[1.5] text-muted-foreground">
                  {action.description}
                </p>
              </button>
            )
          })}
        </div>

        {/* Separador */}
        <div className="my-5 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />

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
                        'flex items-center gap-2.5 rounded-[14px] border px-3 py-2.5 text-left transition-colors duration-200',
                        isActive
                          ? 'border-accent/24 bg-accent/[0.09] text-white'
                          : 'border-white/6 bg-white/[0.02] text-muted-foreground hover:border-white/12 hover:bg-white/[0.04] hover:text-white',
                      )}
                      key={item.id}
                      onClick={() => onNavigate(item.id)}
                      type="button"
                    >
                      <span
                        className={cn(
                          'flex size-7 shrink-0 items-center justify-center rounded-[9px] border transition-colors',
                          isActive
                            ? 'border-accent/20 bg-accent/[0.1] text-accent'
                            : 'border-white/8 bg-white/[0.03] text-muted-foreground',
                        )}
                      >
                        <Icon className="size-3.5" />
                      </span>
                      <span className="truncate text-xs font-semibold">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-5 border-t border-white/[0.06] pt-5">
          <MobileAccountDock
            email={email}
            role={role}
            status={status}
            userName={userName || companyName || 'Conta'}
            onOpenSettings={onOpenSettings}
            onSignOut={onSignOut}
          />
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SIDEBAR DESKTOP — visível em xl+
          ═══════════════════════════════════════════ */}
      <aside className="hidden xl:sticky xl:top-0 xl:block xl:h-screen xl:max-h-screen">
        <div
          className={cn(
            'workspace-sidebar imperial-card flex h-full flex-col transition-all duration-300',
            collapsed ? 'w-[72px] p-3' : 'w-full p-5',
          )}
        >
          {/* Cabeçalho */}
          <div className={cn('flex items-center', collapsed ? 'justify-center' : 'justify-between gap-2')}>
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

          {/* Workspace info + ações rápidas */}
          {!collapsed && (
            <div className="workspace-sidebar__surface mt-4">
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[16px] border border-accent/18 bg-accent/[0.07] text-accent">
                  <Building2 className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {companyName || 'Painel corporativo'}
                  </p>
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
                      onClick={() => onQuickAction(action)}
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

          {/* Navegação */}
          <nav className={cn('mt-4 flex-1 overflow-y-auto', collapsed ? 'space-y-2' : 'space-y-4 pr-1')}>
            {groups.map((group) => (
              <section className="workspace-nav-group" key={group.id}>
                {!collapsed ? (
                  <p className="workspace-nav-group__label">{group.label}</p>
                ) : null}

                <div className={cn('space-y-1', collapsed ? 'space-y-2' : '')}>
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
                        className={cn(
                          'workspace-nav-item group',
                          isActive && 'workspace-nav-item--active',
                        )}
                        key={item.id}
                        onClick={() => onNavigate(item.id)}
                        type="button"
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <span className="workspace-nav-item__icon">
                          <Icon className="size-4" />
                        </span>
                        <span className="block truncate text-sm font-semibold">{item.label}</span>
                      </button>
                    )
                  })}
                </div>
              </section>
            ))}
          </nav>

          {/* Rodapé: perfil + configurações */}
          <div className={cn('mt-3 border-t border-white/[0.06] pt-3', collapsed ? 'space-y-2' : 'space-y-3')}>
            {collapsed ? (
              <>
                <button
                  className="flex w-full cursor-pointer items-center justify-center rounded-[16px] border border-transparent p-2.5 text-muted-foreground transition-colors duration-200 hover:border-white/8 hover:bg-white/[0.04] hover:text-white"
                  title="Configurações"
                  type="button"
                  onClick={() => onOpenSettings('account')}
                >
                  <Settings className="size-5" />
                </button>
                <button
                  className="flex w-full items-center justify-center rounded-[16px] border border-transparent p-2.5 text-muted-foreground transition-colors duration-200 hover:border-white/8 hover:bg-white/[0.04] hover:text-white"
                  title="Encerrar sessão"
                  type="button"
                  onClick={onSignOut}
                >
                  <LogOut className="size-5" />
                </button>
              </>
            ) : (
              <DesktopAccountDock
                companyName={companyName}
                email={email}
                role={role}
                status={status}
                userName={userName}
                onOpenSettings={onOpenSettings}
                onSignOut={onSignOut}
              />
            )}
          </div>
        </div>
      </aside>
    </>
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
    <>
      {/* Bloco de perfil unificado */}
      <div className="workspace-sidebar__surface">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[12px] border border-white/8 bg-white/[0.03] text-white">
            <UserRound className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{userName || companyName || 'Conta'}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(52,242,127,0.22)] bg-[rgba(52,242,127,0.07)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#8fffb9]">
              <CircleDot className="size-2.5" />
              {formatAccountStatus(status)}
            </span>
            <span className="inline-flex items-center rounded-full border border-white/8 bg-white/[0.03] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
              {role === 'OWNER' ? 'Admin' : 'Staff'}
            </span>
          </div>
        </div>
      </div>

      {/* Ações da conta */}
      <div className="grid gap-1">
        <button
          className="workspace-nav-item group"
          type="button"
          onClick={() => onOpenSettings('account')}
        >
          <span className="workspace-nav-item__icon">
            <Settings className="size-4" />
          </span>
          <span className="text-sm font-semibold">Configurações</span>
        </button>

        <button
          className="workspace-nav-item group text-[var(--text-soft)] hover:text-white"
          type="button"
          onClick={onSignOut}
        >
          <span className="workspace-nav-item__icon">
            <LogOut className="size-4" />
          </span>
          <span className="text-sm font-semibold">Encerrar sessão</span>
        </button>
      </div>
    </>
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
    <div className="space-y-3">
      <div className="workspace-sidebar__surface">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] border border-white/8 bg-white/[0.03] text-white">
            <UserRound className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{userName}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(52,242,127,0.22)] bg-[rgba(52,242,127,0.07)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8fffb9]">
            <CircleDot className="size-3" />
            {formatAccountStatus(status)}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
            {role === 'OWNER' ? 'Admin' : 'Operação'}
          </span>
        </div>
      </div>

      <div className="grid gap-1 sm:grid-cols-2">
        <button
          className="workspace-nav-item group"
          type="button"
          onClick={() => onOpenSettings('account')}
        >
          <span className="workspace-nav-item__icon">
            <Settings className="size-4" />
          </span>
          <span className="text-sm font-semibold">Configurações</span>
        </button>
        <button className="workspace-nav-item group" type="button" onClick={onSignOut}>
          <span className="workspace-nav-item__icon">
            <LogOut className="size-4" />
          </span>
          <span className="text-sm font-semibold">Encerrar sessão</span>
        </button>
      </div>
    </div>
  )
}
