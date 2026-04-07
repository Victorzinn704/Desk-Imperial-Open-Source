import type { LucideIcon } from 'lucide-react'

export function DashboardSectionHeading({
  description,
  icon: Icon,
  eyebrow,
  title,
}: Readonly<{
  description: string
  icon: LucideIcon
  eyebrow: string
  title: string
}>) {
  return (
    <div className="imperial-card-soft flex flex-col gap-4 rounded-[28px] border border-white/5 bg-[var(--surface-muted)] p-5 shadow-[0_15px_30px_rgba(0,0,0,0.35)] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#008cff]/60 bg-[#008cff]/10 text-[#008cff] shadow-[0_0_30px_rgba(0,140,255,0.25)]">
          <Icon className="size-5" />
        </span>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.45em] text-[var(--text-soft)]">{eyebrow}</p>
          <h2 className="text-2xl font-semibold leading-tight text-white">{title}</h2>
        </div>
      </div>
      <p className="max-w-2xl text-sm leading-6 text-[var(--text-soft)] sm:ml-6">{description}</p>
    </div>
  )
}
