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
    <div className="imperial-card-soft p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">{label}</p>
      <p className="mt-3 text-xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm leading-7 text-[var(--text-soft)]">{hint}</p>
    </div>
  )
}
