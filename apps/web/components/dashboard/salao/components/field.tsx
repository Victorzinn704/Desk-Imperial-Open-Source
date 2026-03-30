import { memo, type ReactNode } from 'react'

interface FieldProps {
  label: string
  children: ReactNode
}

export const Field = memo(function Field({ label, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-[var(--text-soft)]">{label}</label>
      {children}
    </div>
  )
})
