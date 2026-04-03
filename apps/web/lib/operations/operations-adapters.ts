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

type OperationsViewModel = {
  rows: OperationGridRow[]
  resources: OperationTimelineResource[]
  timelineItems: OperationTimelineItem[]
}

export function buildOperationsViewModel(snapshot: OperationsLiveResponse | null | undefined): OperationsViewModel {
  if (!snapshot) {
    return {
      rows: [],
      resources: [],
      timelineItems: [],
    }
  }

  const groups = [...snapshot.employees]
  if (snapshot.unassigned.cashSession || snapshot.unassigned.comandas.length > 0) {
    groups.push(snapshot.unassigned)
  }

  const rows = groups.map((group) => {
    const cashSessionStatus = mapCashSessionStatus(group.cashSession?.status)
    const movements: OperationCashMovement[] = (group.cashSession?.movements ?? []).map((movement) => ({
      id: movement.id,
      employeeId: group.employeeId ?? 'unassigned',
      type: mapCashMovementType(movement.type),
      amount: movement.amount,
      reason: movement.note ?? 'Movimentacao operacional',
      createdAt: movement.createdAt,
    }))

    const tables = group.comandas.map((comanda) => ({
      tableLabel: comanda.tableLabel,
      comandaId: comanda.id,
      employeeId: group.employeeId ?? 'unassigned',
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

    const activeTables = group.comandas
      .filter((comanda) => comanda.status !== 'CLOSED' && comanda.status !== 'CANCELLED')
      .map((comanda) => comanda.tableLabel)

    const closedTablesToday = group.comandas
      .filter((comanda) => comanda.status === 'CLOSED')
      .map((comanda) => comanda.tableLabel)

    return {
      employee: {
        employeeId: group.employeeId ?? 'unassigned',
        employeeCode: group.employeeCode ?? 'OWNER',
        employeeName: group.displayName,
        role: group.employeeId ? 'STAFF' : 'OWNER',
        activeTables,
        closedTablesToday,
        openOrdersCount: activeTables.length,
        closedOrdersCount: closedTablesToday.length,
        cashSessionStatus,
        cashOpeningAmount: group.cashSession?.openingCashAmount ?? 0,
        cashCurrentAmount: group.cashSession?.countedCashAmount ?? group.cashSession?.expectedCashAmount ?? 0,
        cashExpectedAmount: group.cashSession?.expectedCashAmount ?? 0,
        cashCountedAmount: group.cashSession?.countedCashAmount ?? undefined,
        cashDifferenceAmount: group.cashSession?.differenceAmount ?? undefined,
        salesRevenue: group.cashSession?.grossRevenueAmount ?? 0,
        salesProfit: group.cashSession?.realizedProfitAmount ?? 0,
      },
      tables,
      movements,
    } satisfies OperationGridRow
  })

  const resources = rows.map((row) => ({
    id: row.employee.employeeId,
    title: row.employee.employeeName,
    subtitle: `${row.employee.employeeCode} · ${row.employee.role}`,
    status: row.employee.cashSessionStatus,
  }))

  const timelineItems = rows.flatMap((row) =>
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

  return {
    rows,
    resources,
    timelineItems,
  }
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
    case 'ADJUSTMENT':
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
    case 'OPEN':
    default:
      return 'open'
  }
}
