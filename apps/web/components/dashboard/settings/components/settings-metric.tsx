export function SettingsMetric({
  helper,
  label,
  value,
}: Readonly<{
  helper: string
  label: string
  value: string
}>) {
  return (
    <div className="relative overflow-hidden rounded-[22px] border border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] px-5 py-4">
      <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/60 to-transparent" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">{label}</p>
          <p className="mt-3 break-words text-lg font-semibold leading-6 text-[var(--text-primary)]">{value}</p>
        </div>
        <span className="mt-1 inline-flex size-2 shrink-0 rounded-full bg-[var(--accent)] shadow-[0_0_0_4px_color-mix(in_srgb,_var(--accent)_12%,_transparent)]" />
      </div>
      <p className="mt-3 text-xs leading-6 text-[var(--text-soft)]">{helper}</p>
    </div>
  )
}
