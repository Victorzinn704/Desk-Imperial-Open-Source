import type {
  CashClosure,
  CashMovement,
  CashSession,
  Comanda,
  ComandaItem,
  Employee,
  KitchenItemStatus,
  Mesa,
} from '@prisma/client'

function toNumber(value: { toNumber(): number } | number | null | undefined) {
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
  items: ComandaItemLike[]
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

export type CashMovementRecord = {
  id: string
  cashSessionId: string
  employeeId: string | null
  type: CashMovement['type']
  amount: number
  note: string | null
  createdAt: string
}

export type CashSessionRecord = {
  id: string
  companyOwnerId: string
  employeeId: string | null
  status: CashSession['status']
  businessDate: string
  openingCashAmount: number
  countedCashAmount: number | null
  expectedCashAmount: number
  differenceAmount: number | null
  grossRevenueAmount: number
  realizedProfitAmount: number
  notes: string | null
  openedAt: string
  closedAt: string | null
  movements: CashMovementRecord[]
}

export type ComandaItemRecord = {
  id: string
  productId: string | null
  productName: string
  quantity: number
  unitPrice: number
  totalAmount: number
  notes: string | null
  kitchenStatus: KitchenItemStatus | null
  kitchenQueuedAt: string | null
  kitchenReadyAt: string | null
}

export type MesaRecord = {
  id: string
  label: string
  capacity: number
  section: string | null
  positionX: number | null
  positionY: number | null
  active: boolean
  reservedUntil: string | null
  // derived status — computed from open comandas
  status: 'livre' | 'ocupada' | 'reservada'
  comandaId: string | null
  currentEmployeeId: string | null
}

export type ComandaRecord = {
  id: string
  companyOwnerId: string
  cashSessionId: string | null
  mesaId: string | null
  currentEmployeeId: string | null
  tableLabel: string
  customerName: string | null
  customerDocument: string | null
  participantCount: number
  status: Comanda['status']
  subtotalAmount: number
  discountAmount: number
  serviceFeeAmount: number
  totalAmount: number
  notes: string | null
  openedAt: string
  closedAt: string | null
  items: ComandaItemRecord[]
}

export type EmployeeOperationsRecord = {
  employeeId: string | null
  employeeCode: string | null
  displayName: string
  active: boolean
  cashSession: CashSessionRecord | null
  comandas: ComandaRecord[]
  metrics: {
    openTables: number
    closedTables: number
    grossRevenueAmount: number
    realizedProfitAmount: number
    expectedCashAmount: number
  }
}

export type OperationsLiveResponse = {
  businessDate: string
  companyOwnerId: string
  closure: {
    status: CashClosure['status']
    expectedCashAmount: number
    countedCashAmount: number | null
    differenceAmount: number | null
    grossRevenueAmount: number
    realizedProfitAmount: number
    openSessionsCount: number
    openComandasCount: number
  } | null
  employees: EmployeeOperationsRecord[]
  unassigned: EmployeeOperationsRecord
  mesas: MesaRecord[]
}

export function toCashMovementRecord(movement: CashMovementLike): CashMovementRecord {
  return {
    id: movement.id,
    cashSessionId: movement.cashSessionId,
    employeeId: movement.employeeId,
    type: movement.type,
    amount: toNumber(movement.amount) ?? 0,
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
    openingCashAmount: toNumber(session.openingCashAmount) ?? 0,
    countedCashAmount: toNumber(session.countedCashAmount),
    expectedCashAmount: toNumber(session.expectedCashAmount) ?? 0,
    differenceAmount: toNumber(session.differenceAmount),
    grossRevenueAmount: toNumber(session.grossRevenueAmount) ?? 0,
    realizedProfitAmount: toNumber(session.realizedProfitAmount) ?? 0,
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
    unitPrice: toNumber(item.unitPrice) ?? 0,
    totalAmount: toNumber(item.totalAmount) ?? 0,
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
    subtotalAmount: toNumber(comanda.subtotalAmount) ?? 0,
    discountAmount: toNumber(comanda.discountAmount) ?? 0,
    serviceFeeAmount: toNumber(comanda.serviceFeeAmount) ?? 0,
    totalAmount: toNumber(comanda.totalAmount) ?? 0,
    notes: comanda.notes,
    openedAt: comanda.openedAt.toISOString(),
    closedAt: comanda.closedAt?.toISOString() ?? null,
    items: comanda.items.map(toComandaItemRecord),
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
    openingCashAmount: toNumber(session.openingCashAmount) ?? 0,
    countedCashAmount: toNumber(session.countedCashAmount),
    expectedCashAmount: toNumber(session.expectedCashAmount) ?? 0,
    differenceAmount: toNumber(session.differenceAmount),
    grossRevenueAmount: toNumber(session.grossRevenueAmount) ?? 0,
    realizedProfitAmount: toNumber(session.realizedProfitAmount) ?? 0,
    notes: session.notes ?? null,
    openedAt: (session.openedAt ?? now).toISOString(),
    closedAt: session.closedAt?.toISOString() ?? null,
    movements: session.movements.map((movement, index) => ({
      id: movement.id ?? `${session.id}-movement-${index + 1}`,
      cashSessionId: movement.cashSessionId ?? session.id,
      employeeId: movement.employeeId ?? null,
      type: movement.type,
      amount: toNumber(movement.amount) ?? 0,
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
  const totalAmount = toNumber(comanda.totalAmount) ?? 0
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
    subtotalAmount: toNumber(comanda.subtotalAmount) ?? totalAmount,
    discountAmount: toNumber(comanda.discountAmount) ?? 0,
    serviceFeeAmount: toNumber(comanda.serviceFeeAmount) ?? 0,
    totalAmount,
    notes: comanda.notes ?? null,
    openedAt: (comanda.openedAt ?? comanda.closedAt ?? now).toISOString(),
    closedAt: comanda.closedAt?.toISOString() ?? null,
    items: comanda.items.map((item, index) => ({
      id: item.id ?? `${comanda.id}-item-${index + 1}`,
      productId: item.productId ?? null,
      productName: item.productName ?? 'Item',
      quantity: item.quantity,
      unitPrice: toNumber(item.unitPrice) ?? 0,
      totalAmount: toNumber(item.totalAmount) ?? 0,
      notes: item.notes ?? null,
      kitchenStatus: item.kitchenStatus ?? null,
      kitchenQueuedAt: item.kitchenQueuedAt?.toISOString() ?? null,
      kitchenReadyAt: item.kitchenReadyAt?.toISOString() ?? null,
    })),
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
  const openTables = comandas.filter((item) => item.status !== 'CLOSED' && item.status !== 'CANCELLED').length
  const closedTables = comandas.filter((item) => item.status === 'CLOSED').length

  return {
    employeeId: input.employee?.id ?? null,
    employeeCode: input.employee?.employeeCode ?? null,
    displayName: input.employee?.displayName ?? input.fallbackDisplayName ?? 'Operacao sem responsavel',
    active: input.employee?.active ?? true,
    cashSession,
    comandas,
    metrics: {
      openTables,
      closedTables,
      grossRevenueAmount: cashSession?.grossRevenueAmount ?? 0,
      realizedProfitAmount: cashSession?.realizedProfitAmount ?? 0,
      expectedCashAmount: cashSession?.expectedCashAmount ?? 0,
    },
  }
}

export function toClosureRecord(closure: CashClosureLike | null) {
  if (!closure) {
    return null
  }

  return {
    status: closure.status,
    expectedCashAmount: toNumber(closure.expectedCashAmount) ?? 0,
    countedCashAmount: toNumber(closure.countedCashAmount),
    differenceAmount: toNumber(closure.differenceAmount),
    grossRevenueAmount: toNumber(closure.grossRevenueAmount) ?? 0,
    realizedProfitAmount: toNumber(closure.realizedProfitAmount) ?? 0,
    openSessionsCount: closure.openSessionsCount,
    openComandasCount: closure.openComandasCount,
  }
}
