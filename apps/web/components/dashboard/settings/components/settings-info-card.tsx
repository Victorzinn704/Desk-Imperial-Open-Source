export function SettingsInfoCard({
  hint,
  label,
  value,
}: Readonly<{
  hint: string
  label: string
  value: string
}>) {
  return (
    <div className="rounded-[18px] border border-white/6 bg-white/[0.02] px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">{label}</p>
      <p className="mt-2 text-base font-semibold leading-6 text-[var(--text-primary)]">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">{hint}</p>
    </div>
  )
}
