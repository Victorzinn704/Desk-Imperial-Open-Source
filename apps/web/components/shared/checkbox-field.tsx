import { useId, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type CheckboxFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string
  description?: string
  error?: string
}

export function CheckboxField({ label, description, error, className, ...props }: CheckboxFieldProps) {
  const generatedId = useId()
  const inputId = props.id ?? generatedId
  const describedBy = error ? `${inputId}-error` : description ? `${inputId}-description` : undefined

  return (
    <div
      className={cn(
        'flex flex-row items-start space-x-3 space-y-0 rounded-md border border-border bg-card p-4 transition-colors hover:border-muted-foreground/30',
        error && 'border-destructive',
        className,
      )}
    >
      <input
        aria-describedby={describedBy}
        aria-invalid={Boolean(error)}
        className="mt-[2px] h-4 w-4 shrink-0 rounded-sm border border-primary bg-background ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none items-center justify-center checked:bg-primary checked:text-primary-foreground 
        before:content-[''] before:hidden checked:before:block before:w-[10px] before:h-[10px] before:bg-white before:rounded-sm transition-all"
        id={inputId}
        style={{
          backgroundImage: props.checked || props.defaultChecked ? `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'/%3E%3C/svg%3E")` : 'none',
          backgroundSize: '80%',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
        type="checkbox"
        {...props}
      />
      <label className="flex flex-col space-y-1" htmlFor={inputId} style={{ cursor: 'pointer' }}>
        <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground">{label}</span>
        {description ? <span className="text-sm text-muted-foreground" id={`${inputId}-description`}>{description}</span> : null}
        {error ? <span className="text-[11px] font-medium text-destructive" id={`${inputId}-error`}>{error}</span> : null}
      </label>
    </div>
  )
}
