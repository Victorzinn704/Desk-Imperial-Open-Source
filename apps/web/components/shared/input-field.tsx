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
          'h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-soft)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]',
          error && 'border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[rgba(245,132,132,0.18)]',
          className,
        )}
        {...props}
      />
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      {!error && hint ? <p className="text-sm text-[var(--text-soft)]">{hint}</p> : null}
    </label>
  )
}
