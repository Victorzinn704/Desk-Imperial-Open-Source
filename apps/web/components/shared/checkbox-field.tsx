import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type CheckboxFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string
  description?: string
  error?: string
}

export function CheckboxField({ label, description, error, className, ...props }: CheckboxFieldProps) {
  return (
    <label
      className={cn(
        'flex gap-3 rounded-2xl border border-border bg-surface-soft p-4 transition hover:border-border-strong',
        error && 'border-destructive',
        className,
      )}
    >
      <input
        className="mt-1 size-4 rounded border-border-strong bg-card text-accent accent-accent"
        type="checkbox"
        {...props}
      />
      <span className="space-y-1">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        {description ? <span className="block text-sm leading-6 text-muted-foreground">{description}</span> : null}
        {error ? <span className="block text-sm text-destructive">{error}</span> : null}
      </span>
    </label>
  )
}
