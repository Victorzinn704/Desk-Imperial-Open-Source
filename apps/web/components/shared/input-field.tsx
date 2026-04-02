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
          'imperial-input h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 text-sm text-[var(--text-primary)] transition-[border-color] duration-200 placeholder:text-[var(--text-soft)]',
          error && 'imperial-input--error border-[var(--danger)]',
          className,
        )}
        {...props}
      />
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      {!error && hint ? <p className="text-sm text-[var(--text-soft)]">{hint}</p> : null}
    </label>
  )
}
