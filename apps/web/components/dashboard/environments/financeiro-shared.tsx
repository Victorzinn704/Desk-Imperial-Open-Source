'use client'

import { type LabStatusTone } from '@/components/design-lab/lab-primitives'

export function FinanceSummaryRow({
  label,
  tone,
  value,
}: Readonly<{
  label: string
  tone: LabStatusTone
  value: string
}>) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-dashed border-[var(--lab-border)] py-4 last:border-b-0">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--lab-fg-muted)]">{label}</p>
      <p className={`text-right text-sm font-semibold ${financeToneClass(tone)}`}>{value}</p>
    </div>
  )
}

function financeToneClass(tone: LabStatusTone) {
  return {
    neutral: 'text-[var(--lab-fg)]',
    info: 'text-[var(--lab-blue)]',
    success: 'text-[var(--lab-success)]',
    warning: 'text-[var(--lab-warning)]',
    danger: 'text-[var(--lab-danger)]',
  }[tone]
}
