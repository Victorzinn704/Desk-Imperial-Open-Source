'use client'

import type { LucideIcon } from 'lucide-react'

type OperationEmptyStateProps = {
  title: string
  description: string
  Icon: LucideIcon
  action?: React.ReactNode
}

export function OperationEmptyState({ title, description, Icon, action }: OperationEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]">
        <Icon className="size-7 text-[var(--text-soft,#7a8896)]" />
      </div>
      <p className="text-sm font-medium text-[var(--text-primary)]">{title}</p>
      <p className="mt-1 text-xs text-[var(--text-soft,#7a8896)]">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
