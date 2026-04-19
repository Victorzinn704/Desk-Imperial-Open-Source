import { memo, type ReactNode } from 'react'

interface FieldProps {
  label: string
  children: ReactNode
}

export const Field = memo(function Field({ label, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">{label}</label>
      {children}
    </div>
  )
})
