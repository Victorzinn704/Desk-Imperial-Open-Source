'use client'

import { LogOut } from 'lucide-react'
import { BrandMark } from '@/components/shared/brand-mark'
import type { StaffMobileShellViewModel } from './use-staff-mobile-shell-controller'

function realtimeStatusColor(status: StaffMobileShellViewModel['realtimeStatus']): string {
  if (status === 'connected') {
    return '#34f27f'
  }
  if (status === 'connecting') {
    return '#fbbf24'
  }
  return '#f87171'
}

export function StaffMobileShellHeader({ controller }: { controller: StaffMobileShellViewModel }) {
  return (
    <header
      className="flex shrink-0 items-center justify-between gap-3 bg-[var(--bg)] px-3 pb-2.5 sm:px-5 sm:pb-3"
      style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <BrandMark size="sm" wordmark="hidden" />
        <div className="min-w-0 flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--accent,#008cff)] sm:text-[11px]">
              Operacional
            </span>
            <span
              className="size-1.5 rounded-full"
              style={{ background: realtimeStatusColor(controller.realtimeStatus) }}
            />
          </div>
          <span className="truncate text-xs font-medium text-[var(--text-primary)] sm:text-sm">
            {controller.displayName.split(' ')[0]}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <button
          aria-label="Encerrar sessão"
          className="flex size-9 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--text-primary)] transition-transform active:scale-95 sm:size-10"
          disabled={controller.logoutMutation.isPending}
          type="button"
          onClick={() => controller.logoutMutation.mutate()}
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </header>
  )
}
