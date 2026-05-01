import type { EmployeeRecord } from '@/lib/api'
import { buildEquipeRows, resolveHighlightedRow } from './equipe-environment.helpers'
import type { EquipeRow, EquipeSummary } from './equipe-environment.types'

function sumRows(rows: EquipeRow[], pick: (row: EquipeRow) => number) {
  return rows.reduce((sum, row) => sum + pick(row), 0)
}

export function buildEquipeSummary(employees: EmployeeRecord[], finance: EquipeSummary['finance']) {
  const rows = buildEquipeRows(employees, finance)
  const activeRows = rows.filter((row) => row.employee.active)
  const highlightedRow = resolveHighlightedRow(activeRows)
  const totalRevenue = sumRows(activeRows, (row) => row.revenue)
  const totalOrders = sumRows(activeRows, (row) => row.orders)
  const totalPayout = sumRows(activeRows, (row) => row.payout)
  const totalCommission = sumRows(activeRows, (row) => row.commission)

  return {
    activeRows,
    averageTicket: totalOrders > 0 ? totalRevenue / Math.max(1, totalOrders) : 0,
    highlightedRow,
    totalCommission,
    totalPayout,
    totalRevenue,
  }
}
