'use client'

import { useState } from 'react'
import {
  BadgeCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  DollarSign,
  Download,
  Percent,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import type { FinanceSummaryResponse } from '@contracts/contracts'
import { LabEmptyState, LabMetric, LabPageHeader, LabPanel, LabStatusPill, type LabStatusTone } from '@/components/design-lab/lab-primitives'
import { type EmployeeRecord, updateEmployee } from '@/lib/api'
import { formatCurrency } from '@/lib/currency'

const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Marco',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

type PayrollRow = {
  emp: EmployeeRecord
  config: {
    salarioBase: number
    percentualVendas: number
  }
  salarioBaseReais: number
  vendasDoMes: number
  comissao: number
  totalAPagar: number
}

export function PayrollEnvironment({
  employees,
  finance,
}: Readonly<{
  employees: EmployeeRecord[]
  finance?: FinanceSummaryResponse
}>) {
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [expanded, setExpanded] = useState<string | null>(null)
  const [paidIds, setPaidIds] = useState<Set<string>>(new Set())
  const [savedOverrides, setSavedOverrides] = useState<
    Record<string, { salarioBase?: number; percentualVendas?: number }>
  >({})

  const currency = finance?.displayCurrency ?? 'BRL'
  const activeEmployees = employees.filter((employee) => employee.active)
  const rows = activeEmployees.map((emp) => {
    const config = getConfig(emp, savedOverrides)
    const salarioBaseReais = config.salarioBase / 100
    const topEntry = finance?.topEmployees.find(
      (employee) => employee.employeeId === emp.id || employee.employeeCode === emp.employeeCode,
    )
    const vendasDoMes = topEntry?.revenue ?? 0
    const comissao = (vendasDoMes * config.percentualVendas) / 100
    const totalAPagar = salarioBaseReais + comissao

    return { emp, config, salarioBaseReais, vendasDoMes, comissao, totalAPagar }
  })

  const monthLabel = `${MONTHS[selectedMonth]} ${selectedYear}`
  const folhaTotal = rows.reduce((sum, row) => sum + row.totalAPagar, 0)
  const totalComissoes = rows.reduce((sum, row) => sum + row.comissao, 0)
  const paidCount = rows.filter((row) => paidIds.has(row.emp.id)).length
  const pendingCount = Math.max(rows.length - paidCount, 0)
  const averagePayout = rows.length > 0 ? folhaTotal / rows.length : 0
  const commissionShare = folhaTotal > 0 ? (totalComissoes / folhaTotal) * 100 : 0
  const noSalesCount = rows.filter((row) => row.vendasDoMes <= 0).length
  const maiorComissionado = rows.reduce(
    (best, row) => (row.comissao > (best?.comissao ?? -1) ? row : best),
    null as PayrollRow | null,
  )

  async function commitField(employeeId: string, field: 'salarioBase' | 'percentualVendas', value: number) {
    const previousOverrides = savedOverrides
    setSavedOverrides((prev) => ({ ...prev, [employeeId]: { ...prev[employeeId], [field]: value } }))
    try {
      await updateEmployee(employeeId, { [field]: value })
    } catch {
      setSavedOverrides(previousOverrides)
    }
  }

  function prevMonth() {
    if (selectedMonth === 0) {
      setSelectedMonth(11)
      setSelectedYear((year) => year - 1)
      return
    }

    setSelectedMonth((month) => month - 1)
  }

  function nextMonth() {
    if (selectedMonth === 11) {
      setSelectedMonth(0)
      setSelectedYear((year) => year + 1)
      return
    }

    setSelectedMonth((month) => month + 1)
  }

  function togglePaid(id: string) {
    setPaidIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function markAllPaid() {
    setPaidIds(new Set(rows.map((row) => row.emp.id)))
  }

  function exportCsv() {
    const header = 'Nome,Codigo,Salario Base (R$),Vendas (R$),Comissao (R$),Total (R$),Status'
    const csvRows = rows.map((row) =>
      [
        row.emp.displayName,
        row.emp.employeeCode,
        row.salarioBaseReais.toFixed(2),
        row.vendasDoMes.toFixed(2),
        row.comissao.toFixed(2),
        row.totalAPagar.toFixed(2),
        paidIds.has(row.emp.id) ? 'Pago' : 'Pendente',
      ].join(','),
    )
    const blob = new Blob([[header, ...csvRows].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `folha-${MONTHS[selectedMonth].toLowerCase()}-${selectedYear}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="space-y-5">
      <LabPageHeader
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <MonthStepper monthLabel={monthLabel} onNext={nextMonth} onPrev={prevMonth} />
            <ToolbarButton icon={Download} label="Exportar CSV" onClick={exportCsv} />
            <ToolbarButton
              icon={BadgeCheck}
              label="Marcar todos"
              tone="success"
              onClick={markAllPaid}
            />
          </div>
        }
        description="Folha salarial com leitura clara de base, comissao e status de pagamento sem vazar o visual antigo."
        eyebrow="Gestao salarial"
        meta={<PayrollMetaSummary maiorComissionado={maiorComissionado} monthLabel={monthLabel} paidCount={paidCount} rows={rows} />}
        title="Folha de pagamento"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PayrollMetricTile
          hint="folha estimada do periodo"
          icon={Wallet}
          label="folha total"
          tone="info"
          value={formatCurrency(folhaTotal, currency)}
        />
        <PayrollMetricTile
          hint="comissao sobre vendas atribuidas"
          icon={TrendingUp}
          label="comissoes"
          progress={commissionShare}
          tone={totalComissoes > 0 ? 'success' : 'neutral'}
          value={formatCurrency(totalComissoes, currency)}
        />
        <PayrollMetricTile
          hint="pagamentos com status atualizado na sessao"
          icon={BadgeCheck}
          label="pagos"
          progress={rows.length > 0 ? (paidCount / rows.length) * 100 : 0}
          tone={pendingCount === 0 && rows.length > 0 ? 'success' : 'warning'}
          value={rows.length > 0 ? `${paidCount}/${rows.length}` : '0/0'}
        />
        <PayrollMetricTile
          hint="media por colaborador ativo"
          icon={Users}
          label="media por pessoa"
          tone="neutral"
          value={formatCurrency(averagePayout, currency)}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <PayrollRosterPanel
          commitField={commitField}
          currency={currency}
          expanded={expanded}
          monthLabel={monthLabel}
          paidIds={paidIds}
          rows={rows}
          setExpanded={setExpanded}
          togglePaid={togglePaid}
        />
        <PayrollSignalsPanel
          currency={currency}
          maiorComissionado={maiorComissionado}
          noSalesCount={noSalesCount}
          pendingCount={pendingCount}
          rows={rows}
          totalComissoes={totalComissoes}
        />
      </div>
    </section>
  )
}

function getConfig(
  employee: EmployeeRecord,
  savedOverrides: Record<string, { salarioBase?: number; percentualVendas?: number }>,
) {
  const override = savedOverrides[employee.id] ?? {}
  return {
    salarioBase: override.salarioBase ?? employee.salarioBase ?? 0,
    percentualVendas: override.percentualVendas ?? employee.percentualVendas ?? 0,
  }
}

function PayrollMetaSummary({
  maiorComissionado,
  monthLabel,
  paidCount,
  rows,
}: Readonly<{
  maiorComissionado: PayrollRow | null
  monthLabel: string
  paidCount: number
  rows: PayrollRow[]
}>) {
  const items = [
    { label: 'periodo', value: monthLabel, tone: 'neutral' as const },
    { label: 'pagos', value: String(paidCount), tone: paidCount > 0 ? ('success' as const) : ('neutral' as const) },
    {
      label: 'top comissao',
      value: maiorComissionado ? maiorComissionado.emp.displayName : 'sem leitura',
      tone: maiorComissionado?.comissao ? ('info' as const) : ('neutral' as const),
    },
    { label: 'ativos', value: String(rows.length), tone: 'neutral' as const },
  ]

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

function PayrollMetricTile({
  hint,
  icon,
  label,
  progress,
  tone,
  value,
}: Readonly<{
  hint: string
  icon: typeof Wallet
  label: string
  progress?: number
  tone: LabStatusTone
  value: string
}>) {
  return (
    <LabMetric
      className="h-full"
      delta={metricToneLabel(tone)}
      deltaTone={tone}
      hint={hint}
      icon={icon}
      label={label}
      progress={progress}
      value={value}
    />
  )
}

function metricToneLabel(tone: LabStatusTone) {
  switch (tone) {
    case 'success':
      return 'ok'
    case 'warning':
      return 'pendente'
    case 'danger':
      return 'atencao'
    case 'neutral':
      return 'base'
    case 'info':
    default:
      return 'ritmo'
  }
}

function PayrollRosterPanel({
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
  currency: FinanceSummaryResponse['displayCurrency'] | 'BRL'
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
      subtitle="Abra uma linha para ajustar salario base ou percentual de comissao."
      title={`Colaboradores - ${monthLabel}`}
    >
      {rows.length > 0 ? (
        <div className="space-y-3">
          {rows.map((row) => {
            const isOpen = expanded === row.emp.id
            const isPaid = paidIds.has(row.emp.id)
            return (
              <article
                className="overflow-hidden rounded-[18px] border border-[var(--lab-border)] bg-[var(--lab-surface-raised)]"
                key={row.emp.id}
              >
                <div className="flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <button
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : row.emp.id)}
                  >
                    <span className="inline-flex size-11 items-center justify-center rounded-2xl border border-[var(--lab-border)] bg-[var(--lab-surface)] text-sm font-semibold text-[var(--lab-blue)]">
                      {initials(row.emp.displayName)}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-[var(--lab-fg)]">{row.emp.displayName}</p>
                        <LabStatusPill tone={isPaid ? 'success' : 'warning'}>
                          {isPaid ? 'pago' : 'pendente'}
                        </LabStatusPill>
                      </div>
                      <p className="mt-1 text-sm text-[var(--lab-fg-soft)]">
                        {row.emp.employeeCode} · base {formatCurrency(row.salarioBaseReais, currency)} · {row.config.percentualVendas}% de comissao
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

                {isOpen ? (
                  <div className="border-t border-[var(--lab-border)] px-4 py-4">
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

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <PayrollBreakdownTile label="vendas no mes" tone="neutral" value={formatCurrency(row.vendasDoMes, currency)} />
                      <PayrollBreakdownTile label="comissao" tone="warning" value={formatCurrency(row.comissao, currency)} />
                      <PayrollBreakdownTile label="salario base" tone="neutral" value={formatCurrency(row.salarioBaseReais, currency)} />
                      <PayrollBreakdownTile label="total a pagar" tone="success" value={formatCurrency(row.totalAPagar, currency)} />
                    </div>

                    {row.vendasDoMes === 0 && row.config.percentualVendas > 0 ? (
                      <p className="mt-3 text-xs text-[var(--lab-warning)]">
                        Nenhuma venda atribuida a este colaborador neste periodo.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      ) : (
        <LabEmptyState
          compact
          description="Cadastre funcionarios ativos para liberar o fechamento de folha."
          title="Sem colaboradores na folha"
        />
      )}
    </LabPanel>
  )
}

function PayrollSignalsPanel({
  currency,
  maiorComissionado,
  noSalesCount,
  pendingCount,
  rows,
  totalComissoes,
}: Readonly<{
  currency: FinanceSummaryResponse['displayCurrency'] | 'BRL'
  maiorComissionado: PayrollRow | null
  noSalesCount: number
  pendingCount: number
  rows: PayrollRow[]
  totalComissoes: number
}>) {
  const items = [
    {
      label: 'comissoes no periodo',
      tone: totalComissoes > 0 ? ('success' as const) : ('neutral' as const),
      value: formatCurrency(totalComissoes, currency),
    },
    {
      label: 'pendentes',
      tone: pendingCount > 0 ? ('warning' as const) : ('success' as const),
      value: String(pendingCount),
    },
    {
      label: 'sem vendas atribuidas',
      tone: noSalesCount > 0 ? ('warning' as const) : ('success' as const),
      value: String(noSalesCount),
    },
    {
      label: 'maior comissao',
      tone: maiorComissionado?.comissao ? ('info' as const) : ('neutral' as const),
      value: maiorComissionado ? formatCurrency(maiorComissionado.comissao, currency) : 'sem leitura',
    },
  ]

  return (
    <LabPanel padding="md" subtitle="Um resumo curto para acompanhar o fechamento da folha." title="Radar do fechamento">
      <div className="space-y-3">
        {items.map((item) => (
          <div
            className="flex items-center justify-between gap-4 rounded-[14px] border border-[var(--lab-border)] px-4 py-3"
            key={item.label}
          >
            <span className="text-sm text-[var(--lab-fg-soft)]">{item.label}</span>
            <LabStatusPill tone={item.tone}>{item.value}</LabStatusPill>
          </div>
        ))}
      </div>

      {maiorComissionado ? (
        <div className="mt-5 rounded-[16px] border border-[var(--lab-border)] bg-[var(--lab-surface-raised)] px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--lab-fg-muted)]">Destaque do periodo</p>
          <p className="mt-2 text-sm font-semibold text-[var(--lab-fg)]">{maiorComissionado.emp.displayName}</p>
          <p className="mt-1 text-sm text-[var(--lab-fg-soft)]">
            {maiorComissionado.emp.employeeCode} · {rows.length} colaborador(es) ativos no fechamento.
          </p>
        </div>
      ) : null}
    </LabPanel>
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
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'DI'
}
