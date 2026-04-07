'use client'

import { ThemeToggleButton } from '@/components/shared/theme-toggle'
import { Menu, Search, X } from 'lucide-react'
import { BrandMark } from '@/components/shared/brand-mark'

export function DashboardTopbar({
  onMenuClick,
  isMobileOpen,
  user,
  activeSectionLabel,
}: {
  onMenuClick: () => void
  isMobileOpen: boolean
  user: { fullName: string; [key: string]: unknown }
  activeSectionLabel?: string
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
    <header className="sticky top-0 flex w-full bg-[var(--bg)] border-b border-[var(--border)] z-40">
      <div className="flex flex-col items-center justify-between grow lg:flex-row lg:px-6">
        <div className="flex items-center justify-between w-full gap-2 px-3 py-3 border-b border-[var(--border)] sm:gap-4 lg:justify-normal lg:border-b-0 lg:px-0 lg:py-4 xl:hidden">
          <button
            className="items-center justify-center w-10 h-10 text-[var(--text-muted)] border-[var(--border)] rounded-lg flex"
            onClick={onMenuClick}
            aria-label="Toggle Sidebar"
          >
            {isMobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>

          <BrandMark />

          <div className="w-10"></div>
        </div>

        <div className="hidden xl:flex items-center gap-2">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <Search className="size-4 text-[var(--text-muted)]" />
            </span>
            <input
              type="text"
              placeholder="Search or type command..."
              className="h-11 w-full xl:w-[430px] rounded-lg border border-[var(--border)] bg-transparent py-2.5 pl-12 pr-14 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] dark:placeholder:text-[var(--text-muted)]"
            />
            <button className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-0.5 rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1 text-xs text-[var(--text-muted)]">
              <span className="font-sans">⌘</span>
              <span className="font-sans">K</span>
            </button>
          </div>
        </div>

        <div className="hidden items-center justify-between w-full gap-4 px-5 py-4 xl:flex shadow-theme-md xl:justify-end xl:px-0 xl:shadow-none">
          <div className="flex items-center gap-3">
            <ThemeToggleButton />
            {activeSectionLabel && (
              <span className="hidden xl:flex items-center gap-2 text-sm text-[var(--text-muted)]">
                <span className="size-1.5 rounded-full bg-[var(--accent)]" />
                {activeSectionLabel}
              </span>
            )}
          </div>
          {/* Avatar Area */}
          <div className="size-10 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] flex items-center justify-center overflow-hidden">
            <span className="text-sm font-semibold text-[var(--text-soft)]">{getInitials(user.fullName)}</span>
          </div>
        </div>
      </div>
    </header>
  )
}
