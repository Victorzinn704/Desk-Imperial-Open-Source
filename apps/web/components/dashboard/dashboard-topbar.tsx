'use client'

import { ThemeToggleButton } from '@/components/shared/theme-toggle'
import { Bell, CircleDot, Menu, Search, X } from 'lucide-react'
import { BrandMark } from '@/components/shared/brand-mark'
import { cn } from '@/lib/utils'

export function DashboardTopbar({
  onMenuClick,
  isMobileOpen,
  user,
}: {
  onMenuClick: () => void
  isMobileOpen: boolean
  user: { fullName: string; [key: string]: unknown }
}) {
  const getInitials = (name: string) => {
    return (
      name
        ?.split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase() || 'U'
    )
  }
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] backdrop-blur-xl">
      <div className="flex min-h-[60px] flex-col justify-between xl:flex-row xl:items-center xl:px-6">
        <div className="flex w-full items-center justify-between gap-2 border-b border-[var(--border)] px-3 py-3 sm:gap-4 xl:hidden xl:border-b-0 xl:px-0 xl:py-4">
          <button
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-soft)]"
            onClick={onMenuClick}
            aria-label="Toggle Sidebar"
          >
            {isMobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>

          <BrandMark />

          <div className="w-10"></div>
        </div>

        <div className="hidden min-w-0 flex-1 items-center gap-4 px-6 py-4 xl:flex">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Workspace</p>
            <div className="mt-1 flex items-center gap-3">
              <h2 className="truncate text-base font-semibold text-[var(--text-primary)]">{user.fullName}</h2>
              <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(0,140,255,0.18)] bg-[rgba(0,140,255,0.08)] px-2.5 py-1 text-[11px] font-semibold text-[var(--accent)]">
                <CircleDot className="size-3" />
                Operação online
              </span>
            </div>
          </div>

          <div className="relative ml-auto w-full max-w-[420px]">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
              <Search className="size-4 text-[var(--text-muted)]" />
            </span>
            <input
              type="text"
              placeholder="Buscar pedidos, produtos ou comandos..."
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] py-2.5 pl-12 pr-14 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent)] focus:bg-[var(--surface)]"
            />
            <button className="absolute right-2.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-0.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--text-muted)]">
              <span className="font-sans">⌘</span>
              <span className="font-sans">K</span>
            </button>
          </div>
        </div>

        <div className="hidden items-center justify-end gap-2 px-6 py-4 xl:flex">
          <button
            type="button"
            className={cn(
              'inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-medium',
              'border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-soft)]',
            )}
          >
            <Bell className="size-4" />
            Alertas
          </button>
          <div className="flex items-center gap-2">
            <ThemeToggleButton />
          </div>
          <div className="flex h-10 items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-[rgba(0,140,255,0.12)] text-[var(--accent)]">
              <span className="text-xs font-semibold">{getInitials(user.fullName)}</span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{user.fullName}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
