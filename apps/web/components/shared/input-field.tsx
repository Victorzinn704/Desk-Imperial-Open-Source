import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type InputFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  hint?: string
  error?: string
}

export function InputField({ label, hint, error, className, ...props }: InputFieldProps) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-[var(--text-muted)]">{label}</span>
      <input
        className={cn(
          'flex h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 text-sm text-[var(--text-primary)] transition-all duration-200 placeholder:text-[var(--text-soft)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]',
          error && 'border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger)]',
          className,
        )}
        {...props}
      />
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      {!error && hint ? <p className="text-sm text-[var(--text-soft)]">{hint}</p> : null}
    </label>
  )
}
