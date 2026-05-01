import type { FinanceSummaryResponse } from '@contracts/contracts'
import type { EmployeeRecord } from '@/lib/api'
import type { PayrollRow } from './payroll-types'

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

export function formatPayrollMonth(selectedMonth: number, selectedYear: number) {
  return `${MONTHS[selectedMonth]} ${selectedYear}`
}

export function buildPayrollRows(
  employees: EmployeeRecord[],
  finance: FinanceSummaryResponse | undefined,
  savedOverrides: Record<string, { salarioBase?: number; percentualVendas?: number }>,
): PayrollRow[] {
  return employees
    .filter((employee) => employee.active)
    .map((emp) => {
      const config = getConfig(emp, savedOverrides)
      const salarioBaseReais = config.salarioBase / 100
      const topEntry = finance?.topEmployees.find(
        (employee) => employee.employeeId === emp.id || employee.employeeCode === emp.employeeCode,
      )
      const vendasDoMes = topEntry?.revenue ?? 0
      const comissao = (vendasDoMes * config.percentualVendas) / 100

      return {
        emp,
        config,
        salarioBaseReais,
        vendasDoMes,
        comissao,
        totalAPagar: salarioBaseReais + comissao,
      }
    })
}

export function buildPayrollTotals(rows: PayrollRow[], paidIds: Set<string>) {
  const folhaTotal = rows.reduce((sum, row) => sum + row.totalAPagar, 0)
  const totalComissoes = rows.reduce((sum, row) => sum + row.comissao, 0)
  const totalBase = rows.reduce((sum, row) => sum + row.salarioBaseReais, 0)
  const paidCount = rows.filter((row) => paidIds.has(row.emp.id)).length
  const paidTotal = rows.filter((row) => paidIds.has(row.emp.id)).reduce((sum, row) => sum + row.totalAPagar, 0)

  return {
    averagePayout: rows.length > 0 ? folhaTotal / rows.length : 0,
    commissionShare: folhaTotal > 0 ? (totalComissoes / folhaTotal) * 100 : 0,
    folhaTotal,
    noSalesCount: rows.filter((row) => row.vendasDoMes <= 0).length,
    paidCount,
    paidTotal,
    pendingCount: Math.max(rows.length - paidCount, 0),
    totalBase,
    totalComissoes,
  }
}

export function downloadPayrollCsv(
  rows: PayrollRow[],
  paidIds: Set<string>,
  selectedMonth: number,
  selectedYear: number,
) {
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

export function findTopCommissionedEmployee(rows: PayrollRow[]) {
  return rows.reduce((best, row) => (row.comissao > (best?.comissao ?? -1) ? row : best), null as PayrollRow | null)
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
