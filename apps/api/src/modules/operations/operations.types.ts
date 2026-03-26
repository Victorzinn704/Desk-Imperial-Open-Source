import type {
  CashClosure,
  CashMovement,
  CashSession,
  Comanda,
  ComandaItem,
  Employee,
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
  'id' | 'productId' | 'productName' | 'quantity' | 'unitPrice' | 'totalAmount' | 'notes'
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
  }
}

export function toMesaRecord(
  mesa: MesaLike,
  openComandas: Pick<Comanda, 'id' | 'currentEmployeeId'>[],
): MesaRecord {
  const comanda = openComandas.find((c) => c.id) // will be matched by mesaId in service
  return {
    id: mesa.id,
    label: mesa.label,
    capacity: mesa.capacity,
    section: mesa.section,
    positionX: mesa.positionX,
    positionY: mesa.positionY,
    active: mesa.active,
    reservedUntil: mesa.reservedUntil?.toISOString() ?? null,
    status: mesa.reservedUntil && mesa.reservedUntil > new Date() ? 'reservada' : comanda ? 'ocupada' : 'livre',
    comandaId: comanda?.id ?? null,
    currentEmployeeId: comanda?.currentEmployeeId ?? null,
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

export function buildEmployeeOperationsRecord(input: {
  employee: EmployeeLike | null
  cashSession: CashSessionLike | null
  comandas: ComandaLike[]
}): EmployeeOperationsRecord {
  const cashSession = input.cashSession ? toCashSessionRecord(input.cashSession) : null
  const comandas = input.comandas.map(toComandaRecord)
  const openTables = comandas.filter((item) => item.status !== 'CLOSED' && item.status !== 'CANCELLED').length
  const closedTables = comandas.filter((item) => item.status === 'CLOSED').length

  return {
    employeeId: input.employee?.id ?? null,
    employeeCode: input.employee?.employeeCode ?? null,
    displayName: input.employee?.displayName ?? 'Operacao sem responsavel',
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
