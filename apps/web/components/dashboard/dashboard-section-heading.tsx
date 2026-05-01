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
    <div className="space-y-1.5 border-b border-dashed border-[var(--border-strong)] pb-3">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">
        <Icon className="size-3.5" />
        <span>{eyebrow}</span>
      </div>
      <h2 className="font-['Architects_Daughter','Patrick_Hand',sans-serif] text-[1.45rem] font-semibold leading-tight text-[var(--text-primary)] md:text-[1.55rem]">
        {title}
      </h2>
      <p className="max-w-2xl text-[0.84rem] leading-5 text-[var(--text-soft)]">{description}</p>
    </div>
  )
}
