export type OperationRole = 'OWNER' | 'MANAGER' | 'CASHIER' | 'STAFF'

export type OperationCashMovementType = 'opening' | 'supply' | 'withdrawal' | 'sale' | 'refund' | 'adjustment'

export type OperationComandaStatus = 'open' | 'in_preparation' | 'ready' | 'closed'

export type OperationCashSessionStatus = 'open' | 'closing' | 'closed'

export type OperationEmployeeSummary = {
  employeeId: string
  employeeCode: string
  employeeName: string
  role: OperationRole
  activeTables: string[]
  closedTablesToday: string[]
  openOrdersCount: number
  closedOrdersCount: number
  cashSessionStatus: OperationCashSessionStatus
  cashOpeningAmount: number
  cashCurrentAmount: number
  cashExpectedAmount: number
  cashCountedAmount?: number
  cashDifferenceAmount?: number
  salesRevenue: number
  salesProfit: number
}

export type OperationTableRecord = {
  tableLabel: string
  comandaId: string
  employeeId: string
  employeeName: string
  status: OperationComandaStatus
  openedAt: string
  updatedAt: string
  subtotal: number
  discountAmount: number
  totalAmount: number
  itemsCount: number
  notes?: string | null
}

export type OperationCashMovement = {
  id: string
  employeeId: string
  type: OperationCashMovementType
  amount: number
  reason: string
  createdAt: string
}

export type OperationTimelineItem = {
  id: string
  resourceId: string
  title: string
  start: string
  end: string
  status: OperationComandaStatus
  tableLabel: string
  employeeName: string
  amount: number
}

export type OperationTimelineResource = {
  id: string
  title: string
  subtitle?: string
  status: OperationCashSessionStatus
}

export type OperationGridRow = {
  employee: OperationEmployeeSummary
  tables: OperationTableRecord[]
  movements: OperationCashMovement[]
}
