'use client'

import { LogOut } from 'lucide-react'
import type { RealtimeStatus } from '@/components/operations/use-operations-realtime'
import { BrandMark } from '@/components/shared/brand-mark'

function getRealtimeColor(status: RealtimeStatus) {
  if (status === 'connected') {
    return '#34f27f'
  }
  if (status === 'connecting') {
    return '#fbbf24'
  }
  return '#f87171'
}

type OwnerMobileShellHeaderProps = Readonly<{
  companyName: string
  displayName: string
  isLoggingOut: boolean
  realtimeStatus: RealtimeStatus
  onLogout: () => void
}>

export function OwnerMobileShellHeader({
  companyName,
  displayName,
  isLoggingOut,
  onLogout,
  realtimeStatus,
}: OwnerMobileShellHeaderProps) {
  return (
    <header
      className="relative z-50 flex shrink-0 items-center justify-between gap-3 bg-[var(--bg)] px-3 pb-2.5 sm:px-5 sm:pb-3"
      data-testid="owner-header"
      style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <BrandMark size="sm" wordmark="hidden" />
        <div className="min-w-0 flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--accent,#008cff)] sm:text-[11px]">
              {companyName}
            </span>
            <span className="size-1.5 rounded-full" style={{ background: getRealtimeColor(realtimeStatus) }} />
          </div>
          <span
            className="truncate text-xs font-medium text-[var(--text-primary)] sm:text-sm"
            data-testid="user-display-name"
          >
            {displayName.split(' ')[0]}
          </span>
        </div>
      </div>
      <button
        aria-label="Encerrar sessão"
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--text-primary)] transition-transform active:scale-95 sm:size-10"
        data-testid="logout-button"
        disabled={isLoggingOut}
        type="button"
        onClick={onLogout}
      >
        <LogOut className="size-4" />
      </button>
    </header>
  )
}
