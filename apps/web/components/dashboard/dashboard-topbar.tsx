'use client'

import { ThemeToggleButton } from '@/components/shared/theme-toggle'
import { Menu, Search, X } from 'lucide-react'
import { BrandMark } from '@/components/shared/brand-mark'

export function DashboardTopbar({
  onMenuClick,
  isMobileOpen,
  user,
  compact = false,
}: {
  onMenuClick: () => void
  isMobileOpen: boolean
  user: { fullName: string; [key: string]: unknown }
  compact?: boolean
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
    <header className="sticky top-0 z-40 w-full border-b border-[var(--border)] bg-[color:color-mix(in_srgb,var(--surface)_92%,transparent)] backdrop-blur-xl">
      <div
        className={`flex w-full min-w-0 flex-col lg:flex-row lg:items-center lg:justify-between ${compact ? 'lg:px-3 xl:px-4' : 'lg:px-4 xl:px-6'}`}
      >
        <div className="flex w-full items-center justify-between gap-2 border-b border-[var(--border)] px-3 py-3 sm:gap-4 lg:hidden">
          <button
            aria-label="Toggle Sidebar"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-soft)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
            type="button"
            onClick={onMenuClick}
          >
            {isMobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>

          <div className="min-w-0 flex-1 px-2">
            <BrandMark size="sm" wordmark="responsive" />
          </div>

          <div className="flex w-10 justify-end" />
        </div>

        <div className={`hidden min-w-0 flex-1 items-center gap-3 lg:flex ${compact ? 'py-3' : 'py-4'}`}>
          <div className="relative min-w-0 flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <Search className="size-4 text-[var(--text-muted)]" />
            </span>
            <input
              className={`h-11 w-full max-w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] py-2.5 pl-12 pr-4 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-accent focus:ring-1 focus:ring-accent ${
                compact ? 'lg:max-w-[320px] xl:max-w-[420px]' : 'lg:max-w-[420px] xl:max-w-[560px]'
              }`}
              placeholder="Buscar no app..."
              type="text"
            />
            <button
              className="absolute right-2.5 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--text-muted)] 2xl:inline-flex"
              type="button"
            >
              <span className="font-sans">⌘</span>
              <span className="font-sans">K</span>
            </button>
          </div>
        </div>

        <div className={`hidden shrink-0 items-center gap-2 lg:flex ${compact ? 'py-3' : 'py-4'}`}>
          <ThemeToggleButton compact={compact} />
          <div
            className={`flex ${compact ? 'size-9' : 'size-10'} items-center justify-center overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface-muted)]`}
          >
            <span className="text-sm font-semibold text-[var(--text-soft)]">{getInitials(user.fullName)}</span>
          </div>
        </div>
      </div>
    </header>
  )
}
