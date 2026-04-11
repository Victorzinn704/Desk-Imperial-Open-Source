import type { CashClosure, CashMovement, CashSession, Comanda, ComandaItem, Employee, Mesa } from '@prisma/client'

import type {
  CashMovementRecord,
  CashSessionRecord,
  ComandaItemRecord,
  ComandaRecord,
  EmployeeOperationsRecord,
  KitchenItemStatus,
  MesaRecord,
  OperationsLiveResponse,
} from '@contracts/contracts'

export type {
  KitchenItemStatus,
  CashMovementRecord,
  CashSessionRecord,
  ComandaItemRecord,
  MesaRecord,
  ComandaRecord,
  EmployeeOperationsRecord,
  OperationsLiveResponse,
}

function toNumberOrNull(value: { toNumber(): number } | number | null | undefined) {
  if (value == null) {
    return null
  }

  return typeof value === 'number' ? value : value.toNumber()
}

type CashMovementLike = Pick<
  CashMovement,
  'id' | 'cashSessionId' | 'employeeId' | 'type' | 'amount' | 'note' | 'createdAt'
>

type CashSessionLike = Pick<
  CashSession,
  | 'id'
  | 'companyOwnerId'
  | 'employeeId'
  | 'status'
  | 'businessDate'
  | 'openingCashAmount'
  | 'countedCashAmount'
  | 'expectedCashAmount'
  | 'differenceAmount'
  | 'grossRevenueAmount'
  | 'realizedProfitAmount'
  | 'notes'
  | 'openedAt'
  | 'closedAt'
> & {
  movements: CashMovementLike[]
}

type ComandaItemLike = Pick<
  ComandaItem,
  | 'id'
  | 'productId'
  | 'productName'
  | 'quantity'
  | 'unitPrice'
  | 'totalAmount'
  | 'notes'
  | 'kitchenStatus'
  | 'kitchenQueuedAt'
  | 'kitchenReadyAt'
>

type MesaLike = Pick<
  Mesa,
  'id' | 'label' | 'capacity' | 'section' | 'positionX' | 'positionY' | 'active' | 'reservedUntil'
>

type ComandaLike = Pick<
  Comanda,
  | 'id'
  | 'companyOwnerId'
  | 'cashSessionId'
  | 'mesaId'
  | 'currentEmployeeId'
  | 'tableLabel'
  | 'customerName'
  | 'customerDocument'
  | 'participantCount'
  | 'status'
  | 'subtotalAmount'
  | 'discountAmount'
  | 'serviceFeeAmount'
  | 'totalAmount'
  | 'notes'
  | 'openedAt'
  | 'closedAt'
> & {
  items?: ComandaItemLike[]
}

type EmployeeLike = Pick<Employee, 'id' | 'employeeCode' | 'displayName' | 'active'>

type CashClosureLike = Pick<
  CashClosure,
  | 'status'
  | 'expectedCashAmount'
  | 'countedCashAmount'
  | 'differenceAmount'
  | 'grossRevenueAmount'
  | 'realizedProfitAmount'
  | 'openSessionsCount'
  | 'openComandasCount'
>

export function toCashMovementRecord(movement: CashMovementLike): CashMovementRecord {
  return {
    id: movement.id,
    cashSessionId: movement.cashSessionId,
    employeeId: movement.employeeId,
    type: movement.type,
    amount: toNumberOrNull(movement.amount) ?? 0,
    note: movement.note,
    createdAt: movement.createdAt.toISOString(),
  }
}

export function toCashSessionRecord(session: CashSessionLike): CashSessionRecord {
  return {
    id: session.id,
    companyOwnerId: session.companyOwnerId,
    employeeId: session.employeeId,
    status: session.status,
    businessDate: session.businessDate.toISOString(),
    openingCashAmount: toNumberOrNull(session.openingCashAmount) ?? 0,
    countedCashAmount: toNumberOrNull(session.countedCashAmount),
    expectedCashAmount: toNumberOrNull(session.expectedCashAmount) ?? 0,
    differenceAmount: toNumberOrNull(session.differenceAmount),
    grossRevenueAmount: toNumberOrNull(session.grossRevenueAmount) ?? 0,
    realizedProfitAmount: toNumberOrNull(session.realizedProfitAmount) ?? 0,
    notes: session.notes,
    openedAt: session.openedAt.toISOString(),
    closedAt: session.closedAt?.toISOString() ?? null,
    movements: session.movements.map(toCashMovementRecord),
  }
}

export function toComandaItemRecord(item: ComandaItemLike): ComandaItemRecord {
  return {
    id: item.id,
    productId: item.productId,
    productName: item.productName,
    quantity: item.quantity,
    unitPrice: toNumberOrNull(item.unitPrice) ?? 0,
    totalAmount: toNumberOrNull(item.totalAmount) ?? 0,
    notes: item.notes,
    kitchenStatus: item.kitchenStatus,
    kitchenQueuedAt: item.kitchenQueuedAt?.toISOString() ?? null,
    kitchenReadyAt: item.kitchenReadyAt?.toISOString() ?? null,
  }
}

export function toMesaRecord(
  mesa: MesaLike,
  openComanda: Pick<Comanda, 'id' | 'currentEmployeeId'> | null,
): MesaRecord {
  return {
    id: mesa.id,
    label: mesa.label,
    capacity: mesa.capacity,
    section: mesa.section,
    positionX: mesa.positionX,
    positionY: mesa.positionY,
    active: mesa.active,
    reservedUntil: mesa.reservedUntil?.toISOString() ?? null,
    status: mesa.reservedUntil && mesa.reservedUntil > new Date() ? 'reservada' : openComanda ? 'ocupada' : 'livre',
    comandaId: openComanda?.id ?? null,
    currentEmployeeId: openComanda?.currentEmployeeId ?? null,
  }
}

export function toComandaRecord(comanda: ComandaLike): ComandaRecord {
  return {
    id: comanda.id,
    companyOwnerId: comanda.companyOwnerId,
    cashSessionId: comanda.cashSessionId,
    mesaId: comanda.mesaId,
    currentEmployeeId: comanda.currentEmployeeId,
    tableLabel: comanda.tableLabel,
    customerName: comanda.customerName,
    customerDocument: comanda.customerDocument,
    participantCount: comanda.participantCount,
    status: comanda.status,
    subtotalAmount: toNumberOrNull(comanda.subtotalAmount) ?? 0,
    discountAmount: toNumberOrNull(comanda.discountAmount) ?? 0,
    serviceFeeAmount: toNumberOrNull(comanda.serviceFeeAmount) ?? 0,
    totalAmount: toNumberOrNull(comanda.totalAmount) ?? 0,
    notes: comanda.notes,
    openedAt: comanda.openedAt.toISOString(),
    closedAt: comanda.closedAt?.toISOString() ?? null,
    items: comanda.items ? comanda.items.map(toComandaItemRecord) : [],
  }
}

export type RealtimeCashSessionLike = {
  id: string
  status: CashSession['status']
  openingCashAmount: { toNumber(): number } | number
  countedCashAmount: { toNumber(): number } | number | null
  expectedCashAmount: { toNumber(): number } | number
  differenceAmount: { toNumber(): number } | number | null
  movements: Array<{
    type: CashMovement['type']
    amount: { toNumber(): number } | number
    id?: string
    cashSessionId?: string
    employeeId?: string | null
    note?: string | null
    createdAt?: Date
  }>
  companyOwnerId?: string
  employeeId?: string | null
  businessDate?: Date
  grossRevenueAmount?: { toNumber(): number } | number
  realizedProfitAmount?: { toNumber(): number } | number
  notes?: string | null
  openedAt?: Date
  closedAt?: Date | null
}

export function toRealtimeCashSessionRecord(session: RealtimeCashSessionLike): CashSessionRecord {
  const now = new Date()
  return {
    id: session.id,
    companyOwnerId: session.companyOwnerId ?? '',
    employeeId: session.employeeId ?? null,
    status: session.status,
    businessDate: (session.businessDate ?? now).toISOString(),
    openingCashAmount: toNumberOrNull(session.openingCashAmount) ?? 0,
    countedCashAmount: toNumberOrNull(session.countedCashAmount),
    expectedCashAmount: toNumberOrNull(session.expectedCashAmount) ?? 0,
    differenceAmount: toNumberOrNull(session.differenceAmount),
    grossRevenueAmount: toNumberOrNull(session.grossRevenueAmount) ?? 0,
    realizedProfitAmount: toNumberOrNull(session.realizedProfitAmount) ?? 0,
    notes: session.notes ?? null,
    openedAt: (session.openedAt ?? now).toISOString(),
    closedAt: session.closedAt?.toISOString() ?? null,
    movements: session.movements.map((movement, index) => ({
      id: movement.id ?? `${session.id}-movement-${index + 1}`,
      cashSessionId: movement.cashSessionId ?? session.id,
      employeeId: movement.employeeId ?? null,
      type: movement.type,
      amount: toNumberOrNull(movement.amount) ?? 0,
      note: movement.note ?? null,
      createdAt: (movement.createdAt ?? now).toISOString(),
    })),
  }
}

export type RealtimeComandaLike = {
  id: string
  tableLabel: string
  currentEmployeeId: string | null
  totalAmount: { toNumber(): number } | number
  closedAt: Date | null
  items: Array<{
    quantity: number
    id?: string
    productId?: string | null
    productName?: string
    unitPrice?: { toNumber(): number } | number
    totalAmount?: { toNumber(): number } | number
    notes?: string | null
    kitchenStatus?: KitchenItemStatus | null
    kitchenQueuedAt?: Date | null
    kitchenReadyAt?: Date | null
  }>
  companyOwnerId?: string
  cashSessionId?: string | null
  mesaId?: string | null
  customerName?: string | null
  customerDocument?: string | null
  participantCount?: number
  status?: Comanda['status']
  subtotalAmount?: { toNumber(): number } | number
  discountAmount?: { toNumber(): number } | number
  serviceFeeAmount?: { toNumber(): number } | number
  notes?: string | null
  openedAt?: Date
}

export function toRealtimeComandaRecord(comanda: RealtimeComandaLike): ComandaRecord {
  const now = new Date()
  const totalAmount = toNumberOrNull(comanda.totalAmount) ?? 0
  return {
    id: comanda.id,
    companyOwnerId: comanda.companyOwnerId ?? '',
    cashSessionId: comanda.cashSessionId ?? null,
    mesaId: comanda.mesaId ?? null,
    currentEmployeeId: comanda.currentEmployeeId,
    tableLabel: comanda.tableLabel,
    customerName: comanda.customerName ?? null,
    customerDocument: comanda.customerDocument ?? null,
    participantCount: comanda.participantCount ?? 1,
    status: comanda.status ?? (comanda.closedAt ? 'CLOSED' : 'OPEN'),
    subtotalAmount: toNumberOrNull(comanda.subtotalAmount) ?? totalAmount,
    discountAmount: toNumberOrNull(comanda.discountAmount) ?? 0,
    serviceFeeAmount: toNumberOrNull(comanda.serviceFeeAmount) ?? 0,
    totalAmount,
    notes: comanda.notes ?? null,
    openedAt: (comanda.openedAt ?? comanda.closedAt ?? now).toISOString(),
    closedAt: comanda.closedAt?.toISOString() ?? null,
    items: comanda.items
      ? comanda.items.map((item, index) => ({
          id: item.id ?? `${comanda.id}-item-${index + 1}`,
          productId: item.productId ?? null,
          productName: item.productName ?? 'Item',
          quantity: item.quantity,
          unitPrice: toNumberOrNull(item.unitPrice) ?? 0,
          totalAmount: toNumberOrNull(item.totalAmount) ?? 0,
          notes: item.notes ?? null,
          kitchenStatus: item.kitchenStatus ?? null,
          kitchenQueuedAt: item.kitchenQueuedAt?.toISOString() ?? null,
          kitchenReadyAt: item.kitchenReadyAt?.toISOString() ?? null,
        }))
      : [],
  }
}

export function buildEmployeeOperationsRecord(input: {
  employee: EmployeeLike | null
  cashSession: CashSessionLike | null
  comandas: ComandaLike[]
  fallbackDisplayName?: string
}): EmployeeOperationsRecord {
  const cashSession = input.cashSession ? toCashSessionRecord(input.cashSession) : null
  const comandas = input.comandas.map(toComandaRecord)

  return {
    employeeId: input.employee?.id ?? null,
    employeeCode: input.employee?.employeeCode ?? null,
    displayName: input.employee?.displayName ?? input.fallbackDisplayName ?? 'Operacao sem responsavel',
    active: input.employee?.active ?? true,
    cashSession,
    comandas,
  }
}

export function toClosureRecord(closure: CashClosureLike | null) {
  if (!closure) {
    return null
  }

  return {
    status: closure.status,
    expectedCashAmount: toNumberOrNull(closure.expectedCashAmount) ?? 0,
    countedCashAmount: toNumberOrNull(closure.countedCashAmount),
    differenceAmount: toNumberOrNull(closure.differenceAmount),
    grossRevenueAmount: toNumberOrNull(closure.grossRevenueAmount) ?? 0,
    realizedProfitAmount: toNumberOrNull(closure.realizedProfitAmount) ?? 0,
    openSessionsCount: closure.openSessionsCount,
    openComandasCount: closure.openComandasCount,
  }
}
