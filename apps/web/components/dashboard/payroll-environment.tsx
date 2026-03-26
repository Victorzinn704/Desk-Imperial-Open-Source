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
import type { EmployeeRecord } from '@/lib/api'
import { updateEmployee } from '@/lib/api'
import type { FinanceSummaryResponse } from '@contracts/contracts'
import { formatCurrency } from '@/lib/currency'
import { DashboardSectionHeading } from '@/components/dashboard/dashboard-section-heading'

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

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

  // Saved overrides — only updated on blur (after user finishes typing)
  const [savedOverrides, setSavedOverrides] = useState<
    Record<string, { salarioBase?: number; percentualVendas?: number }>
  >({})

  const currency = finance?.displayCurrency ?? 'BRL'
  const activeEmployees = employees.filter((e) => e.active)

  function getConfig(emp: EmployeeRecord) {
    const override = savedOverrides[emp.id] ?? {}
    return {
      salarioBase: override.salarioBase ?? emp.salarioBase ?? 0,
      percentualVendas: override.percentualVendas ?? emp.percentualVendas ?? 0,
    }
  }

  // Called on blur — persists to savedOverrides and fires API
  async function commitField(employeeId: string, field: 'salarioBase' | 'percentualVendas', value: number) {
    // Store the previous value so we can revert on error
    const prevOverrides = savedOverrides
    setSavedOverrides((prev) => ({ ...prev, [employeeId]: { ...prev[employeeId], [field]: value } }))
    try {
      await updateEmployee(employeeId, { [field]: value })
    } catch {
      // Revert on failure
      setSavedOverrides(prevOverrides)
    }
  }

  const rows = activeEmployees.map((emp) => {
    const config = getConfig(emp)
    const topEntry = finance?.topEmployees.find(
      (te) => te.employeeId === emp.id || te.employeeCode === emp.employeeCode,
    )
    const vendasDoMes = topEntry?.revenue ?? 0
    const comissao = (vendasDoMes * config.percentualVendas) / 100
    const totalAPagar = config.salarioBase + comissao
    return { emp, config, vendasDoMes, comissao, totalAPagar }
  })

  const folhaTotal = rows.reduce((sum, r) => sum + r.totalAPagar, 0)
  const totalComissoes = rows.reduce((sum, r) => sum + r.comissao, 0)
  const paidCount = rows.filter((r) => paidIds.has(r.emp.id)).length
  const maiorComissionado = rows.reduce(
    (best, r) => (r.comissao > (best?.comissao ?? -1) ? r : best),
    null as (typeof rows)[0] | null,
  )

  function prevMonth() {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear((y) => y - 1) }
    else setSelectedMonth((m) => m - 1)
  }
  function nextMonth() {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear((y) => y + 1) }
    else setSelectedMonth((m) => m + 1)
  }

  function togglePaid(id: string) {
    setPaidIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function markAllPaid() {
    setPaidIds(new Set(rows.map((r) => r.emp.id)))
  }

  function exportCsv() {
    const header = 'Nome,Código,Salário Base (R$),Vendas (R$),Comissão (R$),Total (R$),Status'
    const csvRows = rows.map((r) => [
      r.emp.displayName,
      r.emp.employeeCode,
      (r.config.salarioBase / 100).toFixed(2),
      (r.vendasDoMes / 100).toFixed(2),
      (r.comissao / 100).toFixed(2),
      (r.totalAPagar / 100).toFixed(2),
      paidIds.has(r.emp.id) ? 'Pago' : 'Pendente',
    ].join(','))
    const blob = new Blob([[header, ...csvRows].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `folha-${MONTHS[selectedMonth].toLowerCase()}-${selectedYear}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="space-y-6">
      <DashboardSectionHeading
        description="Gerencie salários, comissões e status de pagamento de toda a equipe. Configure individualmente e exporte a folha mensal."
        eyebrow="Gestão salarial"
        icon={Wallet}
        title="Folha de Pagamento"
      />

      {/* Period selector + actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            className="flex size-9 items-center justify-center rounded-[10px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-[var(--text-soft)] transition-colors hover:border-[rgba(255,255,255,0.14)] hover:text-white"
            type="button"
            onClick={prevMonth}
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="imperial-card-soft min-w-[160px] px-4 py-2 text-center">
            <p className="text-sm font-semibold text-white">{MONTHS[selectedMonth]} {selectedYear}</p>
          </div>
          <button
            className="flex size-9 items-center justify-center rounded-[10px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-[var(--text-soft)] transition-colors hover:border-[rgba(255,255,255,0.14)] hover:text-white"
            type="button"
            onClick={nextMonth}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-2 rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-2 text-sm font-medium text-[var(--text-soft)] transition-colors hover:border-[rgba(255,255,255,0.14)] hover:text-white"
            type="button"
            onClick={exportCsv}
          >
            <Download className="size-4" />
            Exportar CSV
          </button>
          <button
            className="flex items-center gap-2 rounded-[12px] border border-[rgba(52,242,127,0.3)] bg-[rgba(52,242,127,0.08)] px-4 py-2 text-sm font-semibold text-[#36f57c] transition-colors hover:bg-[rgba(52,242,127,0.14)]"
            type="button"
            onClick={markAllPaid}
          >
            <BadgeCheck className="size-4" />
            Marcar todos como pago
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="imperial-card-soft p-4">
          <div className="flex items-center gap-2">
            <DollarSign className="size-4 text-[#36f57c]" />
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">Folha total</p>
          </div>
          <p className="mt-2 text-xl font-bold text-white">{formatCurrency(folhaTotal, currency)}</p>
        </div>
        <div className="imperial-card-soft p-4">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-[#60a5fa]" />
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">Colaboradores</p>
          </div>
          <p className="mt-2 text-xl font-bold text-white">{activeEmployees.length}</p>
        </div>
        <div className="imperial-card-soft p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-[#fb923c]" />
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">Total comissões</p>
          </div>
          <p className="mt-2 text-xl font-bold text-[#fb923c]">{formatCurrency(totalComissoes, currency)}</p>
        </div>
        <div className="imperial-card-soft p-4">
          <div className="flex items-center gap-2">
            <BadgeCheck className="size-4 text-[#a78bfa]" />
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">Pagos</p>
          </div>
          <p className="mt-2 text-xl font-bold text-white">
            <span className="text-[#36f57c]">{paidCount}</span>
            <span className="mx-1 text-lg text-[var(--text-muted)]">/</span>
            {rows.length}
          </p>
        </div>
      </div>

      {/* Employee list */}
      <div className="imperial-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">Colaboradores — {MONTHS[selectedMonth]}</h3>
          {maiorComissionado && maiorComissionado.comissao > 0 && (
            <span className="rounded-full border border-[rgba(251,146,60,0.25)] bg-[rgba(251,146,60,0.08)] px-3 py-1 text-xs font-semibold text-[#fb923c]">
              Top: {maiorComissionado.emp.displayName.split(' ')[0]} · {formatCurrency(maiorComissionado.comissao, currency)}
            </span>
          )}
        </div>

        <div className="space-y-2">
          {activeEmployees.length === 0 && (
            <div className="imperial-card-soft border-dashed px-5 py-8 text-center">
              <p className="text-sm text-[var(--text-soft)]">
                Cadastre funcionários na seção Operação para configurar a folha.
              </p>
            </div>
          )}

          {rows.map(({ emp, config, vendasDoMes, comissao, totalAPagar }) => {
            const isOpen = expanded === emp.id
            const isPaid = paidIds.has(emp.id)
            return (
              <div key={emp.id} className="imperial-card-soft overflow-hidden">
                {/* Row header */}
                <div className="flex w-full items-center gap-3 px-4 py-4">
                  <button
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : emp.id)}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-[14px] border border-[rgba(52,242,127,0.16)] bg-[rgba(52,242,127,0.06)] text-xs font-bold text-[#36f57c]">
                      {emp.displayName.slice(0, 2).toUpperCase()}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold text-white">{emp.displayName}</p>
                        <span className="shrink-0 rounded-full border border-[rgba(52,242,127,0.2)] bg-[rgba(52,242,127,0.08)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#8fffb9]">
                          {emp.employeeCode}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm text-[var(--text-soft)]">
                        Base {formatCurrency(config.salarioBase, currency)} · {config.percentualVendas}% comissão
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-base font-bold text-[#36f57c]">{formatCurrency(totalAPagar, currency)}</p>
                      <p className="text-xs text-[var(--text-soft)]">a pagar</p>
                    </div>

                    {isOpen ? (
                      <ChevronUp className="size-4 shrink-0 text-[var(--text-soft)]" />
                    ) : (
                      <ChevronDown className="size-4 shrink-0 text-[var(--text-soft)]" />
                    )}
                  </button>

                  {/* Status toggle */}
                  <button
                    className={[
                      'shrink-0 rounded-[10px] border px-3 py-1.5 text-xs font-semibold transition-colors',
                      isPaid
                        ? 'border-[rgba(52,242,127,0.3)] bg-[rgba(52,242,127,0.1)] text-[#36f57c]'
                        : 'border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-[var(--text-soft)] hover:border-[rgba(52,242,127,0.2)] hover:text-[#8fffb9]',
                    ].join(' ')}
                    type="button"
                    onClick={() => togglePaid(emp.id)}
                  >
                    {isPaid ? 'Pago' : 'Pendente'}
                  </button>
                </div>

                {/* Expanded config — inputs are UNCONTROLLED (defaultValue + onBlur) */}
                {isOpen && (
                  <div className="border-t border-[rgba(255,255,255,0.05)] px-4 pb-4 pt-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="min-w-0">
                        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
                          <DollarSign className="size-3" />
                          Salário base (R$)
                        </label>
                        <input
                          key={`${emp.id}-salario-${config.salarioBase}`}
                          className="w-full min-w-0 rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-2.5 text-sm text-white outline-none focus:border-[rgba(52,242,127,0.3)]"
                          defaultValue={config.salarioBase / 100}
                          min="0"
                          step="10"
                          type="number"
                          onBlur={(e) =>
                            commitField(emp.id, 'salarioBase', Math.round(Number(e.target.value) * 100))
                          }
                        />
                      </div>

                      <div className="min-w-0">
                        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
                          <Percent className="size-3" />
                          % sobre vendas
                        </label>
                        <input
                          key={`${emp.id}-pct-${config.percentualVendas}`}
                          className="w-full min-w-0 rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-2.5 text-sm text-white outline-none focus:border-[rgba(52,242,127,0.3)]"
                          defaultValue={config.percentualVendas}
                          max="30"
                          min="0"
                          step="0.5"
                          type="number"
                          onBlur={(e) => commitField(emp.id, 'percentualVendas', Number(e.target.value))}
                        />
                        <p className="mt-1 text-[11px] text-[var(--text-soft)]">máx 30%</p>
                      </div>
                    </div>

                    {/* Calculation breakdown */}
                    <div className="mt-4 space-y-2 rounded-[12px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-3">
                      <div className="flex items-center justify-between gap-4 text-sm">
                        <span className="text-[var(--text-soft)]">Vendas no mês</span>
                        <span className="shrink-0 font-medium text-white">{formatCurrency(vendasDoMes, currency)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-sm">
                        <span className="text-[var(--text-soft)]">Comissão ({config.percentualVendas}%)</span>
                        <span className="shrink-0 font-medium text-[#fb923c]">{formatCurrency(comissao, currency)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-sm">
                        <span className="text-[var(--text-soft)]">Salário base</span>
                        <span className="shrink-0 font-medium text-white">{formatCurrency(config.salarioBase, currency)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 border-t border-[rgba(255,255,255,0.06)] pt-2 text-sm font-semibold">
                        <span className="text-white">Total a pagar</span>
                        <span className="shrink-0 text-[#36f57c]">{formatCurrency(totalAPagar, currency)}</span>
                      </div>
                    </div>

                    {vendasDoMes === 0 && config.percentualVendas > 0 && (
                      <div className="mt-3 flex items-center gap-2 rounded-[10px] border border-[rgba(251,146,60,0.2)] bg-[rgba(251,146,60,0.06)] px-3 py-2">
                        <BadgeCheck className="size-3.5 shrink-0 text-[#fb923c]" />
                        <p className="text-xs text-[#fb923c]">
                          Nenhuma venda atribuída a este funcionário ainda este mês.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
