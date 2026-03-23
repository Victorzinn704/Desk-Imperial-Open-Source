'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Cog,
  Plus,
  UserRound,
} from 'lucide-react'
import { formatAccountStatus } from '@/lib/dashboard-format'
import { cn } from '@/lib/utils'
import { BrandMark } from '@/components/shared/brand-mark'
import type {
  DashboardNavigationGroup,
  DashboardQuickAction,
  DashboardSectionId,
} from '@/components/dashboard/dashboard-navigation'

const COLLAPSE_KEY = 'desk_imperial_sidebar_collapsed'

export function DashboardSidebar({
  activeSection,
  companyName,
  email,
  groups,
  quickActions,
  onNavigate,
  onQuickAction,
  onCollapseChange,
  status,
  userName,
}: Readonly<{
  activeSection: DashboardSectionId
  companyName: string | null
  email: string
  groups: DashboardNavigationGroup[]
  quickActions: DashboardQuickAction[]
  onNavigate: (section: DashboardSectionId) => void
  onQuickAction: (action: DashboardQuickAction) => void
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
      <section className="imperial-card p-5 xl:hidden">
        {/* Topo: brand + configurações */}
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <BrandMark />
            <p className="mt-1.5 text-xs text-muted-foreground">
              {companyName || 'Painel corporativo'}
              <span className="mx-1.5 text-white/20">·</span>
              {formatAccountStatus(status)}
            </p>
          </div>
          <Link
            className="flex size-10 shrink-0 items-center justify-center rounded-[14px] border border-white/8 bg-white/[0.03] text-muted-foreground transition hover:border-white/14 hover:text-white"
            href="/dashboard/configuracoes"
            title="Configurações"
          >
            <Cog className="size-4" />
          </Link>
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
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold">{item.label}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
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
                  <p className="truncate text-xs text-muted-foreground">Workspace principal da operação</p>
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
                      <Plus className="size-4 text-muted-foreground" />
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
                      >
                        <span className="workspace-nav-item__icon">
                          <Icon className="size-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{item.label}</span>
                          <span className="block truncate text-xs text-muted-foreground">{item.description}</span>
                        </span>
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
                  title={userName}
                  type="button"
                >
                  <UserRound className="size-5" />
                </button>
                <Link
                  className="flex w-full items-center justify-center rounded-[16px] border border-transparent p-2.5 text-muted-foreground transition-colors duration-200 hover:border-white/8 hover:bg-white/[0.04] hover:text-white"
                  href="/dashboard/configuracoes"
                  title="Configurações"
                >
                  <Cog className="size-5" />
                </Link>
              </>
            ) : (
              <>
                <div className="workspace-sidebar__surface">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-[12px] border border-white/8 bg-white/[0.03] text-white">
                      <UserRound className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{userName || companyName || 'Conta'}</p>
                      <p className="truncate text-xs text-muted-foreground">{email}</p>
                    </div>
                  </div>
                  <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-[rgba(52,242,127,0.22)] bg-[rgba(52,242,127,0.07)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8fffb9]">
                    <CircleDot className="size-3" />
                    {formatAccountStatus(status)}
                  </div>
                </div>

                <Link
                  className="workspace-nav-item group"
                  href="/dashboard/configuracoes"
                >
                  <span className="workspace-nav-item__icon">
                    <Cog className="size-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">Configurações</span>
                    <span className="block text-xs text-muted-foreground">Ajustes da conta e preferências</span>
                  </span>
                </Link>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
