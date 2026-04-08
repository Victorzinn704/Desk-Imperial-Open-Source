'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Bot, Building2, ChevronLeft, ChevronRight, CircleDot, LogOut, Settings, UserRound } from 'lucide-react'
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

function AiConsultantSidebarLink({ collapsed = false }: Readonly<{ collapsed?: boolean }>) {
  if (collapsed) {
    return (
      <Link
        aria-label="Abrir consultor IA do aplicativo"
        className="mt-3 flex w-full items-center justify-center rounded-[18px] border border-accent/20 bg-accent/[0.08] p-2.5 text-accent transition-colors duration-200 hover:border-accent/35 hover:bg-accent/[0.14]"
        href="/ai"
        title="Consultor IA"
      >
        <Bot className="size-5" />
      </Link>
    )
  }

  return (
    <Link
      aria-label="Abrir consultor IA do aplicativo"
      className="mt-3 flex items-center gap-3 rounded-[18px] border border-accent/20 bg-accent/[0.07] px-3 py-3 text-sm font-semibold text-[var(--text-primary)] transition-colors duration-200 hover:border-accent/35 hover:bg-accent/[0.12]"
      href="/ai"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[13px] border border-accent/20 bg-accent/[0.1] text-accent">
        <Bot className="size-4" />
      </span>
      <span className="min-w-0 flex-1 truncate">Consultor IA</span>
      <span className="rounded-full border border-accent/20 bg-accent/[0.08] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
        App
      </span>
    </Link>
  )
}

export function DashboardSidebar({
  activeSection,
  companyName,
  email,
  compact = false,
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
  compact?: boolean
}>) {
  const [manualCollapsed, setManualCollapsed] = useState<boolean | null>(() => {
    if (typeof window === 'undefined') return false
    const stored = localStorage.getItem(COLLAPSE_KEY)
    if (stored === 'true' || stored === 'false') {
      return stored === 'true'
    }
    return null
  })
  const collapsed = manualCollapsed ?? compact

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (manualCollapsed !== null) {
      localStorage.setItem(COLLAPSE_KEY, String(manualCollapsed))
    }
    onCollapseChange?.(collapsed)
  }, [collapsed, manualCollapsed, onCollapseChange])

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
          <BrandMark />
          <p className="mt-1.5 text-xs text-muted-foreground">
            {companyName || 'Painel corporativo'}
            <span className="mx-1.5 text-[var(--text-primary)]/20">·</span>
            {formatAccountStatus(status)}
          </p>
        </div>

        {/* Ações rápidas */}
        <div className="mt-4 grid gap-2 sm:mt-5 sm:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <button
                className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-left transition-colors duration-200 hover:border-accent/24 hover:bg-accent/[0.06]"
                key={action.id}
                onClick={() => onQuickAction(action)}
                type="button"
              >
                <div className="flex items-center gap-2">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--surface)]">
                    <Icon className="size-3.5 text-accent" />
                  </span>
                  <span className="text-xs font-semibold text-[var(--text-primary)] sm:text-sm">{action.label}</span>
                </div>
              </button>
            )
          })}
        </div>

        <AiConsultantSidebarLink />

        {/* Separador */}
        <div className="my-5 h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />

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
                      onClick={() => onNavigate(item.id)}
                      type="button"
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

        <div className="mt-5 border-t border-[var(--border)] pt-5">
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
          SIDEBAR DESKTOP — visível em lg+
          ═══════════════════════════════════════════ */}
      <aside className="hidden lg:flex lg:h-screen lg:overflow-hidden">
        <div
          className={cn(
            'workspace-sidebar flex h-full flex-col overflow-hidden transition-[padding] duration-300',
            compact || collapsed ? 'px-3 py-4' : 'px-4 py-5',
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
              className="ml-auto flex size-7 cursor-pointer items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-muted-foreground transition-colors duration-200 hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
              aria-expanded={!collapsed}
              title={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
              type="button"
              onClick={() => {
                setManualCollapsed(!collapsed)
              }}
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
                  <p className="truncate text-[12px] font-semibold text-[var(--text-primary)] 2xl:text-[13px]">
                    {companyName || 'Painel corporativo'}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground 2xl:text-[11px]">
                    Centro principal da operação
                  </p>
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
                        <span className="block truncate text-[12px] font-semibold text-[var(--text-primary)] 2xl:text-[13px]">
                          {action.label}
                        </span>
                      </span>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <AiConsultantSidebarLink collapsed={collapsed} />

          {/* Navegação — flex-1 sem scroll visível */}
          <nav
            className={cn('mt-4 flex-1 overflow-y-auto pr-1', collapsed ? 'space-y-2' : 'space-y-4 pr-1')}
            style={{ scrollbarWidth: compact ? 'thin' : 'auto' }}
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
                          className={cn(
                            'flex w-full cursor-pointer items-center justify-center rounded-[18px] border p-2.5 transition-colors duration-200',
                            isActive
                              ? 'border-accent/24 bg-accent/[0.09] text-[var(--text-primary)]'
                              : 'border-transparent text-muted-foreground hover:border-[var(--border)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]',
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
                        <span className="block truncate text-[12px] font-semibold 2xl:text-[13px]">{item.label}</span>
                      </button>
                    )
                  })}
                </div>
              </section>
            ))}
          </nav>

          {/* Rodapé: bloco de conta unificado — shrink-0 */}
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
              <DesktopSidebarFooter onOpenSettings={onOpenSettings} onSignOut={onSignOut} compact={compact} />
            )}
          </div>
        </div>
      </aside>
    </>
  )
}

function DesktopSidebarFooter({
  compact = false,
  onOpenSettings,
  onSignOut,
}: Readonly<{
  compact?: boolean
  onOpenSettings: (section: DashboardSettingsSectionId) => void
  onSignOut: () => void
}>) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn('grid flex-1 gap-1.5', compact ? 'grid-cols-1' : 'grid-cols-[minmax(0,1fr)_auto]')}>
        <button
          type="button"
          onClick={() => onOpenSettings('account')}
          className="flex items-center justify-center gap-1.5 rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-xs font-semibold text-[var(--text-soft)] transition-colors duration-200 hover:border-accent/20 hover:bg-accent/[0.05] hover:text-[var(--text-primary)]"
        >
          <Settings className="size-3.5" />
          Configurações
        </button>
        <button
          type="button"
          onClick={onSignOut}
          className={cn(
            'flex items-center justify-center rounded-[12px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-soft)] transition-colors duration-200 hover:border-red-500/25 hover:bg-red-500/[0.07] hover:text-red-400',
            compact ? 'w-full gap-1.5 px-3 py-2.5 text-xs font-semibold' : 'size-[38px] shrink-0',
          )}
          title="Encerrar sessão"
        >
          <LogOut className="size-3.5" />
          {compact ? 'Sair' : null}
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
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]">
          <UserRound className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{userName}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(52,242,127,0.22)] bg-[rgba(52,242,127,0.07)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8fffb9]">
          <CircleDot className="size-3" />
          {formatAccountStatus(status)}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
          {role === 'OWNER' ? 'Admin' : 'Operação'}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-1.5 border-t border-[var(--border)] pt-3">
        <button
          type="button"
          onClick={() => onOpenSettings('account')}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] py-2 text-xs font-semibold text-[var(--text-soft)] transition-colors duration-200 hover:border-accent/20 hover:bg-accent/[0.05] hover:text-[var(--text-primary)]"
        >
          <Settings className="size-3.5" />
          Configurações
        </button>
        <button
          type="button"
          onClick={onSignOut}
          className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-soft)] transition-colors duration-200 hover:border-red-500/25 hover:bg-red-500/[0.07] hover:text-red-400"
          title="Encerrar sessão"
        >
          <LogOut className="size-3.5" />
        </button>
      </div>
    </div>
  )
}
