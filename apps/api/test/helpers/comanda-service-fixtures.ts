import { ComandaStatus, KitchenItemStatus } from '@prisma/client'
import { makeOwnerAuthContext } from './auth-context.factory'
import { makeRequestContext } from './request-context.factory'

export const COMANDA_ID = 'comanda-1'
export const OWNER_ID = 'owner-1'
export const WITHOUT_LIVE_SNAPSHOT = { includeSnapshot: false } as const

export function makeBusinessDate() {
  return new Date('2026-04-01T00:00:00.000Z')
}

export function makeRequest() {
  return makeRequestContext()
}

export function makeOwnerAuth() {
  return makeOwnerAuthContext({ workspaceOwnerUserId: OWNER_ID })
}

export function makeComandaItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'item-existing',
    productId: 'product-1',
    productName: 'Pizza',
    quantity: 1,
    unitPrice: 100,
    totalAmount: 100,
    notes: 'sem cebola',
    kitchenStatus: KitchenItemStatus.QUEUED,
    kitchenQueuedAt: new Date('2026-04-01T10:00:00.000Z'),
    kitchenReadyAt: null,
    ...overrides,
  }
}

export function makeComanda(overrides: Record<string, unknown> = {}) {
  return {
    id: COMANDA_ID,
    companyOwnerId: OWNER_ID,
    cashSessionId: 'cash-1',
    mesaId: 'mesa-1',
    currentEmployeeId: null,
    tableLabel: 'Mesa 1',
    customerName: 'Cliente',
    customerDocument: null,
    participantCount: 2,
    status: ComandaStatus.OPEN,
    subtotalAmount: 100,
    discountAmount: 0,
    serviceFeeAmount: 0,
    totalAmount: 100,
    notes: null,
    openedAt: new Date('2026-04-01T10:00:00.000Z'),
    closedAt: null,
    items: [makeComandaItem()],
    ...overrides,
  }
}

export function makeOpenCashClosure(overrides: Record<string, unknown> = {}) {
  return {
    id: 'closure-1',
    status: 'OPEN',
    expectedCashAmount: 320,
    countedCashAmount: null,
    differenceAmount: null,
    grossRevenueAmount: 320,
    realizedProfitAmount: 120,
    openSessionsCount: 1,
    openComandasCount: 0,
    createdAt: new Date('2026-04-01T08:00:00.000Z'),
    closedAt: null,
    ...overrides,
  }
}

export function makeRecalculatedCashSession() {
  return {
    id: 'cash-1',
    status: 'OPEN',
    openingCashAmount: 200,
    countedCashAmount: null,
    expectedCashAmount: 320,
    differenceAmount: null,
    movements: [],
  }
}
