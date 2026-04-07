import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function ListSurface({
  eyebrow,
  title,
  description,
  actions,
  children,
  className,
  id,
}: Readonly<{
  eyebrow: string
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
  id?: string
}>) {
  return (
    <section className={cn('imperial-card p-6 md:p-7', className)} id={id}>
      <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">{eyebrow}</p>
          <h2 className="mt-3 text-2xl font-semibold text-[var(--text-primary)] md:text-[1.9rem]">{title}</h2>
          {description ? <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">{description}</p> : null}
        </div>
        {actions ? <div className="lg:max-w-[360px]">{actions}</div> : null}
      </div>

      <div className="mt-6 space-y-4">{children}</div>
    </section>
  )
}

export function ListRow({
  title,
  subtitle,
  meta,
  actions,
  leading,
  details,
  status,
  className,
}: Readonly<{
  title: ReactNode
  subtitle?: ReactNode
  meta?: ReactNode
  actions?: ReactNode
  leading?: ReactNode
  details?: ReactNode
  status?: ReactNode
  className?: string
}>) {
  return (
    <article
      className={cn(
        'rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-panel)] md:p-5',
        className,
      )}
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          {leading ? <div className="shrink-0">{leading}</div> : null}
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0">{title}</div>
              {status ? <div>{status}</div> : null}
            </div>
            {subtitle ? <div className="text-sm leading-7 text-[var(--text-soft)]">{subtitle}</div> : null}
            {meta ? <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">{meta}</div> : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap gap-2 xl:justify-end">{actions}</div> : null}
      </div>

      {details ? <div className="mt-4 border-t border-[var(--border)] pt-4">{details}</div> : null}
    </article>
  )
}

export function ListMetric({
  label,
  value,
  hint,
  tone = 'default',
}: Readonly<{
  label: string
  value: ReactNode
  hint?: ReactNode
  tone?: 'default' | 'accent' | 'info' | 'success' | 'danger'
}>) {
  const toneClass =
    tone === 'accent'
      ? 'text-[var(--accent)]'
      : tone === 'info'
        ? 'text-[var(--info)]'
        : tone === 'success'
          ? 'text-[var(--success)]'
          : tone === 'danger'
            ? 'text-[var(--danger)]'
            : 'text-[var(--text-primary)]'

  return (
    <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-soft)]">{label}</p>
      <p className={cn('mt-3 text-lg font-semibold', toneClass)}>{value}</p>
      {hint ? <p className="mt-2 text-xs leading-6 text-[var(--text-soft)]">{hint}</p> : null}
    </div>
  )
}

export function ListEmptyState({
  title,
  description,
  action,
}: Readonly<{
  title: string
  description: string
  action?: ReactNode
}>) {
  return (
    <div className="rounded-[22px] border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-10 text-center">
      <p className="text-lg font-semibold text-[var(--text-primary)]">{title}</p>
      <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  )
}
