import type {
  CashClosureStatus,
  ComandaRecord,
  ComandaStatus,
  EmployeeOperationsRecord,
  KitchenItemStatus,
  MesaRecord,
  OperationsLiveResponse,
} from '@contracts/contracts'

type ComandaItemInput = {
  id?: string
  productId?: string | null
  productName?: string
  quantity?: number
  unitPrice?: number
  notes?: string | null
  kitchenStatus?: KitchenItemStatus | null
  kitchenQueuedAt?: string | null
  kitchenReadyAt?: string | null
}

type ComandaInput = {
  id?: string
  companyOwnerId?: string
  cashSessionId?: string | null
  mesaId?: string | null
  currentEmployeeId?: string | null
  tableLabel?: string
  customerName?: string | null
  customerDocument?: string | null
  participantCount?: number
  status?: ComandaStatus
  subtotalAmount?: number
  discountAmount?: number
  serviceFeeAmount?: number
  totalAmount?: number
  notes?: string | null
  openedAt?: string
  closedAt?: string | null
  items?: ComandaItemInput[]
}

type EmployeeGroupInput = {
  employeeId?: string | null
  employeeCode?: string | null
  displayName?: string
  active?: boolean
  cashSessionId?: string | null
  comandas?: ComandaInput[]
}

type SnapshotInput = {
  businessDate?: string
  companyOwnerId?: string
  closure?: {
    status?: CashClosureStatus
    expectedCashAmount?: number
    countedCashAmount?: number | null
    differenceAmount?: number | null
    grossRevenueAmount?: number
    realizedProfitAmount?: number
    openSessionsCount?: number
    openComandasCount?: number
  } | null
  employees?: EmployeeGroupInput[]
  unassigned?: EmployeeGroupInput
  mesas?: MesaRecord[]
}

const DEFAULT_DATE = '2026-03-28T12:00:00.000Z'

export function buildComandaItem(overrides: ComandaItemInput = {}): ComandaRecord['items'][number] {
  const quantity = overrides.quantity ?? 1
  const unitPrice = overrides.unitPrice ?? 10
  return {
    id: overrides.id ?? `item-${Math.random().toString(36).slice(2, 8)}`,
    productId: overrides.productId ?? 'product-1',
    productName: overrides.productName ?? 'Item teste',
    quantity,
    unitPrice,
    totalAmount: quantity * unitPrice,
    notes: overrides.notes ?? null,
    kitchenStatus: overrides.kitchenStatus ?? null,
    kitchenQueuedAt: overrides.kitchenQueuedAt ?? null,
    kitchenReadyAt: overrides.kitchenReadyAt ?? null,
  }
}

export function buildComanda(overrides: ComandaInput = {}): ComandaRecord {
  const items = (overrides.items ?? [buildComandaItem()]).map((item) => buildComandaItem(item))
  const subtotalAmount = items.reduce((sum, item) => sum + item.totalAmount, 0)
  const discountAmount = overrides.discountAmount ?? 0
  const serviceFeeAmount = overrides.serviceFeeAmount ?? 0
  const totalAmount = overrides.totalAmount ?? subtotalAmount - discountAmount + serviceFeeAmount

  return {
    id: overrides.id ?? `comanda-${Math.random().toString(36).slice(2, 8)}`,
    companyOwnerId: overrides.companyOwnerId ?? 'owner-1',
    cashSessionId: overrides.cashSessionId ?? 'cash-1',
    mesaId: overrides.mesaId ?? 'mesa-1',
    currentEmployeeId: overrides.currentEmployeeId ?? null,
    tableLabel: overrides.tableLabel ?? '1',
    customerName: overrides.customerName ?? null,
    customerDocument: overrides.customerDocument ?? null,
    participantCount: overrides.participantCount ?? 2,
    status: overrides.status ?? 'OPEN',
    subtotalAmount,
    discountAmount,
    serviceFeeAmount,
    totalAmount,
    notes: overrides.notes ?? null,
    openedAt: overrides.openedAt ?? DEFAULT_DATE,
    closedAt: overrides.closedAt ?? null,
    items,
  }
}

export function buildEmployeeGroup(overrides: EmployeeGroupInput = {}): EmployeeOperationsRecord {
  const comandas = (overrides.comandas ?? []).map((comanda) => buildComanda(comanda))
  const grossRevenueAmount = comandas.reduce((sum, comanda) => sum + comanda.totalAmount, 0)

  return {
    employeeId: overrides.employeeId ?? null,
    employeeCode: overrides.employeeCode ?? null,
    displayName: overrides.displayName ?? 'Funcionário',
    active: overrides.active ?? true,
    cashSession: overrides.cashSessionId
      ? {
          id: overrides.cashSessionId,
          companyOwnerId: 'owner-1',
          employeeId: overrides.employeeId ?? null,
          status: 'OPEN',
          businessDate: '2026-03-28',
          openingCashAmount: 0,
          countedCashAmount: null,
          expectedCashAmount: 0,
          differenceAmount: null,
          grossRevenueAmount,
          realizedProfitAmount: 0,
          notes: null,
          openedAt: DEFAULT_DATE,
          closedAt: null,
          movements: [],
        }
      : null,
    comandas,
  }
}

export function buildMesaRecord(overrides: Partial<MesaRecord> = {}): MesaRecord {
  return {
    id: overrides.id ?? 'mesa-1',
    label: overrides.label ?? 'Mesa 1',
    capacity: overrides.capacity ?? 4,
    section: overrides.section ?? null,
    positionX: overrides.positionX ?? null,
    positionY: overrides.positionY ?? null,
    active: overrides.active ?? true,
    reservedUntil: overrides.reservedUntil ?? null,
    status: overrides.status ?? 'ocupada',
    comandaId: overrides.comandaId ?? null,
    currentEmployeeId: overrides.currentEmployeeId ?? null,
  }
}

export function buildOperationsSnapshot(input: SnapshotInput = {}): OperationsLiveResponse {
  const employees = (input.employees ?? []).map((group) => buildEmployeeGroup(group))
  const unassigned = buildEmployeeGroup({
    employeeId: null,
    employeeCode: null,
    displayName: 'Operação do balcão/empresa',
    active: true,
    comandas: input.unassigned?.comandas ?? [],
  })

  return {
    businessDate: input.businessDate ?? '2026-03-28',
    companyOwnerId: input.companyOwnerId ?? 'owner-1',
    closure:
      input.closure === null
        ? null
        : {
            status: input.closure?.status ?? 'OPEN',
            expectedCashAmount: input.closure?.expectedCashAmount ?? 0,
            countedCashAmount: input.closure?.countedCashAmount ?? null,
            differenceAmount: input.closure?.differenceAmount ?? null,
            grossRevenueAmount: input.closure?.grossRevenueAmount ?? 0,
            realizedProfitAmount: input.closure?.realizedProfitAmount ?? 0,
            openSessionsCount: input.closure?.openSessionsCount ?? 0,
            openComandasCount: input.closure?.openComandasCount ?? 0,
          },
    employees,
    unassigned,
    mesas: (input.mesas ?? [buildMesaRecord()]).map((mesa) => buildMesaRecord(mesa)),
  }
}
