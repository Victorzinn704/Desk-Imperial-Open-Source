import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function SettingsInfoCard({
  hint,
  label,
  value,
  badge,
  caption,
  className,
  children,
}: Readonly<{
  hint: string
  label: string
  value: string
  badge?: string
  caption?: string
  className?: string
  children?: ReactNode
}>) {
  return (
    <div
      className={cn(
        'imperial-card-soft flex flex-col gap-4 rounded-[26px] border border-white/10 bg-white/5 p-5 shadow-[0_12px_30px_rgba(0,0,0,0.25)]',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--text-soft)]">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{value}</p>
        </div>
        {badge ? (
          <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--text-muted)]">
            {badge}
          </span>
        ) : null}
      </div>

      {caption ? <p className="text-xs text-[var(--text-soft)]">{caption}</p> : null}
      <p className="text-xs leading-6 text-[var(--text-soft)]">{hint}</p>
      {children}
    </div>
  )
}
