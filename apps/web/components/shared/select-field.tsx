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
      <span className="text-sm font-medium text-label">{label}</span>
      <select
        className={cn(
          'h-12 w-full rounded-2xl border border-border bg-surface-soft px-4 text-sm text-foreground outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/20',
          error && 'border-destructive focus:border-destructive focus:ring-destructive/20',
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
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!error && hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
    </label>
  )
}
