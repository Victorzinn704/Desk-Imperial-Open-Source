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
    <div className="imperial-card-soft flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
      <span className="flex size-12 items-center justify-center rounded-[20px] border border-[color-mix(in_srgb,_var(--success)_24%,_transparent)] bg-[color-mix(in_srgb,_var(--success)_9%,_transparent)] text-[var(--success)] shadow-[0_0_30px_rgba(52,242,127,0.12)]">
        <Icon className="size-5" />
      </span>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{title}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-soft)]">{description}</p>
      </div>
    </div>
  )
}
