import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function FormShell({
  eyebrow,
  title,
  description,
  aside,
  children,
  className,
  id,
}: Readonly<{
  eyebrow: string
  title: string
  description: string
  aside?: ReactNode
  children: ReactNode
  className?: string
  id?: string
}>) {
  return (
    <article className={cn('bg-card border border-border rounded-xl p-6 md:p-8 shadow-sm', className)} id={id}>
      <div className="flex flex-col gap-6 border-b border-border pb-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
        {aside ? <div className="lg:w-[320px]">{aside}</div> : null}
      </div>

      <div className="mt-8 space-y-8">{children}</div>
    </article>
  )
}

export function FormSection({
  index,
  title,
  description,
  children,
}: Readonly<{
  index: string
  title: string
  description: string
  children: ReactNode
}>) {
  return (
    <section className="rounded-xl border border-border bg-background/50 p-5 md:p-6 transition-colors hover:bg-background/80">
      <div className="flex flex-col gap-3 border-b border-border/50 pb-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="inline-flex size-6 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold text-foreground">
              {index}
            </span>
            <h3 className="text-base font-semibold text-foreground tracking-tight">{title}</h3>
          </div>
          <p className="mt-2.5 max-w-3xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="mt-6 space-y-5">{children}</div>
    </section>
  )
}

export function FormStat({
  label,
  value,
  hint,
}: Readonly<{
  label: string
  value: string
  hint?: string
}>) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold tracking-tight text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs leading-5 text-muted-foreground/70">{hint}</p> : null}
    </div>
  )
}
