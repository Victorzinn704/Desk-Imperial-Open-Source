'use client'

import { BadgeCheck, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import {
  LabMetricStrip,
  LabMetricStripItem,
  LabMiniStat,
  LabPanel,
  LabStatusPill,
  type LabStatusTone,
} from '@/components/design-lab/lab-primitives'
import { formatCurrency } from '@/lib/currency'
import type { PayrollCurrency } from './payroll-types'

type PayrollClosingPanelProps = Readonly<{
  currency: PayrollCurrency
  folhaTotal: number
  monthLabel: string
  paidCount: number
  paidTotal: number
  pendingCount: number
  rowsCount: number
  totalComissoes: number
  onExport: () => void
  onMarkAllPaid: () => void
  onNext: () => void
  onPrev: () => void
}>

export function PayrollClosingPanel({
  currency,
  folhaTotal,
  monthLabel,
  paidCount,
  paidTotal,
  pendingCount,
  rowsCount,
  totalComissoes,
  onExport,
  onMarkAllPaid,
  onNext,
  onPrev,
}: PayrollClosingPanelProps) {
  const closeTone = resolveCloseTone(rowsCount, pendingCount)
  const paidProgress = rowsCount > 0 ? (paidCount / rowsCount) * 100 : 0

  return (
    <LabPanel
      action={
        <LabStatusPill tone={closeTone}>{pendingCount > 0 ? `${pendingCount} pendente(s)` : 'fechado'}</LabStatusPill>
      }
      padding="md"
      title="Fechamento do mês"
    >
      <div className={rowsCount > 0 ? 'grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center' : 'grid gap-5'}>
        <PayrollClosingSummary
          currency={currency}
          folhaTotal={folhaTotal}
          monthLabel={monthLabel}
          paidCount={paidCount}
          paidProgress={paidProgress}
          paidTotal={paidTotal}
          rowsCount={rowsCount}
          totalComissoes={totalComissoes}
          onNext={onNext}
          onPrev={onPrev}
        />
        {rowsCount > 0 ? <PayrollClosingActions onExport={onExport} onMarkAllPaid={onMarkAllPaid} /> : null}
      </div>
    </LabPanel>
  )
}

function PayrollClosingSummary({
  currency,
  folhaTotal,
  monthLabel,
  paidCount,
  paidProgress,
  paidTotal,
  rowsCount,
  totalComissoes,
  onNext,
  onPrev,
}: Readonly<{
  currency: PayrollCurrency
  folhaTotal: number
  monthLabel: string
  paidCount: number
  paidProgress: number
  paidTotal: number
  rowsCount: number
  totalComissoes: number
  onNext: () => void
  onPrev: () => void
}>) {
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-3">
        <MonthStepper monthLabel={monthLabel} onNext={onNext} onPrev={onPrev} />
        <LabStatusPill tone="info">{rowsCount} colaborador(es)</LabStatusPill>
        <LabStatusPill tone={totalComissoes > 0 ? 'success' : 'neutral'}>
          {formatCurrency(totalComissoes, currency)} em comissões
        </LabStatusPill>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <LabMiniStat label="folha prevista" value={formatCurrency(folhaTotal, currency)} />
        <LabMiniStat label="já marcado pago" value={formatCurrency(paidTotal, currency)} />
        <LabMiniStat label="pendente" value={formatCurrency(Math.max(folhaTotal - paidTotal, 0), currency)} />
      </div>

      <ClosingProgress paidCount={paidCount} paidProgress={paidProgress} rowsCount={rowsCount} />
    </div>
  )
}

function ClosingProgress({
  paidCount,
  paidProgress,
  rowsCount,
}: Readonly<{
  paidCount: number
  paidProgress: number
  rowsCount: number
}>) {
  return (
    <>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--lab-surface-hover)]">
        <div
          className="h-full rounded-full bg-[var(--lab-blue)]"
          style={{ width: `${Math.max(paidProgress, rowsCount > 0 ? 4 : 0)}%` }}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--lab-fg-muted)]">
        <span>{rowsCount > 0 ? `${paidCount}/${rowsCount} pagos` : 'sem colaboradores ativos'}</span>
        <span>{paidProgress.toFixed(0)}% concluído</span>
      </div>
    </>
  )
}

function PayrollClosingActions({
  onExport,
  onMarkAllPaid,
}: Readonly<{
  onExport: () => void
  onMarkAllPaid: () => void
}>) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row xl:flex-col">
      <ToolbarButton icon={BadgeCheck} label="Marcar todos" tone="success" onClick={onMarkAllPaid} />
      <ToolbarButton icon={Download} label="Exportar CSV" onClick={onExport} />
    </div>
  )
}

export function PayrollKpiStrip({
  averagePayout,
  commissionShare,
  currency,
  folhaTotal,
  paidCount,
  pendingCount,
  rowsCount,
  totalComissoes,
}: Readonly<{
  averagePayout: number
  commissionShare: number
  currency: PayrollCurrency
  folhaTotal: number
  paidCount: number
  pendingCount: number
  rowsCount: number
  totalComissoes: number
}>) {
  return (
    <LabMetricStrip>
      <LabMetricStripItem
        description="total estimado do fechamento"
        label="folha"
        value={formatCurrency(folhaTotal, currency)}
      />
      <LabMetricStripItem
        description={`${commissionShare.toFixed(0)}% da folha`}
        label="comissões"
        value={formatCurrency(totalComissoes, currency)}
      />
      <LabMetricStripItem
        description={`${pendingCount} ainda pendente(s)`}
        label="pagamentos"
        value={rowsCount > 0 ? `${paidCount}/${rowsCount}` : '0/0'}
      />
      <LabMetricStripItem
        description="média por colaborador ativo"
        label="por pessoa"
        value={formatCurrency(averagePayout, currency)}
      />
    </LabMetricStrip>
  )
}

function MonthStepper({
  monthLabel,
  onNext,
  onPrev,
}: Readonly<{
  monthLabel: string
  onNext: () => void
  onPrev: () => void
}>) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-[var(--lab-border)] bg-[var(--lab-surface)] px-2 py-2">
      <button
        className="inline-flex size-9 items-center justify-center rounded-xl border border-[var(--lab-border)] bg-[var(--lab-surface-raised)] text-[var(--lab-fg-soft)] transition hover:bg-[var(--lab-surface-hover)] hover:text-[var(--lab-fg)]"
        type="button"
        onClick={onPrev}
      >
        <ChevronLeft className="size-4" />
      </button>
      <span className="min-w-[150px] text-center text-sm font-medium text-[var(--lab-fg)]">{monthLabel}</span>
      <button
        className="inline-flex size-9 items-center justify-center rounded-xl border border-[var(--lab-border)] bg-[var(--lab-surface-raised)] text-[var(--lab-fg-soft)] transition hover:bg-[var(--lab-surface-hover)] hover:text-[var(--lab-fg)]"
        type="button"
        onClick={onNext}
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  )
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  tone = 'neutral',
}: Readonly<{
  icon: typeof Download
  label: string
  onClick: () => void
  tone?: 'neutral' | 'success'
}>) {
  const className =
    tone === 'success'
      ? 'border-[var(--lab-success-soft)] bg-[var(--lab-success-soft)] text-[var(--lab-success)]'
      : 'border-[var(--lab-border)] bg-[var(--lab-surface)] text-[var(--lab-fg-soft)] hover:bg-[var(--lab-surface-hover)] hover:text-[var(--lab-fg)]'

  return (
    <button
      className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium transition ${className}`}
      type="button"
      onClick={onClick}
    >
      <Icon className="size-4" />
      {label}
    </button>
  )
}

function resolveCloseTone(rowsCount: number, pendingCount: number): LabStatusTone {
  if (rowsCount === 0) {
    return 'neutral'
  }

  if (pendingCount === 0) {
    return 'success'
  }

  return 'warning'
}
