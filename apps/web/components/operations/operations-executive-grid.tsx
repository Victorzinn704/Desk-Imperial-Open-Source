'use client'

import { useState } from 'react'
import type { CSSProperties } from 'react'
import { AllCommunityModule, ModuleRegistry, type ColDef } from 'ag-grid-community'
import { AgGridReact } from 'ag-grid-react'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import { Banknote, Layers3, ShieldCheck, Table2, UserRound, type LucideIcon } from 'lucide-react'
import type { OperationGridRow } from '@/lib/operations/operations-types'
import { formatMoney, formatShortTime, getCashSessionTone, getComandaTone } from '@/lib/operations/operations-visuals'

const gridThemeStyle = {
  '--ag-background-color': 'rgba(7, 10, 16, 0.92)',
  '--ag-foreground-color': '#f5f7fa',
  '--ag-header-background-color': 'rgba(255, 255, 255, 0.04)',
  '--ag-header-foreground-color': '#d7dbe0',
  '--ag-odd-row-background-color': 'rgba(255, 255, 255, 0.015)',
  '--ag-row-hover-color': 'rgba(212, 177, 106, 0.08)',
  '--ag-border-color': 'rgba(255, 255, 255, 0.08)',
  '--ag-secondary-border-color': 'rgba(255, 255, 255, 0.05)',
  '--ag-selected-row-background-color': 'rgba(212, 177, 106, 0.12)',
  '--ag-input-focus-border-color': '#d4b16a',
  '--ag-font-size': '13px',
  '--ag-font-family': 'var(--font-geist-sans, inherit)',
} as CSSProperties

ModuleRegistry.registerModules([AllCommunityModule])

export function OperationsExecutiveGrid({
  rows,
  title = 'Operação em tempo real',
  description = 'Visão consolidada por funcionário, mesa e caixa para o time executivo acompanhar o salão ao vivo.',
}: Readonly<{
  rows: OperationGridRow[]
  title?: string
  description?: string
}>) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(rows[0]?.employee.employeeId ?? null)
  const resolvedSelectedEmployeeId = rows.some((row) => row.employee.employeeId === selectedEmployeeId)
    ? selectedEmployeeId
    : rows[0]?.employee.employeeId ?? null

  const totals = rows.reduce(
    (accumulator, row) => {
      accumulator.employeeCount += 1
      accumulator.tableCount += row.tables.length
      accumulator.openCashSessions += row.employee.cashSessionStatus === 'open' ? 1 : 0
      accumulator.salesRevenue += row.employee.salesRevenue
      accumulator.salesProfit += row.employee.salesProfit
      accumulator.cashExpected += row.employee.cashExpectedAmount
      accumulator.cashCurrent += row.employee.cashCurrentAmount
      return accumulator
    },
    {
      employeeCount: 0,
      tableCount: 0,
      openCashSessions: 0,
      salesRevenue: 0,
      salesProfit: 0,
      cashExpected: 0,
      cashCurrent: 0,
    },
  )

  const selectedRow = rows.find((row) => row.employee.employeeId === resolvedSelectedEmployeeId) ?? rows[0] ?? null

  const summaryRows = rows.map((row) => ({
    employeeId: row.employee.employeeId,
    employeeName: row.employee.employeeName,
    employeeCode: row.employee.employeeCode,
    role: row.employee.role,
    cashStatus: getCashSessionTone(row.employee.cashSessionStatus).label,
    activeTables: row.employee.activeTables.length,
    closedTables: row.employee.closedTablesToday.length,
    revenue: row.employee.salesRevenue,
    profit: row.employee.salesProfit,
    currentCash: row.employee.cashCurrentAmount,
    expectedCash: row.employee.cashExpectedAmount,
  }))

  const summaryColumns: ColDef<(typeof summaryRows)[number]>[] = [
    { field: 'employeeName', headerName: 'Funcionário', flex: 1.25, minWidth: 180 },
    { field: 'employeeCode', headerName: 'ID', minWidth: 120 },
    { field: 'role', headerName: 'Perfil', minWidth: 120 },
    { field: 'cashStatus', headerName: 'Caixa', minWidth: 140 },
    { field: 'activeTables', headerName: 'Mesas abertas', minWidth: 130 },
    { field: 'closedTables', headerName: 'Mesas fechadas', minWidth: 140 },
    { field: 'revenue', headerName: 'Receita', minWidth: 130, valueFormatter: ({ value }) => formatMoney(Number(value ?? 0)) },
    { field: 'profit', headerName: 'Lucro', minWidth: 130, valueFormatter: ({ value }) => formatMoney(Number(value ?? 0)) },
    { field: 'currentCash', headerName: 'Caixa atual', minWidth: 140, valueFormatter: ({ value }) => formatMoney(Number(value ?? 0)) },
    { field: 'expectedCash', headerName: 'Caixa esperado', minWidth: 150, valueFormatter: ({ value }) => formatMoney(Number(value ?? 0)) },
  ]

  const tableColumns: ColDef<(typeof selectedRow.tables)[number]>[] = [
    { field: 'tableLabel', headerName: 'Mesa', minWidth: 110 },
    {
      field: 'status',
      headerName: 'Status',
      minWidth: 140,
      valueFormatter: ({ value }) => getComandaTone(value).label,
    },
    { field: 'itemsCount', headerName: 'Itens', minWidth: 100 },
    { field: 'subtotal', headerName: 'Subtotal', minWidth: 130, valueFormatter: ({ value }) => formatMoney(Number(value ?? 0)) },
    { field: 'discountAmount', headerName: 'Desconto', minWidth: 130, valueFormatter: ({ value }) => formatMoney(Number(value ?? 0)) },
    { field: 'totalAmount', headerName: 'Total', minWidth: 130, valueFormatter: ({ value }) => formatMoney(Number(value ?? 0)) },
    { field: 'openedAt', headerName: 'Abertura', minWidth: 120, valueFormatter: ({ value }) => formatShortTime(String(value ?? '')) },
  ]

  const movementColumns: ColDef<(typeof selectedRow.movements)[number]>[] = [
    { field: 'type', headerName: 'Tipo', minWidth: 140 },
    { field: 'reason', headerName: 'Motivo', flex: 1, minWidth: 180 },
    { field: 'amount', headerName: 'Valor', minWidth: 130, valueFormatter: ({ value }) => formatMoney(Number(value ?? 0)) },
    { field: 'createdAt', headerName: 'Hora', minWidth: 120, valueFormatter: ({ value }) => formatShortTime(String(value ?? '')) },
  ]

  const cashDelta = totals.cashCurrent - totals.cashExpected

  return (
    <section className="imperial-card p-6 md:p-7">
      <header className="flex flex-col gap-4 border-b border-white/6 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">Sprint operacional</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--text-soft)]">{description}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:w-[520px]">
          <MetricPill icon={UserRound} label="Funcionários" value={String(totals.employeeCount)} />
          <MetricPill icon={Table2} label="Mesas" value={String(totals.tableCount)} />
          <MetricPill icon={Banknote} label="Caixas abertos" value={String(totals.openCashSessions)} />
          <MetricPill icon={ShieldCheck} label="Delta" value={formatMoney(cashDelta)} />
        </div>
      </header>

      <div className="mt-5 grid gap-3 lg:grid-cols-4">
        <SummaryCard label="Receita" value={formatMoney(totals.salesRevenue)} hint="Faturamento operacional consolidado." />
        <SummaryCard label="Lucro" value={formatMoney(totals.salesProfit)} hint="Resultado bruto estimado do salão." />
        <SummaryCard label="Caixa esperado" value={formatMoney(totals.cashExpected)} hint="Baseado em abertura e movimentos." />
        <SummaryCard
          highlight={cashDelta >= 0 ? 'positive' : 'negative'}
          label="Caixa atual"
          value={formatMoney(totals.cashCurrent)}
          hint={cashDelta >= 0 ? 'Leitura acima do esperado.' : 'Leitura abaixo do esperado.'}
        />
      </div>

      {rows.length ? (
        <div className="mt-6 space-y-4">
          <section className="rounded-[28px] border border-white/6 bg-[rgba(255,255,255,0.02)] p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">AG Grid</p>
                <h3 className="mt-1 text-lg font-semibold text-white">Visão executiva por colaborador</h3>
              </div>
              <p className="text-xs text-[var(--text-soft)]">Clique em um funcionário para abrir mesas e movimentos da sessão.</p>
            </div>

            <div className="ag-theme-quartz rounded-[22px] border border-white/6" style={{ ...gridThemeStyle, height: 360 }}>
              <AgGridReact
                columnDefs={summaryColumns}
                domLayout="normal"
                onRowClicked={(event) => {
                  if (event.data) {
                    setSelectedEmployeeId(event.data.employeeId)
                  }
                }}
                rowData={summaryRows}
                rowSelection="single"
                suppressCellFocus
                theme="legacy"
              />
            </div>
          </section>

          {selectedRow ? (
            <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
              <div className="rounded-[28px] border border-white/6 bg-[rgba(255,255,255,0.02)] p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">Mesas do atendimento</p>
                    <h3 className="mt-1 text-lg font-semibold text-white">{selectedRow.employee.employeeName}</h3>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${getCashSessionTone(selectedRow.employee.cashSessionStatus).className}`}>
                    {getCashSessionTone(selectedRow.employee.cashSessionStatus).label}
                  </span>
                </div>

                <div className="ag-theme-quartz rounded-[22px] border border-white/6" style={{ ...gridThemeStyle, height: 320 }}>
                  <AgGridReact
                    columnDefs={tableColumns}
                    domLayout="normal"
                    rowData={selectedRow.tables}
                    suppressCellFocus
                    theme="legacy"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[28px] border border-white/6 bg-[rgba(255,255,255,0.02)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">Resumo da sessão</p>
                  <div className="mt-4 grid gap-3">
                    <SummaryBadge label="Abertura" value={formatMoney(selectedRow.employee.cashOpeningAmount)} />
                    <SummaryBadge label="Caixa atual" value={formatMoney(selectedRow.employee.cashCurrentAmount)} />
                    <SummaryBadge label="Caixa esperado" value={formatMoney(selectedRow.employee.cashExpectedAmount)} />
                    <SummaryBadge label="Diferença" value={formatMoney(selectedRow.employee.cashDifferenceAmount ?? 0)} />
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/6 bg-[rgba(255,255,255,0.02)] p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">Movimentos</p>
                      <h3 className="mt-1 text-lg font-semibold text-white">Últimos registros</h3>
                    </div>
                  </div>

                  <div className="ag-theme-quartz rounded-[22px] border border-white/6" style={{ ...gridThemeStyle, height: 260 }}>
                    <AgGridReact
                      columnDefs={movementColumns}
                      domLayout="normal"
                      rowData={selectedRow.movements}
                      suppressCellFocus
                      theme="legacy"
                    />
                  </div>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      ) : (
        <div className="mt-6 rounded-[28px] border border-dashed border-white/8 bg-[rgba(255,255,255,0.02)] px-6 py-12 text-center">
          <Layers3 className="mx-auto size-10 text-[var(--text-soft)]/70" />
          <p className="mt-4 text-sm font-medium text-white">Nenhum funcionário conectado ainda.</p>
          <p className="mt-2 text-sm text-[var(--text-soft)]">
            O grid executivo já está importado com AG Grid e entra em cena assim que o banco começar a publicar caixas e comandas.
          </p>
        </div>
      )}
    </section>
  )
}

function MetricPill({
  icon: Icon,
  label,
  value,
}: Readonly<{
  icon: LucideIcon
  label: string
  value: string
}>) {
  return (
    <div className="rounded-[18px] border border-white/6 bg-[rgba(255,255,255,0.02)] px-4 py-3">
      <Icon className="size-4 text-[var(--text-soft)]" />
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  hint,
  highlight = 'neutral',
}: Readonly<{
  label: string
  value: string
  hint: string
  highlight?: 'neutral' | 'positive' | 'negative'
}>) {
  const borderTone =
    highlight === 'positive'
      ? 'border-[rgba(52,242,127,0.14)] bg-[rgba(52,242,127,0.04)]'
      : highlight === 'negative'
        ? 'border-[rgba(248,113,113,0.14)] bg-[rgba(248,113,113,0.04)]'
        : 'border-white/6 bg-[rgba(255,255,255,0.02)]'

  return (
    <div className={`rounded-[24px] border px-4 py-4 ${borderTone}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">{label}</p>
      <p className="mt-3 text-xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-xs leading-6 text-[var(--text-soft)]">{hint}</p>
    </div>
  )
}

function SummaryBadge({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-[18px] border border-white/6 bg-[rgba(255,255,255,0.02)] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  )
}
