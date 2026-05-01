'use client'

import { LabPanel, LabSignalRow } from '@/components/design-lab/lab-primitives'
import { formatCurrency } from '@/lib/currency'
import type { PayrollCurrency, PayrollRow } from './payroll-types'

export function PayrollSignalsPanel({
  currency,
  maiorComissionado,
  noSalesCount,
  pendingCount,
  rows,
  totalComissoes,
}: Readonly<{
  currency: PayrollCurrency
  maiorComissionado: PayrollRow | null
  noSalesCount: number
  pendingCount: number
  rows: PayrollRow[]
  totalComissoes: number
}>) {
  return (
    <LabPanel padding="md" title="Radar do fechamento">
      <PayrollSignalList
        currency={currency}
        maiorComissionado={maiorComissionado}
        noSalesCount={noSalesCount}
        pendingCount={pendingCount}
        totalComissoes={totalComissoes}
      />
      <PayrollHighlight maiorComissionado={maiorComissionado} rowsCount={rows.length} />
    </LabPanel>
  )
}

function PayrollSignalList({
  currency,
  maiorComissionado,
  noSalesCount,
  pendingCount,
  totalComissoes,
}: Readonly<{
  currency: PayrollCurrency
  maiorComissionado: PayrollRow | null
  noSalesCount: number
  pendingCount: number
  totalComissoes: number
}>) {
  const items = [
    { label: 'comissoes no periodo', tone: totalComissoes > 0 ? ('success' as const) : ('neutral' as const), value: formatCurrency(totalComissoes, currency) },
    { label: 'pendentes', tone: pendingCount > 0 ? ('warning' as const) : ('success' as const), value: String(pendingCount) },
    { label: 'sem vendas atribuidas', tone: noSalesCount > 0 ? ('warning' as const) : ('success' as const), value: String(noSalesCount) },
    { label: 'maior comissao', tone: maiorComissionado?.comissao ? ('info' as const) : ('neutral' as const), value: maiorComissionado ? formatCurrency(maiorComissionado.comissao, currency) : 'sem leitura' },
  ]

  return (
    <div className="space-y-0">
      {items.map((item) => (
        <LabSignalRow key={item.label} label={item.label} tone={item.tone} value={item.value} />
      ))}
    </div>
  )
}

function PayrollHighlight({
  maiorComissionado,
  rowsCount,
}: Readonly<{
  maiorComissionado: PayrollRow | null
  rowsCount: number
}>) {
  if (!maiorComissionado) {
    return null
  }

  return (
    <div className="mt-4 border-t border-dashed border-[var(--lab-border)] pt-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--lab-fg-muted)]">Destaque do periodo</p>
      <p className="mt-2 text-sm font-semibold text-[var(--lab-fg)]">{maiorComissionado.emp.displayName}</p>
      <p className="mt-1 text-sm text-[var(--lab-fg-soft)]">
        {maiorComissionado.emp.employeeCode} · {rowsCount} colaborador(es) ativos no fechamento.
      </p>
    </div>
  )
}
