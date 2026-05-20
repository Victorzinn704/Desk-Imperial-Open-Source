import type { InputHTMLAttributes } from 'react'

type OwnerFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
}

export function OwnerField({ className, error, label, ...props }: Readonly<OwnerFieldProps>) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-[var(--text-muted)]">{label}</span>
      <input
        {...props}
        className={`flex h-11 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 text-sm text-[var(--text-primary)] transition placeholder:text-[var(--text-soft)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] ${className ?? ''}`}
      />
      {error ? <p className="text-xs text-[#fca5a5]">{error}</p> : null}
    </label>
  )
}
