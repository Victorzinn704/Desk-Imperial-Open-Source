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
        'flex gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 transition-colors hover:border-[var(--border-strong)]',
        error && 'border-[var(--danger)]',
        className,
      )}
    >
      <input
        className="mt-1 size-4 rounded border-[var(--border-strong)] bg-[var(--surface)] text-[var(--accent)] accent-[var(--accent)]"
        type="checkbox"
        {...props}
      />
      <span className="space-y-1">
        <span className="block text-sm font-medium text-[var(--text-primary)]">{label}</span>
        {description ? <span className="block text-sm leading-6 text-[var(--text-soft)]">{description}</span> : null}
        {error ? <span className="block text-sm text-[var(--danger)]">{error}</span> : null}
      </span>
    </label>
  )
}
