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
      <section className="imperial-card p-4 xl:hidden">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <BrandMark />
              <p className="mt-3 text-sm text-[var(--text-soft)]">
                {companyName || 'Painel corporativo'} · {formatAccountStatus(status)}
              </p>
            </div>
            <Link
              className="flex size-11 items-center justify-center rounded-2xl border border-white/8 bg-white/4 text-[var(--text-soft)] transition-colors duration-200 hover:text-white"
              href="/dashboard/configuracoes"
            >
              <Cog className="size-4" />
            </Link>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <button
                  className="rounded-[22px] border border-white/8 bg-white/3 px-4 py-3 text-left transition-colors duration-200 hover:border-[rgba(212,177,106,0.24)] hover:bg-[rgba(212,177,106,0.08)]"
                  key={action.id}
                  onClick={() => onQuickAction(action)}
                  type="button"
                >
                  <div className="flex items-center gap-2 text-white">
                    <Icon className="size-4 text-[var(--accent)]" />
                    <span className="text-sm font-semibold">{action.label}</span>
                  </div>
                  <p className="mt-2 text-xs leading-6 text-[var(--text-soft)]">{action.description}</p>
                </button>
              )
            })}
          </div>

          <div className="overflow-x-auto pb-1">
            <div className="flex min-w-max gap-2">
              {groups.flatMap((group) => group.items).map((item) => {
                const Icon = item.icon
                const isActive = activeSection === item.id

                return (
                  <button
                    className={cn(
                      'flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors duration-200',
                      isActive
                        ? 'border-[rgba(212,177,106,0.24)] bg-[rgba(212,177,106,0.1)] text-white'
                        : 'border-white/8 bg-white/3 text-[var(--text-soft)] hover:text-white',
                    )}
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    type="button"
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <aside className="hidden xl:sticky xl:top-0 xl:block xl:h-screen xl:max-h-screen">
      <div
        className={cn(
          'workspace-sidebar imperial-card flex h-full flex-col transition-all duration-300',
          collapsed ? 'w-[72px] p-3' : 'w-full p-5',
        )}
      >
        <div className={cn('flex items-center', collapsed ? 'justify-center' : 'justify-between gap-2')}>
          {!collapsed && <BrandMark />}
          {collapsed && (
            <span className="flex size-10 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[rgba(212,177,106,0.12)] text-[var(--accent)]">
              <Building2 className="size-4" />
            </span>
          )}
          <button
            className="ml-auto flex size-7 cursor-pointer items-center justify-center rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-[var(--text-soft)] transition-colors duration-200 hover:bg-[rgba(255,255,255,0.07)] hover:text-white"
            title={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
            type="button"
            onClick={() => setCollapsed((v) => !v)}
          >
            {collapsed ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
          </button>
        </div>

        {!collapsed && (
          <div className="workspace-sidebar__surface mt-4">
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-[18px] border border-[rgba(212,177,106,0.18)] bg-[rgba(212,177,106,0.08)] text-[var(--accent)]">
                <Building2 className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {companyName || 'Painel corporativo'}
                </p>
                <p className="truncate text-xs text-[var(--text-soft)]">Workspace principal da operação</p>
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
                      <span className="block truncate text-xs text-[var(--text-soft)]">{action.description}</span>
                    </span>
                    <Plus className="size-4 text-[var(--text-soft)]" />
                  </button>
                )
              })}
            </div>
          </div>
        )}
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
                            ? 'border-[rgba(212,177,106,0.24)] bg-[rgba(212,177,106,0.1)] text-white'
                            : 'border-transparent text-[var(--text-soft)] hover:border-white/8 hover:bg-white/4 hover:text-white',
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
                        <span className="block truncate text-xs text-[var(--text-soft)]">{item.description}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </nav>

        <div className={cn('mt-3 border-t border-[rgba(255,255,255,0.06)] pt-3', collapsed ? 'space-y-2' : 'space-y-3')}>
          {collapsed ? (
            <>
              <button
                className="flex w-full cursor-pointer items-center justify-center rounded-[16px] border border-transparent p-2.5 text-[var(--text-soft)] transition-colors duration-200 hover:border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.04)] hover:text-white"
                title={userName}
                type="button"
              >
                <UserRound className="size-5" />
              </button>
              <Link
                className="flex w-full items-center justify-center rounded-[16px] border border-transparent p-2.5 text-[var(--text-soft)] transition-colors duration-200 hover:border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.04)] hover:text-white"
                href="/dashboard/configuracoes"
                title="Configurações"
              >
                <Cog className="size-5" />
              </Link>
            </>
          ) : (
            <>
              <div className="workspace-sidebar__surface">
                <div className="flex items-center gap-2">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-white">
                    <UserRound className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{userName || companyName || 'Conta'}</p>
                    <p className="truncate text-xs text-[var(--text-soft)]">{email}</p>
                  </div>
                </div>
                <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-[rgba(52,242,127,0.22)] bg-[rgba(52,242,127,0.08)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8fffb9]">
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
                  <span className="block text-xs text-[var(--text-soft)]">Ajustes da conta e preferências</span>
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
