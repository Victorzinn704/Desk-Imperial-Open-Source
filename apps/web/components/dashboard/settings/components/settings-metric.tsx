import { cn } from '@/lib/utils'

export function SettingsMetric({
  helper,
  label,
  value,
  accent,
  trend,
  caption,
  status,
  className,
}: Readonly<{
  helper: string
  label: string
  value: string
  accent?: string
  trend?: string
  caption?: string
  status?: string
  className?: string
}>) {
  return (
    <div
      className={cn(
        'imperial-card-soft flex flex-col gap-3 rounded-2xl border-white/5 bg-white/5 p-5 md:p-6',
        className,
      )}
      style={accent ? { borderColor: `${accent}33`, backgroundColor: `${accent}0d` } : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 text-sm font-semibold uppercase leading-none text-[var(--text-primary)]"
            style={
              accent
                ? { borderColor: `${accent}33`, color: accent, backgroundColor: `${accent}1a` }
                : undefined
            }
          >
            {label[0]}
          </span>
          <div className="flex flex-col">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--text-soft)]">{label}</p>
            <p className="text-xs text-[var(--text-muted)]">{helper}</p>
          </div>
        </div>
        {status ? (
          <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--text-muted)]">
            {status}
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <p className="text-3xl font-semibold text-[var(--text-primary)]">{value}</p>
        {trend ? <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">{trend}</span> : null}
      </div>

      {caption ? <p className="text-xs text-[var(--text-soft)]">{caption}</p> : null}
    </div>
  )
}
