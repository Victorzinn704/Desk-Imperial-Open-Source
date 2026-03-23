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
      <span className="text-sm font-medium text-label">{label}</span>
      <input
        className={cn(
          'imperial-input h-12 w-full rounded-2xl border border-border bg-surface-soft px-4 text-sm text-foreground transition-[border-color] duration-200 placeholder:text-muted-foreground',
          error && 'imperial-input--error border-destructive',
          className,
        )}
        {...props}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!error && hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
    </label>
  )
}
