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
    <div className="imperial-card-soft px-5 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">{label}</p>
      <p className="mt-3 text-lg font-semibold text-white">{value}</p>
      <p className="mt-2 text-xs leading-6 text-[var(--text-soft)]">{helper}</p>
    </div>
  )
}
