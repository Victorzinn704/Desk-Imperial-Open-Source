'use client'

import type { ReactNode } from 'react'
import { progressWidth } from './financeiro-tab-panels.model'

export function FinanceProgressRow({
  aside,
  leading,
  shareLabel,
  sharePercent,
  subtitle,
  title,
}: Readonly<{
  aside: ReactNode
  leading?: ReactNode
  shareLabel: string
  sharePercent: number
  subtitle: ReactNode
  title: string
}>) {
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {leading}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[var(--lab-fg)]">{title}</p>
            <p className="mt-1 text-xs text-[var(--lab-fg-soft)]">{subtitle}</p>
          </div>
        </div>
        <div className="shrink-0 text-right">{aside}</div>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--lab-surface-hover)]">
        <div className="h-full rounded-full bg-[var(--lab-blue)]" style={{ width: progressWidth(sharePercent) }} />
      </div>
      <p className="text-right text-xs text-[var(--lab-fg-soft)]">{shareLabel}</p>
    </div>
  )
}

export function ProgressRowValue({ label, value }: Readonly<{ label: string; value: ReactNode }>) {
  return (
    <>
      <p className="text-sm font-medium text-[var(--lab-fg)]">{value}</p>
      <p className="mt-1 text-xs text-[var(--lab-fg-soft)]">{label}</p>
    </>
  )
}
