'use client'

import { useState } from 'react'
import type { CSSProperties } from 'react'
import { AllCommunityModule, ModuleRegistry, type ColDef, type RowClickedEvent } from 'ag-grid-community'
import type { AgGridReactProps } from 'ag-grid-react'
import { LazyAgGrid as AgGridReact } from '@/components/shared/lazy-components'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import { ArrowUpRight, Banknote, Layers3, Receipt, ShieldCheck, Table2, UserRound, type LucideIcon } from 'lucide-react'
import type { OperationGridRow, OperationRole } from '@/lib/operations/operations-types'
import {
  formatLongDateTime,
  formatMoney,
  formatShortTime,
  getCashSessionTone,
  getComandaTone,
} from '@/lib/operations/operations-visuals'

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

type AgGridComponent = <TRowData extends object>(props: AgGridReactProps<TRowData>) => React.JSX.Element
const TypedAgGrid = AgGridReact as unknown as AgGridComponent

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
    : (rows[0]?.employee.employeeId ?? null)

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
  type SummaryRow = (typeof summaryRows)[number]

  const summaryColumns: ColDef<SummaryRow>[] = [
    { field: 'employeeName', headerName: 'Funcionário', flex: 1.25, minWidth: 180 },
    { field: 'employeeCode', headerName: 'ID', minWidth: 120 },
    { field: 'role', headerName: 'Perfil', minWidth: 120 },
    { field: 'cashStatus', headerName: 'Caixa', minWidth: 140 },
    { field: 'activeTables', headerName: 'Mesas abertas', minWidth: 130 },
    { field: 'closedTables', headerName: 'Mesas fechadas', minWidth: 140 },
    {
      field: 'revenue',
      headerName: 'Receita',
      minWidth: 130,
      valueFormatter: ({ value }) => formatMoney(Number(value ?? 0)),
    },
    {
      field: 'profit',
      headerName: 'Lucro',
      minWidth: 130,
      valueFormatter: ({ value }) => formatMoney(Number(value ?? 0)),
    },
    {
      field: 'currentCash',
      headerName: 'Caixa atual',
      minWidth: 140,
      valueFormatter: ({ value }) => formatMoney(Number(value ?? 0)),
    },
    {
      field: 'expectedCash',
      headerName: 'Caixa esperado',
      minWidth: 150,
      valueFormatter: ({ value }) => formatMoney(Number(value ?? 0)),
    },
  ]

  const cashDelta = totals.cashCurrent - totals.cashExpected
  const selectedOpenRevenue =
    selectedRow?.tables
      .filter((table) => table.status !== 'closed')
      .reduce((sum, table) => sum + table.totalAmount, 0) ?? 0
  const selectedTicket =
    selectedRow && selectedRow.tables.length > 0
      ? selectedRow.tables.reduce((sum, table) => sum + table.totalAmount, 0) / selectedRow.tables.length
      : 0
  const selectedMovements = selectedRow?.movements ?? []
  const selectedSupply = selectedMovements
    .filter((movement) => movement.type === 'supply')
    .reduce((sum, movement) => sum + movement.amount, 0)
  const selectedWithdrawal = selectedMovements
    .filter((movement) => movement.type === 'withdrawal')
    .reduce((sum, movement) => sum + movement.amount, 0)
  const selectedRegisters = selectedRow ? buildSelectedRegisters(selectedRow) : []

  return (
    <section className="imperial-card p-6 md:p-7">
      <header className="flex flex-col gap-4 border-b border-white/6 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
            Sprint operacional
          </p>
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
        <SummaryCard
          label="Receita"
          value={formatMoney(totals.salesRevenue)}
          hint="Faturamento operacional consolidado."
        />
        <SummaryCard label="Lucro" value={formatMoney(totals.salesProfit)} hint="Resultado bruto estimado do salão." />
        <SummaryCard
          label="Caixa esperado"
          value={formatMoney(totals.cashExpected)}
          hint="Baseado em abertura e movimentos."
        />
        <SummaryCard
          highlight={cashDelta >= 0 ? 'positive' : 'negative'}
          label="Caixa atual"
          value={formatMoney(totals.cashCurrent)}
          hint={cashDelta >= 0 ? 'Leitura acima do esperado.' : 'Leitura abaixo do esperado.'}
        />
      </div>

      {rows.length ? (
        <div className="mt-6 space-y-4">
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_360px]">
            <div className="rounded-[28px] border border-white/6 bg-[rgba(255,255,255,0.02)] p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                    Radar da equipe
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-white">Visão executiva por colaborador</h3>
                </div>
                <p className="text-xs text-[var(--text-soft)]">
                  Clique em um colaborador para abrir o detalhe vivo de mesas, caixa e registros do turno.
                </p>
              </div>

              <div
                className="ag-theme-quartz rounded-[22px] border border-white/6"
                style={{ ...gridThemeStyle, height: 360 }}
              >
                <TypedAgGrid<SummaryRow>
                  columnDefs={summaryColumns}
                  domLayout="normal"
                  onRowClicked={(event: RowClickedEvent<SummaryRow>) => {
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
            </div>

            {selectedRow ? (
              <aside className="rounded-[28px] border border-white/6 bg-[rgba(255,255,255,0.02)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                  Colaborador em foco
                </p>
                <div className="mt-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold text-white">{selectedRow.employee.employeeName}</h3>
                    <p className="mt-1 text-sm text-[var(--text-soft)]">
                      {formatRole(selectedRow.employee.role)} · código {selectedRow.employee.employeeCode}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${getCashSessionTone(selectedRow.employee.cashSessionStatus).className}`}
                  >
                    {getCashSessionTone(selectedRow.employee.cashSessionStatus).label}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <SummaryBadge label="Mesas em giro" value={String(selectedRow.employee.activeTables.length)} />
                  <SummaryBadge label="Fechadas hoje" value={String(selectedRow.employee.closedTablesToday.length)} />
                  <SummaryBadge label="Receita em aberto" value={formatMoney(selectedOpenRevenue)} />
                  <SummaryBadge label="Ticket do turno" value={formatMoney(selectedTicket)} />
                </div>

                <div className="mt-4 rounded-[22px] border border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.18)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                    Leitura de caixa
                  </p>
                  <div className="mt-3 space-y-3">
                    <SessionReadoutRow label="Abertura" value={formatMoney(selectedRow.employee.cashOpeningAmount)} />
                    <SessionReadoutRow label="Esperado" value={formatMoney(selectedRow.employee.cashExpectedAmount)} />
                    <SessionReadoutRow
                      label="Lido / atual"
                      value={formatMoney(selectedRow.employee.cashCurrentAmount)}
                    />
                    <SessionReadoutRow
                      emphasis={(selectedRow.employee.cashDifferenceAmount ?? 0) >= 0 ? 'positive' : 'negative'}
                      label="Diferença"
                      value={formatMoney(selectedRow.employee.cashDifferenceAmount ?? 0)}
                    />
                  </div>
                </div>
              </aside>
            ) : null}
          </section>

          {selectedRow ? (
            <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.95fr)]">
              <div className="rounded-[28px] border border-white/6 bg-[rgba(255,255,255,0.02)] p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                      Mesas do atendimento
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-white">{selectedRow.employee.employeeName}</h3>
                    <p className="mt-2 text-sm text-[var(--text-soft)]">
                      Cada linha mostra o estado da mesa, o peso do atendimento e a última leitura útil do turno.
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${getCashSessionTone(selectedRow.employee.cashSessionStatus).className}`}
                  >
                    {getCashSessionTone(selectedRow.employee.cashSessionStatus).label}
                  </span>
                </div>

                <div className="space-y-3">
                  {selectedRow.tables.length ? (
                    selectedRow.tables
                      .slice()
                      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
                      .map((table) => (
                        <article
                          className="rounded-[22px] border border-white/6 bg-[rgba(0,0,0,0.18)] px-4 py-4"
                          key={table.comandaId}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-base font-semibold text-white">Mesa {table.tableLabel}</p>
                                <span
                                  className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${getComandaTone(table.status).className}`}
                                >
                                  {getComandaTone(table.status).label}
                                </span>
                              </div>
                              <p className="mt-2 text-xs text-[var(--text-soft)]">
                                Aberta às {formatShortTime(table.openedAt)} · última mudança às{' '}
                                {formatShortTime(table.updatedAt)}
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                                Total
                              </p>
                              <p className="mt-1 text-lg font-semibold text-white">{formatMoney(table.totalAmount)}</p>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-3">
                            <SummaryBadge label="Itens" value={String(table.itemsCount)} />
                            <SummaryBadge label="Subtotal" value={formatMoney(table.subtotal)} />
                            <SummaryBadge label="Desconto" value={formatMoney(table.discountAmount)} />
                          </div>

                          {table.notes ? (
                            <div className="mt-4 rounded-[16px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-3 py-3 text-sm text-[var(--text-soft)]">
                              {table.notes}
                            </div>
                          ) : null}
                        </article>
                      ))
                  ) : (
                    <EmptyPanelState
                      body="Quando o colaborador assumir mesas, elas aparecem aqui com status, abertura, valor e leitura rápida."
                      title="Nenhuma mesa ativa neste turno"
                    />
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[28px] border border-white/6 bg-[rgba(255,255,255,0.02)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                    Movimentos do caixa
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-white">Movimentos</h3>
                  <p className="mt-2 text-sm text-[var(--text-soft)]">
                    Sangrias, suprimentos e ajustes do turno atual concentrados em uma leitura executiva.
                  </p>

                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <SummaryBadge label="Entradas" value={formatMoney(selectedSupply)} />
                    <SummaryBadge label="Saídas" value={formatMoney(selectedWithdrawal)} />
                    <SummaryBadge label="Lançamentos" value={String(selectedMovements.length)} />
                  </div>

                  <div className="mt-4 space-y-2">
                    {selectedMovements.length ? (
                      selectedMovements
                        .slice()
                        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
                        .slice(0, 4)
                        .map((movement) => (
                          <div
                            className="flex items-center justify-between gap-3 rounded-[16px] border border-white/6 bg-[rgba(0,0,0,0.18)] px-3 py-3"
                            key={movement.id}
                          >
                            <div>
                              <p className="text-sm font-semibold text-white">
                                {formatMovementTypeLabel(movement.type)}
                              </p>
                              <p className="mt-1 text-xs text-[var(--text-soft)]">
                                {movement.reason} · {formatLongDateTime(movement.createdAt)}
                              </p>
                            </div>
                            <span className="text-sm font-semibold text-white">{formatMoney(movement.amount)}</span>
                          </div>
                        ))
                    ) : (
                      <EmptyPanelState
                        body="Quando houver abertura, suprimento, sangria ou ajuste, os lançamentos aparecem aqui."
                        title="Sem movimentos lançados"
                      />
                    )}
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/6 bg-[rgba(255,255,255,0.02)] p-4">
                  <div className="mb-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                      Pulso recente
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-white">Últimos registros</h3>
                    <p className="mt-2 text-sm text-[var(--text-soft)]">
                      Trilha manual do que aconteceu por último com mesas e caixa do colaborador selecionado.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {selectedRegisters.length ? (
                      selectedRegisters.slice(0, 6).map((register) => (
                        <div
                          className="flex items-start gap-3 rounded-[18px] border border-white/6 bg-[rgba(0,0,0,0.18)] px-3 py-3"
                          key={register.id}
                        >
                          <div
                            className={`mt-1 flex size-8 shrink-0 items-center justify-center rounded-full border ${register.badgeClassName}`}
                          >
                            <register.icon className="size-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-white">{register.title}</p>
                              <span className="text-[11px] text-[var(--text-soft)]">
                                {formatLongDateTime(register.happenedAt)}
                              </span>
                            </div>
                            <p className="mt-1 text-xs leading-6 text-[var(--text-soft)]">{register.subtitle}</p>
                          </div>
                          {register.amount ? (
                            <span className="text-xs font-semibold text-white">{formatMoney(register.amount)}</span>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <EmptyPanelState
                        body="Assim que mesas mudarem de estado ou o caixa registrar movimentos, este pulso ganha vida."
                        title="Nada novo para mostrar"
                      />
                    )}
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
            O grid executivo já está importado com AG Grid e entra em cena assim que o banco começar a publicar caixas e
            comandas.
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

function SessionReadoutRow({
  label,
  value,
  emphasis = 'neutral',
}: Readonly<{
  label: string
  value: string
  emphasis?: 'neutral' | 'positive' | 'negative'
}>) {
  const valueClassName =
    emphasis === 'positive' ? 'text-[#8fffb9]' : emphasis === 'negative' ? 'text-[#fca5a5]' : 'text-white'

  return (
    <div className="flex items-center justify-between gap-3 rounded-[16px] border border-white/6 bg-[rgba(255,255,255,0.02)] px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">{label}</p>
      <p className={`text-sm font-semibold ${valueClassName}`}>{value}</p>
    </div>
  )
}

function EmptyPanelState({ title, body }: Readonly<{ title: string; body: string }>) {
  return (
    <div className="rounded-[20px] border border-dashed border-white/8 px-4 py-8 text-center">
      <p className="text-sm font-medium text-white">{title}</p>
      <p className="mt-2 text-sm text-[var(--text-soft)]">{body}</p>
    </div>
  )
}

function formatRole(role: OperationRole) {
  if (role === 'OWNER') return 'Dono'
  if (role === 'MANAGER') return 'Gerência'
  if (role === 'CASHIER') return 'Caixa'
  return 'Atendimento'
}

function formatMovementTypeLabel(type: OperationGridRow['movements'][number]['type']) {
  if (type === 'opening') return 'Abertura de caixa'
  if (type === 'supply') return 'Suprimento de caixa'
  if (type === 'withdrawal') return 'Sangria / retirada'
  if (type === 'sale') return 'Venda registrada'
  if (type === 'refund') return 'Estorno operacional'
  return 'Ajuste manual'
}

function buildSelectedRegisters(row: OperationGridRow) {
  const tableRegisters = row.tables.map((table) => ({
    id: `table-${table.comandaId}`,
    happenedAt: table.updatedAt,
    title: `Mesa ${table.tableLabel} · ${getComandaTone(table.status).label}`,
    subtitle: `${table.itemsCount} item(ns) · total ${formatMoney(table.totalAmount)}`,
    badgeClassName: getComandaTone(table.status).className,
    icon: Receipt,
    amount: table.totalAmount,
  }))

  const movementRegisters = row.movements.map((movement) => ({
    id: `movement-${movement.id}`,
    happenedAt: movement.createdAt,
    title: formatMovementTypeLabel(movement.type),
    subtitle: movement.reason,
    badgeClassName:
      movement.type === 'withdrawal'
        ? 'border-[rgba(248,113,113,0.18)] bg-[rgba(248,113,113,0.08)] text-[#fca5a5]'
        : movement.type === 'supply'
          ? 'border-[rgba(52,242,127,0.18)] bg-[rgba(52,242,127,0.08)] text-[#8fffb9]'
          : 'border-[rgba(96,165,250,0.18)] bg-[rgba(96,165,250,0.08)] text-[#93c5fd]',
    icon: movement.type === 'withdrawal' ? ArrowUpRight : Banknote,
    amount: movement.amount,
  }))

  return [...tableRegisters, ...movementRegisters].sort(
    (left, right) => new Date(right.happenedAt).getTime() - new Date(left.happenedAt).getTime(),
  )
}
