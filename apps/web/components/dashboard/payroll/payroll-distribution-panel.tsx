'use client'

import { BarChart3 } from 'lucide-react'
import { LabEmptyState, LabPanel, LabStatusPill, type LabStatusTone } from '@/components/design-lab/lab-primitives'
import { formatCurrency } from '@/lib/currency'
import type { PayrollCurrency, PayrollRow } from './payroll-types'

export function PayrollDistributionPanel({
  currency,
  rows,
  totalBase,
  totalComissoes,
  totalFolha,
}: Readonly<{
  currency: PayrollCurrency
  rows: PayrollRow[]
  totalBase: number
  totalComissoes: number
  totalFolha: number
}>) {
  const maxPayout = Math.max(...rows.map((row) => row.totalAPagar), 1)
  const topRows = [...rows].sort((a, b) => b.totalAPagar - a.totalAPagar).slice(0, 6)
  const baseShare = totalFolha > 0 ? (totalBase / totalFolha) * 100 : 0
  const commissionShare = totalFolha > 0 ? (totalComissoes / totalFolha) * 100 : 0

  return (
    <LabPanel
      action={<LabStatusPill tone="neutral">{rows.length} ativos</LabStatusPill>}
      padding="md"
      title="Distribuição da folha"
    >
      <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)] xl:items-start">
        <PayrollCompositionSummary
          baseShare={baseShare}
          commissionShare={commissionShare}
          currency={currency}
          totalBase={totalBase}
          totalComissoes={totalComissoes}
          totalFolha={totalFolha}
        />
        <PayrollTopPayouts currency={currency} maxPayout={maxPayout} rows={topRows} />
      </div>
    </LabPanel>
  )
}

function PayrollCompositionSummary({
  baseShare,
  commissionShare,
  currency,
  totalBase,
  totalComissoes,
  totalFolha,
}: Readonly<{
  baseShare: number
  commissionShare: number
  currency: PayrollCurrency
  totalBase: number
  totalComissoes: number
  totalFolha: number
}>) {
  return (
    <div className="space-y-4">
      <CompositionBar label="base salarial" tone="info" value={formatCurrency(totalBase, currency)} width={baseShare} />
      <CompositionBar
        label="comissões"
        tone={totalComissoes > 0 ? 'success' : 'neutral'}
        value={formatCurrency(totalComissoes, currency)}
        width={commissionShare}
      />
      <div className="rounded-[16px] border border-dashed border-[var(--lab-border)] px-4 py-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-xl border border-[var(--lab-border)] bg-[var(--lab-surface-raised)] text-[var(--lab-blue)]">
            <BarChart3 className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-[var(--lab-fg)]">{formatCurrency(totalFolha, currency)}</p>
            <p className="text-xs text-[var(--lab-fg-soft)]">base + comissão do período</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function PayrollTopPayouts({
  currency,
  maxPayout,
  rows,
}: Readonly<{
  currency: PayrollCurrency
  maxPayout: number
  rows: PayrollRow[]
}>) {
  if (rows.length === 0) {
    return (
      <LabEmptyState compact description="Cadastre funcionários ativos para montar a folha." title="Sem distribuição" />
    )
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <PayrollPayoutBar currency={currency} key={row.emp.id} maxPayout={maxPayout} row={row} />
      ))}
    </div>
  )
}

function PayrollPayoutBar({
  currency,
  maxPayout,
  row,
}: Readonly<{
  currency: PayrollCurrency
  maxPayout: number
  row: PayrollRow
}>) {
  const width = (row.totalAPagar / maxPayout) * 100

  return (
    <div className="border-b border-dashed border-[var(--lab-border)] pb-3 last:border-b-0 last:pb-0">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--lab-fg)]">{row.emp.displayName}</p>
          <p className="mt-1 text-xs text-[var(--lab-fg-soft)]">
            {formatCurrency(row.salarioBaseReais, currency)} base · {formatCurrency(row.comissao, currency)} comissão
          </p>
        </div>
        <span className="shrink-0 text-sm font-semibold text-[var(--lab-fg)]">
          {formatCurrency(row.totalAPagar, currency)}
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--lab-surface-hover)]">
        <div className="h-full rounded-full bg-[var(--lab-blue)]" style={{ width: `${Math.max(width, 4)}%` }} />
      </div>
    </div>
  )
}

function CompositionBar({
  label,
  tone,
  value,
  width,
}: Readonly<{
  label: string
  tone: LabStatusTone
  value: string
  width: number
}>) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--lab-fg-muted)]">{label}</p>
        <LabStatusPill tone={tone}>{value}</LabStatusPill>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--lab-surface-hover)]">
        <div
          className="h-full rounded-full bg-[var(--lab-blue)]"
          style={{ width: `${Math.max(0, Math.min(width, 100))}%` }}
        />
      </div>
    </div>
  )
}
