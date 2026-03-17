import type { LucideIcon } from 'lucide-react'

export function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
}: Readonly<{
  icon: LucideIcon
  label: string
  value: string
  hint: string
}>) {
  return (
    <article className="imperial-card-stat p-5">
      <span className="flex size-11 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[rgba(212,177,106,0.08)] text-[var(--accent)]">
        <Icon className="size-5" />
      </span>
      <p className="mt-5 text-sm font-medium text-[var(--text-soft)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-[var(--text-soft)]">{hint}</p>
    </article>
  )
}
