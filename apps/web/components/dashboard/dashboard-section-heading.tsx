import type { LucideIcon } from 'lucide-react'

export function DashboardSectionHeading({
  description,
  icon: Icon,
  eyebrow,
  title,
}: Readonly<{
  description?: string
  icon: LucideIcon
  eyebrow: string
  title: string
}>) {
  return (
    <div className="flex items-start gap-3 border-b border-white/[0.05] pb-5">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03] text-[var(--text-soft)]">
        <Icon className="size-4" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-soft)]">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-xl font-semibold text-white">{title}</h2>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[var(--text-soft)]">{description}</p>
        ) : null}
      </div>
    </div>
  )
}
