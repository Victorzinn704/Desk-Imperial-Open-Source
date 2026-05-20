import type { LucideIcon } from 'lucide-react'
import { LabMetric, LabStatusPill, type LabStatusTone } from '@/components/design-lab/lab-primitives'
import type { EquipeCurrency, EquipeRow } from './equipe-environment.types'
import { buildEquipeMetaItems, toneLabel } from './equipe-environment.helpers'

export function EquipeMetaSummary({
  averageTicket,
  currency,
  highlightedRow,
  rows,
  totalCommission,
}: Readonly<{
  averageTicket: number
  currency: EquipeCurrency
  highlightedRow: EquipeRow | null
  rows: EquipeRow[]
  totalCommission: number
}>) {
  const items = buildEquipeMetaItems({ averageTicket, currency, highlightedRow, rows, totalCommission })

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--lab-border)] pb-3 last:border-b-0 last:pb-0"
          key={item.label}
        >
          <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--lab-fg-muted)]">{item.label}</span>
          <LabStatusPill tone={item.tone}>{item.value}</LabStatusPill>
        </div>
      ))}
    </div>
  )
}

export function EquipeMetricTile({
  hint,
  icon,
  label,
  progress,
  tone = 'info',
  value,
}: Readonly<{
  hint: string
  icon: LucideIcon
  label: string
  progress?: number
  tone?: LabStatusTone
  value: string
}>) {
  return (
    <LabMetric
      className="h-full"
      delta={toneLabel(tone)}
      deltaTone={tone}
      hint={hint}
      icon={icon}
      label={label}
      progress={progress}
      value={value}
    />
  )
}

export function EquipeMiniStat({
  label,
  value,
}: Readonly<{
  label: string
  value: string
}>) {
  return (
    <div className="rounded-[18px] border border-[var(--lab-border)] bg-[var(--lab-surface-raised)] px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--lab-fg-muted)]">{label}</p>
      <p className="mt-2 text-lg font-semibold text-[var(--lab-fg)]">{value}</p>
    </div>
  )
}

export function EquipeSignalRow({
  label,
  tone,
  value,
}: Readonly<{
  label: string
  tone: LabStatusTone
  value: string
}>) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--lab-border)] pb-4 last:border-b-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--lab-fg-muted)]">{label}</p>
      </div>
      <LabStatusPill size="md" tone={tone}>
        {value}
      </LabStatusPill>
    </div>
  )
}
