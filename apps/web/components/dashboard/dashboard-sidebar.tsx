'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Cog,
  UserRound,
} from 'lucide-react'
import { formatAccountStatus } from '@/lib/dashboard-format'
import { cn } from '@/lib/utils'
import { BrandMark } from '@/components/shared/brand-mark'

export type DashboardSidebarItem<TSection extends string = string> = {
  id: TSection
  label: string
  description: string
  icon: LucideIcon
}

const COLLAPSE_KEY = 'desk_imperial_sidebar_collapsed'

export function DashboardSidebar<TSection extends string>({
  activeSection,
  companyName,
  email,
  items,
  onNavigate,
  onCollapseChange,
  status,
  userName,
}: Readonly<{
  activeSection: TSection
  companyName: string | null
  email: string
  items: DashboardSidebarItem<TSection>[]
  onNavigate: (section: TSection) => void
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
    <aside className="xl:sticky xl:top-0 xl:h-screen xl:max-h-screen">
      <div
        className={cn(
          'imperial-card flex h-full flex-col transition-all duration-300',
          collapsed ? 'w-[72px] p-3' : 'w-full p-5',
        )}
      >
        {/* Brand + collapse toggle */}
        <div className={cn('flex items-center', collapsed ? 'justify-center' : 'justify-between gap-2')}>
          {!collapsed && <BrandMark />}
          {collapsed && (
            <span className="flex size-10 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[rgba(212,177,106,0.12)] text-[var(--accent)]">
              <Building2 className="size-4" />
            </span>
          )}
          <button
            className="ml-auto flex size-7 cursor-pointer items-center justify-center rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-[var(--text-soft)] transition-all hover:bg-[rgba(255,255,255,0.07)] hover:text-white"
            title={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
            type="button"
            onClick={() => setCollapsed((v) => !v)}
          >
            {collapsed ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
          </button>
        </div>

        {/* Company mini-card */}
        {!collapsed && (
          <div className="imperial-card-soft mt-4 p-3">
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[16px] bg-[linear-gradient(135deg,rgba(47,255,122,0.24),rgba(18,122,64,0.2))] text-[#36f57c]">
                <Building2 className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold uppercase tracking-[0.04em] text-white">
                  {companyName || 'Painel corporativo'}
                </p>
                <p className="truncate text-xs text-[var(--text-soft)]">Operação ativa</p>
              </div>
            </div>
          </div>
        )}

        {/* Nav items */}
        <nav className={cn('mt-4 flex-1 overflow-y-auto', collapsed ? 'space-y-1' : 'space-y-1 pr-1')}>
          {items.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.id

            if (collapsed) {
              return (
                <button
                  className={cn(
                    'flex w-full cursor-pointer items-center justify-center rounded-[16px] border p-2.5 transition-all duration-200',
                    isActive
                      ? 'border-[rgba(52,242,127,0.45)] bg-[linear-gradient(135deg,rgba(47,255,122,0.18),rgba(14,85,45,0.22))] text-[#36f57c]'
                      : 'border-transparent text-[var(--text-soft)] hover:border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.04)] hover:text-white',
                  )}
                  key={item.id}
                  title={item.label}
                  onClick={() => onNavigate(item.id)}
                  type="button"
                >
                  <Icon className="size-5" />
                </button>
              )
            }

            return (
              <button
                className={cn(
                  'group flex w-full cursor-pointer items-center gap-3 rounded-[20px] border px-3 py-3 text-left transition-all duration-200',
                  isActive
                    ? 'border-[rgba(52,242,127,0.45)] bg-[linear-gradient(135deg,rgba(47,255,122,0.18),rgba(14,85,45,0.22))] text-white shadow-[0_0_34px_rgba(52,242,127,0.12)]'
                    : 'border-transparent bg-transparent text-[var(--text-soft)] hover:border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.03)] hover:text-white',
                )}
                key={item.id}
                onClick={() => onNavigate(item.id)}
                type="button"
              >
                <span
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-[14px] border transition-all duration-200',
                    isActive
                      ? 'border-[rgba(52,242,127,0.28)] bg-[rgba(52,242,127,0.12)] text-[#36f57c]'
                      : 'border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-[var(--text-soft)] group-hover:text-white',
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span className="truncate text-sm font-semibold">{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Footer */}
        <div className={cn('mt-3 border-t border-[rgba(255,255,255,0.06)] pt-3', collapsed ? 'space-y-2' : 'space-y-3')}>
          {collapsed ? (
            <>
              <button
                className="flex w-full cursor-pointer items-center justify-center rounded-[16px] border border-transparent p-2.5 text-[var(--text-soft)] transition-all hover:border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.04)] hover:text-white"
                title={userName}
                type="button"
              >
                <UserRound className="size-5" />
              </button>
              <Link
                className="flex w-full items-center justify-center rounded-[16px] border border-transparent p-2.5 text-[var(--text-soft)] transition-all hover:border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.04)] hover:text-white"
                href="/dashboard/configuracoes"
                title="Configurações"
              >
                <Cog className="size-5" />
              </Link>
            </>
          ) : (
            <>
              <div className="imperial-card-soft p-3">
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
                className="group flex w-full items-center gap-3 rounded-[18px] border border-transparent px-3 py-2.5 text-[var(--text-soft)] transition-all duration-200 hover:border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.03)] hover:text-white"
                href="/dashboard/configuracoes"
              >
                <span className="flex size-8 items-center justify-center rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-[var(--text-soft)] transition-all duration-200 group-hover:text-white">
                  <Cog className="size-4" />
                </span>
                <span className="text-sm font-semibold">Configurações</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </aside>
  )
}
