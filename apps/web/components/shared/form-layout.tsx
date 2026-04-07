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
    <article
      className={cn('rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8', className)}
      id={id}
    >
      <div className="flex flex-col gap-5 border-b border-[var(--border)] pb-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">{eyebrow}</p>
          <h2 className="mt-3 text-2xl font-semibold text-[var(--text-primary)] md:text-[2rem]">{title}</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">{description}</p>
        </div>
        {aside ? <div className="lg:w-[320px]">{aside}</div> : null}
      </div>

      <div className="mt-6 space-y-6">{children}</div>
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
    <section className="border-b border-[var(--border)] py-6 first:pt-4 last:border-0">
      <div className="flex flex-col gap-3 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="inline-flex min-w-8 items-center justify-center rounded-full border border-[rgba(37,99,235,0.22)] bg-[rgba(37,99,235,0.08)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              {index}
            </span>
            <h3 className="text-lg font-medium text-[var(--text-primary)]">{title}</h3>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-soft)]">{description}</p>
        </div>
      </div>

      <div className="mt-5 space-y-5">{children}</div>
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
    <div className="border-l-2 border-[var(--border)] px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-soft)]">{label}</p>
      <p className="mt-3 text-lg font-semibold text-[var(--text-primary)]">{value}</p>
      {hint ? <p className="mt-2 text-xs leading-6 text-[var(--text-soft)]">{hint}</p> : null}
    </div>
  )
}
