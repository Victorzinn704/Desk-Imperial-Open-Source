import type { FinanceSummaryResponse } from '@contracts/contracts'
import type { DashboardTabId } from '@/components/dashboard/dashboard-navigation'
import type { EmployeeRecord } from '@/lib/api'

export type EquipeView = 'cards' | 'folha' | 'perfil'
export type EquipeSurface = 'legacy' | 'lab'
export type EquipeCurrency = FinanceSummaryResponse['displayCurrency'] | 'BRL'

export type EquipeEnvironmentProps = {
  activeTab: DashboardTabId | null
  employees: EmployeeRecord[]
  finance?: FinanceSummaryResponse
  surface?: EquipeSurface
  userRole?: 'OWNER' | 'STAFF'
}

export type EquipeSummary = {
  activeRows: EquipeRow[]
  averageTicket: number
  finance?: FinanceSummaryResponse
  highlightedRow: EquipeRow | null
  totalCommission: number
  totalPayout: number
  totalRevenue: number
}

export type EquipeRow = {
  employee: EmployeeRecord
  baseSalary: number
  commission: number
  payout: number
  revenue: number
  orders: number
  averageTicket: number
  profit: number
}
