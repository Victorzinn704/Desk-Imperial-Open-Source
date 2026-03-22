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
    <div className="flex flex-col space-y-2">
      <label className="text-sm font-medium text-foreground">
        {label}
      </label>
      <select
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
          error && 'border-destructive focus:ring-destructive',
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
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {!error && hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}
