'use client'

import { useState } from 'react'
import { BadgeCheck, ChevronDown, ChevronUp, DollarSign, Percent, TrendingUp, Users, Wallet } from 'lucide-react'
import type { EmployeeRecord } from '@/lib/api'
import type { FinanceSummaryResponse } from '@contracts/contracts'
import { formatCurrency } from '@/lib/currency'

type SalaryConfig = {
  salarioBase: number
  percentualVendas: number
}

type PayrollMap = Record<string, SalaryConfig>

const STORAGE_KEY = 'desk_imperial_payroll'

function loadPayroll(): PayrollMap {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function savePayroll(map: PayrollMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

export function EmployeePayrollCard({
  employees,
  finance,
}: Readonly<{
  employees: EmployeeRecord[]
  finance?: FinanceSummaryResponse
}>) {
  const [payroll, setPayroll] = useState<PayrollMap>(() => {
    if (typeof window === 'undefined') {
      return {}
    }

    return loadPayroll()
  })
  const [expanded, setExpanded] = useState<string | null>(null)

  function updateConfig(employeeId: string, field: keyof SalaryConfig, value: number) {
    setPayroll((prev) => {
      const next = {
        ...prev,
        [employeeId]: {
          salarioBase: prev[employeeId]?.salarioBase ?? 0,
          percentualVendas: prev[employeeId]?.percentualVendas ?? 0,
          [field]: value,
        },
      }
      savePayroll(next)
      return next
    })
  }

  const currency = finance?.displayCurrency ?? 'BRL'
  const activeEmployees = employees.filter((e) => e.active)

  const rows = activeEmployees.map((emp) => {
    const config = payroll[emp.id] ?? { salarioBase: 0, percentualVendas: 0 }
    const topEntry = finance?.topEmployees.find(
      (te) => te.employeeId === emp.id || te.employeeCode === emp.employeeCode,
    )
    const vendasDoMes = topEntry?.revenue ?? 0
    const comissao = (vendasDoMes * config.percentualVendas) / 100
    const totalAPagar = config.salarioBase + comissao
    return { emp, config, vendasDoMes, comissao, totalAPagar }
  })

  const folhaTotal = rows.reduce((sum, r) => sum + r.totalAPagar, 0)
  const maiorComissionado = rows.reduce(
    (best, r) => (r.comissao > (best?.comissao ?? -1) ? r : best),
    null as (typeof rows)[0] | null,
  )

  return (
    <article className="imperial-card p-7">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl border border-[rgba(52,242,127,0.2)] bg-[rgba(52,242,127,0.08)] text-[#36f57c]">
          <Wallet className="size-5" />
        </span>
        <div>
          <p className="text-sm text-[var(--text-soft)]">Gestão salarial</p>
          <h2 className="text-xl font-semibold text-white">Folha de Pagamento</h2>
        </div>
      </div>

      {/* KPI row */}
      <div className="mt-6 grid grid-cols-3 gap-3">
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
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">Top comissão</p>
          </div>
          <p className="mt-2 truncate text-sm font-bold text-white">
            {maiorComissionado && maiorComissionado.comissao > 0
              ? maiorComissionado.emp.displayName.split(' ')[0]
              : '—'}
          </p>
        </div>
      </div>

      {/* Employee list */}
      <div className="mt-6 space-y-2">
        {activeEmployees.length === 0 && (
          <div className="imperial-card-soft border-dashed px-5 py-8 text-center">
            <p className="text-sm text-[var(--text-soft)]">
              Cadastre funcionários na seção acima para configurar a folha.
            </p>
          </div>
        )}

        {rows.map(({ emp, config, vendasDoMes, comissao, totalAPagar }) => {
          const isOpen = expanded === emp.id
          return (
            <div key={emp.id} className="imperial-card-soft overflow-hidden">
              {/* Row header — always visible */}
              <button
                className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-[rgba(255,255,255,0.02)]"
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

              {/* Expanded config */}
              {isOpen && (
                <div className="border-t border-[rgba(255,255,255,0.05)] px-4 pb-4 pt-4">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Salary base */}
                    <div>
                      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
                        <DollarSign className="size-3" />
                        Salário base (R$)
                      </label>
                      <input
                        className="w-full rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-2.5 text-sm text-white outline-none focus:border-[rgba(52,242,127,0.3)]"
                        min="0"
                        step="1"
                        type="number"
                        value={config.salarioBase}
                        onChange={(e) => updateConfig(emp.id, 'salarioBase', Number(e.target.value))}
                      />
                      <p className="mt-1 text-[11px] text-[var(--text-soft)]">valor em reais (R$)</p>
                    </div>

                    {/* Commission % */}
                    <div>
                      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">
                        <Percent className="size-3" />
                        % sobre vendas
                      </label>
                      <input
                        className="w-full rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-2.5 text-sm text-white outline-none focus:border-[rgba(52,242,127,0.3)]"
                        max="30"
                        min="0"
                        step="0.5"
                        type="number"
                        value={config.percentualVendas}
                        onChange={(e) => updateConfig(emp.id, 'percentualVendas', Number(e.target.value))}
                      />
                      <p className="mt-1 text-[11px] text-[var(--text-soft)]">máx 30%</p>
                    </div>
                  </div>

                  {/* Calculation breakdown */}
                  <div className="mt-4 rounded-[12px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--text-soft)]">Vendas atribuídas no mês</span>
                      <span className="font-medium text-white">{formatCurrency(vendasDoMes, currency)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--text-soft)]">Comissão ({config.percentualVendas}%)</span>
                      <span className="font-medium text-[#fb923c]">{formatCurrency(comissao, currency)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--text-soft)]">Salário base</span>
                      <span className="font-medium text-white">{formatCurrency(config.salarioBase, currency)}</span>
                    </div>
                    <div className="flex justify-between border-t border-[rgba(255,255,255,0.06)] pt-2 text-sm font-semibold">
                      <span className="text-white">Total a pagar</span>
                      <span className="text-[#36f57c]">{formatCurrency(totalAPagar, currency)}</span>
                    </div>
                  </div>

                  {vendasDoMes === 0 && config.percentualVendas > 0 && (
                    <div className="mt-3 flex items-center gap-2 rounded-[10px] border border-[rgba(251,146,60,0.2)] bg-[rgba(251,146,60,0.06)] px-3 py-2">
                      <BadgeCheck className="size-3.5 text-[#fb923c]" />
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
    </article>
  )
}
