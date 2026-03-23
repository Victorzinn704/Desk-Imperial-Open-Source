import { useId, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type InputFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  hint?: string
  error?: string
}

export function InputField({ label, hint, error, className, ...props }: InputFieldProps) {
  const generatedId = useId()
  const inputId = props.id ?? generatedId
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined

  return (
    <div className="flex flex-col space-y-2">
      <label className="text-sm font-medium text-foreground" htmlFor={inputId}>
        {label}
      </label>
      <input
        aria-describedby={describedBy}
        aria-invalid={Boolean(error)}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
          error && 'border-destructive focus-visible:ring-destructive',
          className,
        )}
        id={inputId}
        {...props}
      />
      {error ? <p className="text-xs text-destructive" id={`${inputId}-error`}>{error}</p> : null}
      {!error && hint ? <p className="text-xs text-muted-foreground" id={`${inputId}-hint`}>{hint}</p> : null}
    </div>
  )
}
