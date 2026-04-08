'use client'

import { ThemeToggleButton } from '@/components/shared/theme-toggle'
import { Menu, Search, X } from 'lucide-react'
import { BrandMark } from '@/components/shared/brand-mark'

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
    <header className="sticky top-0 z-40 flex w-full border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="flex grow flex-col items-center justify-between lg:flex-row lg:px-4 xl:px-6">
        <div className="flex w-full items-center justify-between gap-2 border-b border-[var(--border)] px-3 py-3 sm:gap-4 lg:hidden">
          <button
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-soft)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
            onClick={onMenuClick}
            aria-label="Toggle Sidebar"
          >
            {isMobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>

          <BrandMark />

          <div className="w-10"></div>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <Search className="size-4 text-gray-500 dark:text-gray-400" />
            </span>
            <input
              type="text"
              placeholder="Buscar no app..."
              className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] py-2.5 pl-12 pr-14 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-accent focus:ring-1 focus:ring-accent lg:w-[300px] xl:w-[430px]"
            />
            <button className="absolute right-2.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-0.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--text-muted)]">
              <span className="font-sans">⌘</span>
              <span className="font-sans">K</span>
            </button>
          </div>
        </div>

        <div className="hidden w-full items-center justify-between gap-4 px-5 py-4 shadow-theme-md lg:flex lg:justify-end lg:px-0 lg:shadow-none">
          <div className="flex items-center gap-2 2xsm:gap-3">
            <ThemeToggleButton />
          </div>
          {/* Avatar Area */}
          <div className="flex size-10 items-center justify-center overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface-muted)]">
            <span className="text-sm font-semibold text-[var(--text-soft)]">{getInitials(user.fullName)}</span>
          </div>
        </div>
      </div>
    </header>
  )
}
