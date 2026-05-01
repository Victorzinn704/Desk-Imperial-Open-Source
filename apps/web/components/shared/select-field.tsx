import type { SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type SelectOption = {
  label: string
  value: string
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
  options: SelectOption[]
  error?: string
  hint?: string
}

export function SelectField({ label, options, error, hint, className, ...props }: SelectFieldProps) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-[var(--text-muted)]">{label}</span>
      <select
        className={cn(
          'flex h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]',
          error && 'border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger)]',
          className,
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      {!error && hint ? <p className="text-sm text-[var(--text-soft)]">{hint}</p> : null}
    </label>
  )
}
