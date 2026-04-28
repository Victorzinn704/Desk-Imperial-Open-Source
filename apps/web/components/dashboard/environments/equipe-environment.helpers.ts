import type { FinanceSummaryResponse } from '@contracts/contracts'
import type { DashboardTabId } from '@/components/dashboard/dashboard-navigation'
import type { EmployeeRecord } from '@/lib/api'
import type { EquipeCurrency, EquipeRow, EquipeView } from './equipe-environment.types'

export const equipeViewCopy: Record<EquipeView, { eyebrow: string; title: string; description: string }> = {
  cards: {
    eyebrow: 'Equipe ativa',
    title: 'Equipe e desempenho',
    description: 'Equipe, receita, folha e acesso.',
  },
  folha: {
    eyebrow: 'Gestao salarial',
    title: 'Folha da equipe',
    description: 'Salários, comissões e fechamento.',
  },
  perfil: {
    eyebrow: 'Perfil individual',
    title: 'Leitura por colaborador',
    description: 'Resultado e acesso por pessoa.',
  },
}

export function resolveEquipeView(activeTab: DashboardTabId | null): EquipeView {
  if (activeTab === 'folha') {
    return 'folha'
  }
  if (activeTab === 'perfil') {
    return 'perfil'
  }
  return 'cards'
}

export function buildEquipeRows(
  employees: EmployeeRecord[],
  finance?: Pick<FinanceSummaryResponse, 'topEmployees'>,
): EquipeRow[] {
  return employees.map((employee) => {
    const financeRow = finance?.topEmployees.find(
      (row) => row.employeeId === employee.id || row.employeeCode === employee.employeeCode,
    )
    const baseSalary = employee.salarioBase / 100
    const revenue = financeRow?.revenue ?? 0
    const commission = (revenue * employee.percentualVendas) / 100

    return {
      employee,
      averageTicket: financeRow?.averageTicket ?? 0,
      baseSalary,
      commission,
      orders: financeRow?.orders ?? 0,
      payout: baseSalary + commission,
      profit: financeRow?.profit ?? 0,
      revenue,
    }
  })
}

export function resolveHighlightedRow(rows: EquipeRow[]) {
  if (rows.length === 0) {
    return null
  }
  return [...rows].sort((left, right) => right.revenue - left.revenue || right.orders - left.orders)[0] ?? rows[0]
}

export function toneLabel(tone: 'info' | 'success' | 'warning' | 'danger' | 'neutral') {
  switch (tone) {
    case 'success':
      return 'saudavel'
    case 'warning':
      return 'monitorar'
    case 'danger':
      return 'atencao'
    case 'neutral':
      return 'base'
    case 'info':
    default:
      return 'foco'
  }
}

export function buildEquipeMetaItems({
  averageTicket,
  currency,
  highlightedRow,
  rows,
  totalCommission,
}: Readonly<{
  averageTicket: number
  currency: EquipeCurrency
  highlightedRow: EquipeRow | null
  rows: EquipeRow[]
  totalCommission: number
}>) {
  const noRevenue = rows.filter((row) => row.revenue <= 0).length
  return [
    {
      label: 'ticket médio',
      tone: averageTicket > 0 ? ('info' as const) : ('neutral' as const),
      value: averageTicket > 0 ? averageTicket : null,
    },
    {
      label: 'comissão',
      tone: totalCommission > 0 ? ('success' as const) : ('neutral' as const),
      value: totalCommission,
    },
    {
      label: 'sem receita',
      tone: noRevenue > 0 ? ('warning' as const) : ('success' as const),
      value: String(noRevenue),
    },
    {
      label: 'destaque',
      tone: highlightedRow?.revenue ? ('success' as const) : ('neutral' as const),
      value: highlightedRow?.employee.displayName ?? 'sem leitura',
    },
  ].map((item) => ({
    ...item,
    value:
      typeof item.value === 'number'
        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(item.value)
        : item.value,
  }))
}
