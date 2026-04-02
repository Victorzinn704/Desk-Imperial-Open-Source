'use client'

import { Award, BadgeDollarSign, Target, Trophy, UserRoundCog, type LucideIcon } from 'lucide-react'
import type { FinanceSummaryResponse } from '@contracts/contracts'
import { CardRowSkeleton } from '@/components/shared/skeleton'
import { formatCurrency } from '@/lib/currency'

export function EmployeeRankingCard({
  finance,
  isLoading = false,
  error = null,
}: Readonly<{
  finance?: FinanceSummaryResponse
  isLoading?: boolean
  error?: string | null
}>) {
  const displayCurrency = finance?.displayCurrency ?? 'BRL'
  const topEmployees = finance?.topEmployees ?? []
  const bestRevenue = topEmployees[0]?.revenue ?? 0

  return (
    <article className="imperial-card p-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--success)]">
            Performance comercial
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Ranking de rendimento por funcionario</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-soft)]">
            O painel cruza receita, lucro e ticket medio com base no vendedor vinculado em cada pedido.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <TopMetric icon={UserRoundCog} label="Funcionarios no ranking" value={String(topEmployees.length)} />
          <TopMetric
            icon={BadgeDollarSign}
            label="Receita da equipe"
            value={formatCurrency(
              topEmployees.reduce((total, employee) => total + employee.revenue, 0),
              displayCurrency,
            )}
          />
          <TopMetric
            icon={Target}
            label="Lucro atribuido"
            value={formatCurrency(
              topEmployees.reduce((total, employee) => total + employee.profit, 0),
              displayCurrency,
            )}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6">
          <CardRowSkeleton rows={5} />
        </div>
      ) : error ? (
        <div className="mt-6 rounded-[28px] border border-[rgba(245,132,132,0.24)] bg-[rgba(245,132,132,0.08)] px-5 py-6 text-sm text-[var(--danger)]">
          {error}
        </div>
      ) : topEmployees.length ? (
        <div className="mt-6 space-y-3">
          {topEmployees.map((employee, index) => {
            const width = bestRevenue > 0 ? Math.max(14, (employee.revenue / bestRevenue) * 100) : 14

            return (
              <div
                className="imperial-card-soft p-4"
                key={employee.employeeId ?? employee.employeeCode ?? `${employee.employeeName}-${index}`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="flex size-10 items-center justify-center rounded-2xl border border-[rgba(99,147,113,0.2)] bg-[rgba(99,147,113,0.08)] text-[var(--success)]">
                        {index === 0 ? <Trophy className="size-4" /> : <Award className="size-4" />}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">{employee.employeeName}</p>
                        <p className="mt-1 text-sm text-[var(--text-soft)]">
                          {employee.employeeCode ? `ID ${employee.employeeCode}` : 'Venda sem snapshot de ID'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 h-2.5 rounded-full bg-[rgba(255,255,255,0.06)]">
                      <div
                        className="h-full rounded-full bg-[var(--success)] shadow-[0_0_8px_rgba(99,147,113,0.12)]"
                        style={{ width: `${Math.min(100, width)}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[430px]">
                    <EmployeeStat label="Receita" value={formatCurrency(employee.revenue, displayCurrency)} />
                    <EmployeeStat label="Lucro" value={formatCurrency(employee.profit, displayCurrency)} />
                    <EmployeeStat
                      label="Ticket medio"
                      value={formatCurrency(employee.averageTicket, displayCurrency)}
                    />
                  </div>
                </div>

                <p className="mt-4 text-sm text-[var(--text-soft)]">
                  {employee.orders} venda(s) vinculada(s) a este funcionario.
                </p>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="imperial-card-soft mt-6 border-dashed px-5 py-14 text-center">
          <p className="text-sm leading-7 text-[var(--text-soft)]">
            Vincule vendas a funcionarios para liberar o ranking executivo de rendimento.
          </p>
        </div>
      )}
    </article>
  )
}

function TopMetric({
  icon: Icon,
  label,
  value,
}: Readonly<{
  icon: LucideIcon
  label: string
  value: string
}>) {
  return (
    <div className="imperial-card-stat p-4">
      <span className="flex size-10 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[rgba(143,183,255,0.08)] text-[var(--info)]">
        <Icon className="size-4" />
      </span>
      <p className="mt-4 text-sm text-[var(--text-soft)]">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  )
}

function EmployeeStat({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="imperial-card-stat px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  )
}
