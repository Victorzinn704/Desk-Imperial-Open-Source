'use client'

import { ChevronDown, ChevronUp, DollarSign, Percent } from 'lucide-react'
import {
  LAB_RESPONSIVE_FOUR_UP_GRID,
  LabEmptyState,
  LabPanel,
  LabStatusPill,
  type LabStatusTone,
} from '@/components/design-lab/lab-primitives'
import { formatCurrency } from '@/lib/currency'
import type { PayrollCurrency, PayrollRow } from './payroll-types'

export function PayrollRosterPanel({
  commitField,
  currency,
  expanded,
  monthLabel,
  paidIds,
  rows,
  setExpanded,
  togglePaid,
}: Readonly<{
  commitField: (employeeId: string, field: 'salarioBase' | 'percentualVendas', value: number) => Promise<void>
  currency: PayrollCurrency
  expanded: string | null
  monthLabel: string
  paidIds: Set<string>
  rows: PayrollRow[]
  setExpanded: (value: string | null) => void
  togglePaid: (id: string) => void
}>) {
  return (
    <LabPanel
      action={<LabStatusPill tone="neutral">{rows.length} registros</LabStatusPill>}
      padding="md"
      title={`Colaboradores - ${monthLabel}`}
    >
      {rows.length > 0 ? (
        <div className="space-y-0">
          {rows.map((row) => (
            <PayrollRosterRow
              commitField={commitField}
              currency={currency}
              isOpen={expanded === row.emp.id}
              isPaid={paidIds.has(row.emp.id)}
              key={row.emp.id}
              row={row}
              setExpanded={setExpanded}
              togglePaid={togglePaid}
            />
          ))}
        </div>
      ) : (
        <LabEmptyState compact description="Sem funcionario ativo." title="Sem colaboradores na folha" />
      )}
    </LabPanel>
  )
}

function PayrollRosterRow({
  commitField,
  currency,
  isOpen,
  isPaid,
  row,
  setExpanded,
  togglePaid,
}: Readonly<{
  commitField: (employeeId: string, field: 'salarioBase' | 'percentualVendas', value: number) => Promise<void>
  currency: PayrollCurrency
  isOpen: boolean
  isPaid: boolean
  row: PayrollRow
  setExpanded: (value: string | null) => void
  togglePaid: (id: string) => void
}>) {
  return (
    <article className="border-b border-[var(--lab-border)] last:border-b-0">
      <div className="flex flex-col gap-4 px-1 py-4 lg:flex-row lg:items-center lg:justify-between">
        <PayrollRosterToggle
          currency={currency}
          isOpen={isOpen}
          isPaid={isPaid}
          row={row}
          onClick={() => setExpanded(isOpen ? null : row.emp.id)}
        />

        <button
          className={[
            'inline-flex items-center rounded-xl border px-3 py-2 text-sm font-medium transition',
            isPaid
              ? 'border-[var(--lab-success-soft)] bg-[var(--lab-success-soft)] text-[var(--lab-success)]'
              : 'border-[var(--lab-border)] bg-[var(--lab-surface)] text-[var(--lab-fg-soft)] hover:bg-[var(--lab-surface-hover)] hover:text-[var(--lab-fg)]',
          ].join(' ')}
          type="button"
          onClick={() => togglePaid(row.emp.id)}
        >
          {isPaid ? 'Marcar pendente' : 'Marcar pago'}
        </button>
      </div>

      {isOpen ? <PayrollRosterDetails commitField={commitField} currency={currency} row={row} /> : null}
    </article>
  )
}

function PayrollRosterToggle({
  currency,
  isOpen,
  isPaid,
  row,
  onClick,
}: Readonly<{
  currency: PayrollCurrency
  isOpen: boolean
  isPaid: boolean
  row: PayrollRow
  onClick: () => void
}>) {
  return (
    <button className="flex min-w-0 flex-1 items-center gap-3 text-left" type="button" onClick={onClick}>
      <span className="inline-flex size-11 items-center justify-center rounded-2xl border border-[var(--lab-border)] bg-[var(--lab-surface)] text-sm font-semibold text-[var(--lab-blue)]">
        {initials(row.emp.displayName)}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-[var(--lab-fg)]">{row.emp.displayName}</p>
          <LabStatusPill tone={isPaid ? 'success' : 'warning'}>{isPaid ? 'pago' : 'pendente'}</LabStatusPill>
        </div>
        <p className="mt-1 text-sm text-[var(--lab-fg-soft)]">
          {row.emp.employeeCode} · base {formatCurrency(row.salarioBaseReais, currency)} · {row.config.percentualVendas}
          % de comissao
        </p>
      </div>

      <div className="text-left lg:text-right">
        <p className="text-sm font-semibold text-[var(--lab-fg)]">{formatCurrency(row.totalAPagar, currency)}</p>
        <p className="mt-1 text-xs text-[var(--lab-fg-muted)]">total previsto</p>
      </div>

      {isOpen ? (
        <ChevronUp className="size-4 shrink-0 text-[var(--lab-fg-soft)]" />
      ) : (
        <ChevronDown className="size-4 shrink-0 text-[var(--lab-fg-soft)]" />
      )}
    </button>
  )
}

function PayrollRosterDetails({
  commitField,
  currency,
  row,
}: Readonly<{
  commitField: (employeeId: string, field: 'salarioBase' | 'percentualVendas', value: number) => Promise<void>
  currency: PayrollCurrency
  row: PayrollRow
}>) {
  return (
    <div className="rounded-[16px] border border-dashed border-[var(--lab-border)] bg-[var(--lab-surface-raised)] px-4 py-4">
      <div className="grid gap-3 md:grid-cols-2">
        <NumberField
          icon={DollarSign}
          label="Salario base (R$)"
          max={undefined}
          min={0}
          step={10}
          value={row.salarioBaseReais}
          onCommit={(value) => commitField(row.emp.id, 'salarioBase', Math.round(value * 100))}
        />
        <NumberField
          icon={Percent}
          label="% sobre vendas"
          max={30}
          min={0}
          step={0.5}
          value={row.config.percentualVendas}
          onCommit={(value) => commitField(row.emp.id, 'percentualVendas', value)}
        />
      </div>

      <div className={`mt-4 grid gap-3 ${LAB_RESPONSIVE_FOUR_UP_GRID}`}>
        <PayrollBreakdownTile label="vendas no mes" tone="neutral" value={formatCurrency(row.vendasDoMes, currency)} />
        <PayrollBreakdownTile label="comissao" tone="warning" value={formatCurrency(row.comissao, currency)} />
        <PayrollBreakdownTile
          label="salario base"
          tone="neutral"
          value={formatCurrency(row.salarioBaseReais, currency)}
        />
        <PayrollBreakdownTile label="total a pagar" tone="success" value={formatCurrency(row.totalAPagar, currency)} />
      </div>

      {row.vendasDoMes === 0 && row.config.percentualVendas > 0 ? (
        <p className="mt-3 text-xs text-[var(--lab-warning)]">
          Nenhuma venda atribuida a este colaborador neste periodo.
        </p>
      ) : null}
    </div>
  )
}

function NumberField({
  icon: Icon,
  label,
  max,
  min,
  step,
  value,
  onCommit,
}: Readonly<{
  icon: typeof DollarSign
  label: string
  max: number | undefined
  min: number
  step: number
  value: number
  onCommit: (value: number) => void
}>) {
  return (
    <label className="rounded-[16px] border border-[var(--lab-border)] bg-[var(--lab-surface)] px-4 py-3">
      <span className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-[var(--lab-fg-muted)]">
        <Icon className="size-3.5" />
        {label}
      </span>
      <input
        className="mt-2 h-11 w-full rounded-xl border border-[var(--lab-border)] bg-[var(--lab-surface-raised)] px-3 text-sm text-[var(--lab-fg)] outline-none transition placeholder:text-[var(--lab-fg-muted)] focus:border-[var(--lab-blue-border)]"
        defaultValue={value}
        key={`${label}-${value}`}
        max={max}
        min={min}
        step={step}
        type="number"
        onBlur={(event) => onCommit(Number(event.target.value))}
      />
    </label>
  )
}

function PayrollBreakdownTile({
  label,
  tone,
  value,
}: Readonly<{
  label: string
  tone: LabStatusTone
  value: string
}>) {
  return (
    <div className="rounded-[14px] border border-[var(--lab-border)] bg-[var(--lab-surface)] px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--lab-fg-muted)]">{label}</p>
      <div className="mt-2">
        <LabStatusPill tone={tone}>{value}</LabStatusPill>
      </div>
    </div>
  )
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return (
    parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'DI'
  )
}
