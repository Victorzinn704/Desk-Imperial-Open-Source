import type { OperationsLiveResponse } from '@contracts/contracts'
import type {
  OperationCashMovement,
  OperationCashMovementType,
  OperationCashSessionStatus,
  OperationComandaStatus,
  OperationGridRow,
  OperationTimelineItem,
  OperationTimelineResource,
} from './operations-types'

type OperationGroup = OperationsLiveResponse['employees'][number]

type OperationsViewModel = {
  rows: OperationGridRow[]
  resources: OperationTimelineResource[]
  timelineItems: OperationTimelineItem[]
}

const UNASSIGNED_EMPLOYEE_ID = 'unassigned'
const OWNER_EMPLOYEE_CODE = 'OWNER'

export function buildOperationsViewModel(snapshot: OperationsLiveResponse | null | undefined): OperationsViewModel {
  if (!snapshot) {
    return emptyOperationsViewModel()
  }

  const rows = collectOperationGroups(snapshot).map(buildOperationRow)

  return {
    rows,
    resources: buildTimelineResources(rows),
    timelineItems: buildTimelineItems(rows),
  }
}

function emptyOperationsViewModel(): OperationsViewModel {
  return {
    rows: [],
    resources: [],
    timelineItems: [],
  }
}

function collectOperationGroups(snapshot: OperationsLiveResponse): OperationGroup[] {
  const groups = [...snapshot.employees]
  if (snapshot.unassigned.cashSession || snapshot.unassigned.comandas.length > 0) {
    groups.push(snapshot.unassigned)
  }

  return groups
}

function buildOperationRow(group: OperationGroup): OperationGridRow {
  const cashSessionStatus = mapCashSessionStatus(group.cashSession?.status)
  const activeTables = collectOpenTableLabels(group)
  const closedTablesToday = collectClosedTableLabels(group)

  return {
    employee: buildEmployeeSummary(group, activeTables, closedTablesToday, cashSessionStatus),
    tables: buildOperationTables(group),
    movements: buildCashMovements(group),
  }
}

function buildEmployeeSummary(
  group: OperationGroup,
  activeTables: string[],
  closedTablesToday: string[],
  cashSessionStatus: OperationCashSessionStatus,
): OperationGridRow['employee'] {
  return {
    ...buildEmployeeIdentity(group),
    activeTables,
    closedTablesToday,
    openOrdersCount: activeTables.length,
    closedOrdersCount: closedTablesToday.length,
    cashSessionStatus,
    ...buildCashSessionMetrics(group.cashSession),
  }
}

function buildEmployeeIdentity(group: OperationGroup) {
  return {
    employeeId: resolveEmployeeId(group),
    employeeCode: group.employeeCode ?? OWNER_EMPLOYEE_CODE,
    employeeName: group.displayName,
    role: group.employeeId ? 'STAFF' : 'OWNER',
  } as const
}

function buildCashSessionMetrics(cashSession: OperationGroup['cashSession']) {
  const expectedCashAmount = cashSession?.expectedCashAmount ?? 0

  return {
    cashOpeningAmount: cashSession?.openingCashAmount ?? 0,
    cashCurrentAmount: cashSession?.countedCashAmount ?? expectedCashAmount,
    cashExpectedAmount: expectedCashAmount,
    cashCountedAmount: cashSession?.countedCashAmount ?? undefined,
    cashDifferenceAmount: cashSession?.differenceAmount ?? undefined,
    salesRevenue: cashSession?.grossRevenueAmount ?? 0,
    salesProfit: cashSession?.realizedProfitAmount ?? 0,
  }
}

function buildCashMovements(group: OperationGroup): OperationCashMovement[] {
  return (group.cashSession?.movements ?? []).map((movement) => ({
    id: movement.id,
    employeeId: resolveEmployeeId(group),
    type: mapCashMovementType(movement.type),
    amount: movement.amount,
    reason: movement.note ?? 'Movimentacao operacional',
    createdAt: movement.createdAt,
  }))
}

function buildOperationTables(group: OperationGroup): OperationGridRow['tables'] {
  return group.comandas.map((comanda) => ({
    tableLabel: comanda.tableLabel,
    comandaId: comanda.id,
    employeeId: resolveEmployeeId(group),
    employeeName: group.displayName,
    status: mapComandaStatus(comanda.status),
    openedAt: comanda.openedAt,
    updatedAt: comanda.closedAt ?? comanda.openedAt,
    subtotal: comanda.subtotalAmount,
    discountAmount: comanda.discountAmount,
    totalAmount: comanda.totalAmount,
    itemsCount: comanda.items.reduce((sum, item) => sum + item.quantity, 0),
    notes: comanda.notes,
  }))
}

function collectOpenTableLabels(group: OperationGroup) {
  return group.comandas.filter(isOpenComanda).map((comanda) => comanda.tableLabel)
}

function collectClosedTableLabels(group: OperationGroup) {
  return group.comandas.filter(isClosedComanda).map((comanda) => comanda.tableLabel)
}

function isOpenComanda(comanda: OperationGroup['comandas'][number]) {
  return comanda.status !== 'CLOSED' && comanda.status !== 'CANCELLED'
}

function isClosedComanda(comanda: OperationGroup['comandas'][number]) {
  return comanda.status === 'CLOSED'
}

function buildTimelineResources(rows: OperationGridRow[]): OperationTimelineResource[] {
  return rows.map((row) => ({
    id: row.employee.employeeId,
    title: row.employee.employeeName,
    subtitle: `${row.employee.employeeCode} · ${row.employee.role}`,
    status: row.employee.cashSessionStatus,
  }))
}

function buildTimelineItems(rows: OperationGridRow[]): OperationTimelineItem[] {
  return rows.flatMap((row) =>
    row.tables.map(
      (table) =>
        ({
          id: table.comandaId,
          resourceId: row.employee.employeeId,
          title: `Mesa ${table.tableLabel}`,
          start: table.openedAt,
          end: table.status === 'closed' ? table.updatedAt : new Date().toISOString(),
          status: table.status,
          tableLabel: table.tableLabel,
          employeeName: row.employee.employeeName,
          amount: table.totalAmount,
        }) satisfies OperationTimelineItem,
    ),
  )
}

function resolveEmployeeId(group: OperationGroup) {
  return group.employeeId ?? UNASSIGNED_EMPLOYEE_ID
}

function mapCashSessionStatus(
  status: 'OPEN' | 'CLOSED' | 'FORCE_CLOSED' | undefined | null,
): OperationCashSessionStatus {
  if (status === 'CLOSED' || status === 'FORCE_CLOSED') {
    return 'closed'
  }

  return status === 'OPEN' ? 'open' : 'closing'
}

function mapCashMovementType(
  type: 'OPENING_FLOAT' | 'SUPPLY' | 'WITHDRAWAL' | 'ADJUSTMENT',
): OperationCashMovementType {
  switch (type) {
    case 'OPENING_FLOAT':
      return 'opening'
    case 'SUPPLY':
      return 'supply'
    case 'WITHDRAWAL':
      return 'withdrawal'
    default:
      return 'adjustment'
  }
}

function mapComandaStatus(
  status: 'OPEN' | 'IN_PREPARATION' | 'READY' | 'CLOSED' | 'CANCELLED',
): OperationComandaStatus {
  switch (status) {
    case 'IN_PREPARATION':
      return 'in_preparation'
    case 'READY':
      return 'ready'
    case 'CLOSED':
    case 'CANCELLED':
      return 'closed'
    default:
      return 'open'
  }
}
