import { ComandaStatus } from '@prisma/client'
import type { CacheService } from '../../src/common/services/cache.service'
import type { OperationsRealtimeService } from '../../src/modules/operations-realtime/operations-realtime.service'
import { ComandaRealtimePublisher } from '../../src/modules/operations/comanda-realtime-publisher.service'

export const PUBLISHER_BUSINESS_DATE = new Date(2026, 2, 30)
export const PUBLISHER_OPENED_AT = new Date('2026-03-30T10:00:00.000Z')
export const PUBLISHER_CLOSED_AT = new Date('2026-03-30T11:00:00.000Z')

export type PublisherTestEnv = {
  publisher: ComandaRealtimePublisher
  realtimeService: {
    publishComandaOpened: jest.Mock
    publishComandaUpdated: jest.Mock
    publishComandaClosed: jest.Mock
    publishKitchenItemQueued: jest.Mock
    publishKitchenItemUpdated: jest.Mock
    publishCashUpdated: jest.Mock
    publishCashClosureUpdated: jest.Mock
  }
  cache: { del: jest.Mock; delByPrefix: jest.Mock }
}

export function createPublisherTestEnv(): PublisherTestEnv {
  const realtimeService = {
    publishComandaOpened: jest.fn(),
    publishComandaUpdated: jest.fn(),
    publishComandaClosed: jest.fn(),
    publishKitchenItemQueued: jest.fn(),
    publishKitchenItemUpdated: jest.fn(),
    publishCashUpdated: jest.fn(),
    publishCashClosureUpdated: jest.fn(),
  }
  const cache = {
    del: jest.fn(async () => {}),
    delByPrefix: jest.fn(async () => {}),
  }
  const publisher = new ComandaRealtimePublisher(
    cache as unknown as CacheService,
    realtimeService as unknown as OperationsRealtimeService,
  )
  return { publisher, realtimeService, cache }
}

export function makePublishedComanda(overrides: Record<string, unknown> = {}) {
  return {
    id: 'comanda-1',
    tableLabel: 'Mesa 01',
    status: ComandaStatus.OPEN,
    currentEmployeeId: 'emp-1',
    subtotalAmount: 120,
    discountAmount: 10,
    serviceFeeAmount: 5,
    totalAmount: 115,
    openedAt: PUBLISHER_OPENED_AT,
    closedAt: null,
    items: [{ quantity: 2 }, { quantity: 1 }],
    ...overrides,
  }
}

export function makePublishedComandaItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'item-1',
    kitchenQueuedAt: null,
    kitchenReadyAt: null,
    kitchenStatus: null,
    notes: null,
    productId: 'prod-1',
    productName: 'Coca-Cola',
    quantity: 2,
    totalAmount: 20,
    unitPrice: 10,
    ...overrides,
  }
}

export function makePublishedComandaPayment(overrides: Record<string, unknown> = {}) {
  return {
    amount: 40,
    id: 'payment-1',
    method: 'PIX',
    note: 'Mercado Pago Point - PIX',
    paidAt: new Date('2026-03-30T10:05:00.000Z'),
    status: 'CONFIRMED',
    ...overrides,
  }
}
