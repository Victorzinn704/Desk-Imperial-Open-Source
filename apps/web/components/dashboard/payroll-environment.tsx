'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { FinanceSummaryResponse } from '@contracts/contracts'
import {
  LabEmptyState,
  LabFactPill,
  LabPageHeader,
  LabPanel,
  LabSignalRow,
  LabStatusPill,
} from '@/components/design-lab/lab-primitives'
import { type EmployeeRecord, updateEmployee } from '@/lib/api'
import { formatCurrency } from '@/lib/currency'
import { PayrollClosingPanel, PayrollKpiStrip } from '@/components/dashboard/payroll/payroll-action-panels'
import { PayrollDistributionPanel } from '@/components/dashboard/payroll/payroll-distribution-panel'
import { PayrollRosterPanel } from '@/components/dashboard/payroll/payroll-roster-panel'
import { PayrollSignalsPanel } from '@/components/dashboard/payroll/payroll-signals-panel'
import type { PayrollRow } from '@/components/dashboard/payroll/payroll-types'
import {
  buildPayrollRows,
  buildPayrollTotals,
  downloadPayrollCsv,
  findTopCommissionedEmployee,
  formatPayrollMonth,
} from '@/components/dashboard/payroll/payroll-model'

export function PayrollEnvironment({
  employees,
  finance,
}: Readonly<{
  employees: EmployeeRecord[]
  finance?: FinanceSummaryResponse
}>) {
  const period = usePayrollPeriod()
  const overrides = usePayrollOverrides()
  const rows = buildPayrollRows(employees, finance, overrides.savedOverrides)
  const payments = usePayrollPayments(rows)
  const totals = buildPayrollTotals(rows, payments.paidIds)
  const maiorComissionado = findTopCommissionedEmployee(rows)
  const currency = finance?.displayCurrency ?? 'BRL'

  return (
    <PayrollView
      currency={currency}
      maiorComissionado={maiorComissionado}
      payments={payments}
      period={period}
      rows={rows}
      totals={totals}
      onCommitField={overrides.commitField}
    />
  )
}

function PayrollView({
  currency,
  maiorComissionado,
  payments,
  period,
  rows,
  totals,
  onCommitField,
}: Readonly<{
  currency: FinanceSummaryResponse['displayCurrency'] | 'BRL'
  maiorComissionado: PayrollRow | null
  payments: ReturnType<typeof usePayrollPayments>
  period: ReturnType<typeof usePayrollPeriod>
  rows: PayrollRow[]
  totals: ReturnType<typeof buildPayrollTotals>
  onCommitField: (employeeId: string, field: 'salarioBase' | 'percentualVendas', value: number) => Promise<void>
}>) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const isEmpty = rows.length === 0

  return (
    <section className="space-y-5">
      <LabPageHeader
        description="Fechamento salarial, comissões e pendências."
        eyebrow="Gestao salarial"
        title="Folha de pagamento"
      />
      <PayrollPrimaryBlocks
        currency={currency}
        isEmpty={isEmpty}
        payments={payments}
        period={period}
        rows={rows}
        totals={totals}
      />
      {isEmpty ? (
        <PayrollEmptyState currency={currency} monthLabel={period.monthLabel} />
      ) : (
        <>
          <PayrollSecondaryBlocks
            currency={currency}
            maiorComissionado={maiorComissionado}
            rows={rows}
            totals={totals}
          />
          <PayrollRosterPanel
            commitField={onCommitField}
            currency={currency}
            expanded={expanded}
            monthLabel={period.monthLabel}
            paidIds={payments.paidIds}
            rows={rows}
            setExpanded={setExpanded}
            togglePaid={payments.togglePaid}
          />
        </>
      )}
    </section>
  )
}

function PayrollPrimaryBlocks({
  currency,
  isEmpty,
  payments,
  period,
  rows,
  totals,
}: Readonly<{
  currency: FinanceSummaryResponse['displayCurrency'] | 'BRL'
  isEmpty: boolean
  payments: ReturnType<typeof usePayrollPayments>
  period: ReturnType<typeof usePayrollPeriod>
  rows: PayrollRow[]
  totals: ReturnType<typeof buildPayrollTotals>
}>) {
  return (
    <>
      <PayrollClosingPanel
        currency={currency}
        folhaTotal={totals.folhaTotal}
        monthLabel={period.monthLabel}
        paidCount={totals.paidCount}
        paidTotal={totals.paidTotal}
        pendingCount={totals.pendingCount}
        rowsCount={rows.length}
        totalComissoes={totals.totalComissoes}
        onExport={() => downloadPayrollCsv(rows, payments.paidIds, period.selectedMonth, period.selectedYear)}
        onMarkAllPaid={payments.markAllPaid}
        onNext={period.nextMonth}
        onPrev={period.prevMonth}
      />
      {isEmpty ? null : (
        <PayrollKpiStrip
          averagePayout={totals.averagePayout}
          commissionShare={totals.commissionShare}
          currency={currency}
          folhaTotal={totals.folhaTotal}
          paidCount={totals.paidCount}
          pendingCount={totals.pendingCount}
          rowsCount={rows.length}
          totalComissoes={totals.totalComissoes}
        />
      )}
    </>
  )
}

function PayrollSecondaryBlocks({
  currency,
  maiorComissionado,
  rows,
  totals,
}: Readonly<{
  currency: FinanceSummaryResponse['displayCurrency'] | 'BRL'
  maiorComissionado: PayrollRow | null
  rows: PayrollRow[]
  totals: ReturnType<typeof buildPayrollTotals>
}>) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
      <PayrollDistributionPanel
        currency={currency}
        rows={rows}
        totalBase={totals.totalBase}
        totalComissoes={totals.totalComissoes}
        totalFolha={totals.folhaTotal}
      />
      <PayrollSignalsPanel
        currency={currency}
        maiorComissionado={maiorComissionado}
        noSalesCount={totals.noSalesCount}
        pendingCount={totals.pendingCount}
        rows={rows}
        totalComissoes={totals.totalComissoes}
      />
    </div>
  )
}

function PayrollEmptyState({
  currency,
  monthLabel,
}: Readonly<{
  currency: FinanceSummaryResponse['displayCurrency'] | 'BRL'
  monthLabel: string
}>) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
      <LabPanel
        action={<LabStatusPill tone="neutral">aguardando equipe</LabStatusPill>}
        padding="md"
        title="Folha ainda sem colaboradores"
      >
        <div className="space-y-5">
          <LabEmptyState
            compact
            description="Ative colaboradores em Equipe para liberar salários, comissões e pagamentos."
            title="Nenhum colaborador entrou na folha deste período"
          />

          <div className="grid gap-3 sm:grid-cols-3">
            <LabFactPill label="periodo" value={monthLabel} />
            <LabFactPill label="folha" value={formatCurrency(0, currency)} />
            <LabFactPill label="pagamentos" value="0/0" />
          </div>

          <div className="space-y-0">
            <LabSignalRow
              label="proximo passo"
              note="cadastre ou ative colaboradores antes de fechar o mês"
              tone="info"
              value="abrir equipe"
            />
            <LabSignalRow
              label="comissoes"
              note="as comissões entram quando houver venda atribuída"
              tone="neutral"
              value={formatCurrency(0, currency)}
            />
            <LabSignalRow
              label="exportacao"
              note="o CSV libera assim que existir ao menos um colaborador na folha"
              tone="neutral"
              value="aguardando base"
            />
          </div>

          <div className="pt-1">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-xl border border-transparent bg-[var(--accent)] px-5 text-sm font-medium text-[var(--on-accent)] transition hover:bg-[var(--accent-strong)]"
              href="/design-lab/equipe"
            >
              Ir para equipe
            </Link>
          </div>
        </div>
      </LabPanel>

      <LabPanel action={<LabStatusPill tone="info">checklist</LabStatusPill>} padding="md" title="O que libera a folha">
        <div className="space-y-0">
          <LabSignalRow
            label="colaboradores ativos"
            note="ao menos um vínculo precisa estar habilitado"
            tone="warning"
            value="0"
          />
          <LabSignalRow
            label="salario base"
            note="a leitura salarial nasce da base cadastrada"
            tone="neutral"
            value="pendente"
          />
          <LabSignalRow
            label="percentual de vendas"
            note="a comissão aparece quando a regra estiver definida"
            tone="neutral"
            value="pendente"
          />
          <LabSignalRow
            label="pronto para fechar"
            note="o fechamento volta a ficar operacional assim que a equipe entrar"
            tone="info"
            value="em preparo"
          />
        </div>
      </LabPanel>
    </div>
  )
}

function usePayrollPeriod() {
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())

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

  return {
    monthLabel: formatPayrollMonth(selectedMonth, selectedYear),
    nextMonth,
    prevMonth,
    selectedMonth,
    selectedYear,
  }
}

function usePayrollPayments(rows: PayrollRow[]) {
  const [paidIds, setPaidIds] = useState<Set<string>>(new Set())

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

  return { markAllPaid, paidIds, togglePaid }
}

function usePayrollOverrides() {
  const [savedOverrides, setSavedOverrides] = useState<
    Record<string, { salarioBase?: number; percentualVendas?: number }>
  >({})

  async function commitField(employeeId: string, field: 'salarioBase' | 'percentualVendas', value: number) {
    const previousOverrides = savedOverrides
    setSavedOverrides((prev) => ({ ...prev, [employeeId]: { ...prev[employeeId], [field]: value } }))
    try {
      await updateEmployee(employeeId, { [field]: value })
    } catch {
      setSavedOverrides(previousOverrides)
    }
  }

  return { commitField, savedOverrides }
}
