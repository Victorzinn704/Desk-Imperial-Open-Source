export const employeeSnapshotSelect = {
  id: true,
  employeeCode: true,
  displayName: true,
  active: true,
} as const

export const cashMovementSnapshotSelect = {
  id: true,
  cashSessionId: true,
  employeeId: true,
  type: true,
  amount: true,
  note: true,
  createdAt: true,
} as const

export const cashSessionSnapshotSelect = {
  id: true,
  companyOwnerId: true,
  employeeId: true,
  status: true,
  businessDate: true,
  openingCashAmount: true,
  countedCashAmount: true,
  expectedCashAmount: true,
  differenceAmount: true,
  grossRevenueAmount: true,
  realizedProfitAmount: true,
  notes: true,
  openedAt: true,
  closedAt: true,
  movements: {
    select: cashMovementSnapshotSelect,
    orderBy: {
      createdAt: 'asc' as const,
    },
  },
} as const

export const cashSessionSnapshotWithoutMovementsSelect = {
  id: true,
  companyOwnerId: true,
  employeeId: true,
  status: true,
  businessDate: true,
  openingCashAmount: true,
  countedCashAmount: true,
  expectedCashAmount: true,
  differenceAmount: true,
  grossRevenueAmount: true,
  realizedProfitAmount: true,
  notes: true,
  openedAt: true,
  closedAt: true,
} as const

export const cashSessionCompactRefSelect = {
  id: true,
} as const

export const comandaItemSnapshotSelect = {
  id: true,
  productId: true,
  productName: true,
  quantity: true,
  unitPrice: true,
  totalAmount: true,
  notes: true,
  kitchenStatus: true,
  kitchenQueuedAt: true,
  kitchenReadyAt: true,
} as const

export const comandaSnapshotSelect = {
  id: true,
  companyOwnerId: true,
  cashSessionId: true,
  mesaId: true,
  currentEmployeeId: true,
  tableLabel: true,
  customerName: true,
  customerDocument: true,
  participantCount: true,
  status: true,
  subtotalAmount: true,
  discountAmount: true,
  serviceFeeAmount: true,
  totalAmount: true,
  notes: true,
  openedAt: true,
  closedAt: true,
  items: {
    select: comandaItemSnapshotSelect,
    orderBy: {
      createdAt: 'asc' as const,
    },
  },
} as const

export const comandaSnapshotCompactSelect = {
  id: true,
  companyOwnerId: true,
  cashSessionId: true,
  mesaId: true,
  currentEmployeeId: true,
  tableLabel: true,
  customerName: true,
  customerDocument: true,
  participantCount: true,
  status: true,
  subtotalAmount: true,
  discountAmount: true,
  serviceFeeAmount: true,
  totalAmount: true,
  notes: true,
  openedAt: true,
  closedAt: true,
} as const

export const cashClosureSnapshotSelect = {
  status: true,
  expectedCashAmount: true,
  countedCashAmount: true,
  differenceAmount: true,
  grossRevenueAmount: true,
  realizedProfitAmount: true,
  openSessionsCount: true,
  openComandasCount: true,
} as const

export const mesaSnapshotSelect = {
  id: true,
  label: true,
  capacity: true,
  section: true,
  positionX: true,
  positionY: true,
  active: true,
  reservedUntil: true,
} as const
