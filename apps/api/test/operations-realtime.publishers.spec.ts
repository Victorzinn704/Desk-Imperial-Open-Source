import { ComandaStatus, KitchenItemStatus } from '@prisma/client'
import { CacheService } from '../src/common/services/cache.service'
import { OperationsRealtimeService } from '../src/modules/operations-realtime/operations-realtime.service'
import { ComandaService } from '../src/modules/operations/comanda.service'
import type { PrismaService } from '../src/database/prisma.service'
import type { AuditLogService } from '../src/modules/monitoring/audit-log.service'
import type { OperationsHelpersService } from '../src/modules/operations/operations-helpers.service'

describe('Operations realtime publishers', () => {
  const realtimeService = {
    publishComandaOpened: jest.fn(),
    publishComandaUpdated: jest.fn(),
    publishComandaClosed: jest.fn(),
    publishKitchenItemQueued: jest.fn(),
    publishKitchenItemUpdated: jest.fn(),
    publishCashUpdated: jest.fn(),
    publishCashClosureUpdated: jest.fn(),
  }

  const service = new ComandaService(
    {} as PrismaService,
    {} as CacheService,
    { record: jest.fn() } as unknown as AuditLogService,
    realtimeService as unknown as OperationsRealtimeService,
    {} as OperationsHelpersService,
  )

  const auth = {
    userId: 'user-1',
    role: 'OWNER' as const,
    workspaceOwnerUserId: 'user-1',
    companyOwnerUserId: 'user-1',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('emite comanda aberta sem payload legada completa', () => {
    ;(service as any).publishComandaOpenedRealtime(
      auth,
      {
        id: 'comanda-1',
        tableLabel: 'Mesa 01',
        status: ComandaStatus.OPEN,
        currentEmployeeId: 'emp-1',
        subtotalAmount: 120,
        discountAmount: 10,
        serviceFeeAmount: 5,
        totalAmount: 115,
        openedAt: new Date('2026-03-30T10:00:00.000Z'),
        items: [{ quantity: 2 }, { quantity: 1 }],
      },
      new Date(2026, 2, 30),
    )

    expect(realtimeService.publishComandaOpened).toHaveBeenCalledTimes(1)
    expect(realtimeService.publishComandaOpened.mock.calls[0][0]).toBe(auth)
    expect(realtimeService.publishComandaOpened.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        comandaId: 'comanda-1',
        mesaLabel: 'Mesa 01',
        openedAt: '2026-03-30T10:00:00.000Z',
        employeeId: 'emp-1',
        status: 'OPEN',
        subtotal: 120,
        discountAmount: 10,
        serviceFeeAmount: 5,
        totalAmount: 115,
        totalItems: 3,
        businessDate: '2026-03-30',
      }),
    )
    const payload = realtimeService.publishComandaOpened.mock.calls[0][1]
    expect(payload).not.toHaveProperty('comanda')
  })

  it('emite item de cozinha sem snapshot completo', () => {
    ;(service as any).publishKitchenItemQueuedRealtime(
      auth,
      {
        id: 'comanda-1',
        tableLabel: 'Mesa 01',
        currentEmployeeId: null,
      },
      {
        id: 'item-1',
        productName: 'Pizza',
        quantity: 2,
        notes: 'Sem cebola',
        kitchenStatus: KitchenItemStatus.QUEUED,
        kitchenQueuedAt: new Date('2026-03-30T10:01:00.000Z'),
        kitchenReadyAt: null,
      },
      new Date(2026, 2, 30),
    )

    expect(realtimeService.publishKitchenItemQueued).toHaveBeenCalledTimes(1)
    expect(realtimeService.publishKitchenItemQueued.mock.calls[0][0]).toBe(auth)
    expect(realtimeService.publishKitchenItemQueued.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        itemId: 'item-1',
        comandaId: 'comanda-1',
        mesaLabel: 'Mesa 01',
        employeeId: null,
        productName: 'Pizza',
        quantity: 2,
        notes: 'Sem cebola',
        kitchenStatus: 'QUEUED',
        kitchenQueuedAt: '2026-03-30T10:01:00.000Z',
        kitchenReadyAt: null,
        businessDate: '2026-03-30',
      }),
    )
    const payload = realtimeService.publishKitchenItemQueued.mock.calls[0][1]
    expect(payload).not.toHaveProperty('item')
    expect(payload).not.toHaveProperty('comanda')
  })

  it('permite sinalizar refresh de cozinha apenas nos fluxos que realmente precisam', () => {
    ;(service as any).publishComandaUpdatedRealtime(
      auth,
      {
        id: 'comanda-1',
        tableLabel: 'Mesa 01',
        status: ComandaStatus.OPEN,
        currentEmployeeId: 'emp-1',
        subtotalAmount: 120,
        discountAmount: 10,
        serviceFeeAmount: 5,
        totalAmount: 115,
        items: [{ quantity: 2 }, { quantity: 1 }],
      },
      new Date(2026, 2, 30),
      {
        requiresKitchenRefresh: true,
      },
    )

    expect(realtimeService.publishComandaUpdated).toHaveBeenCalledTimes(1)
    expect(realtimeService.publishComandaUpdated.mock.calls[0][0]).toBe(auth)
    expect(realtimeService.publishComandaUpdated.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        comandaId: 'comanda-1',
        requiresKitchenRefresh: true,
      }),
    )
  })

  it('emite replaceKitchenItems enxuto para replaceComanda sem snapshot completo', () => {
    ;(service as any).publishComandaUpdatedRealtime(
      auth,
      {
        id: 'comanda-1',
        tableLabel: 'Mesa 01',
        status: ComandaStatus.IN_PREPARATION,
        currentEmployeeId: 'emp-1',
        subtotalAmount: 120,
        discountAmount: 10,
        serviceFeeAmount: 5,
        totalAmount: 115,
        items: [{ quantity: 2 }, { quantity: 1 }],
      },
      new Date(2026, 2, 30),
      {
        replaceKitchenItems: true,
        kitchenItems: [
          {
            itemId: 'item-1',
            comandaId: 'comanda-1',
            mesaLabel: 'Mesa 01',
            employeeId: 'emp-1',
            productName: 'Pizza',
            quantity: 2,
            notes: 'Sem cebola',
            kitchenStatus: 'READY',
            kitchenQueuedAt: '2026-03-30T10:01:00.000Z',
            kitchenReadyAt: '2026-03-30T10:10:00.000Z',
            businessDate: '2026-03-30',
          },
        ],
      },
    )

    expect(realtimeService.publishComandaUpdated).toHaveBeenCalledTimes(1)
    expect(realtimeService.publishComandaUpdated.mock.calls[0][0]).toBe(auth)
    expect(realtimeService.publishComandaUpdated.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        comandaId: 'comanda-1',
        replaceKitchenItems: true,
        kitchenItems: [
          expect.objectContaining({
            itemId: 'item-1',
            productName: 'Pizza',
            kitchenStatus: 'READY',
          }),
        ],
      }),
    )
    const payload = realtimeService.publishComandaUpdated.mock.calls[0][1]
    expect(payload).not.toHaveProperty('comanda')
  })

  it('emite comanda fechada com deltas mínimos e totais', () => {
    ;(service as any).publishComandaCloseRealtime({
      auth,
      comanda: {
        id: 'comanda-1',
        tableLabel: 'Mesa 01',
        currentEmployeeId: 'emp-1',
        subtotalAmount: 120,
        discountAmount: 10,
        serviceFeeAmount: 5,
        totalAmount: 115,
        closedAt: new Date('2026-03-30T11:00:00.000Z'),
        items: [{ quantity: 2 }, { quantity: 1 }],
      },
      refreshedSession: null,
      closure: {
        id: 'closure-1',
        status: 'CLOSED',
        createdAt: new Date('2026-03-30T08:00:00.000Z'),
        closedAt: new Date('2026-03-30T11:00:00.000Z'),
        expectedCashAmount: 100,
        grossRevenueAmount: 115,
        realizedProfitAmount: 30,
        countedCashAmount: 115,
        differenceAmount: 0,
        openComandasCount: 0,
        openSessionsCount: 0,
      } as any,
      businessDate: new Date(2026, 2, 30),
    })

    expect(realtimeService.publishComandaClosed).toHaveBeenCalledTimes(1)
    expect(realtimeService.publishComandaClosed.mock.calls[0][0]).toBe(auth)
    expect(realtimeService.publishComandaClosed.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        comandaId: 'comanda-1',
        mesaLabel: 'Mesa 01',
        closedAt: '2026-03-30T11:00:00.000Z',
        employeeId: 'emp-1',
        status: 'CLOSED',
        subtotal: 120,
        discountAmount: 10,
        serviceFeeAmount: 5,
        totalAmount: 115,
        totalItems: 3,
        paymentMethod: null,
        businessDate: '2026-03-30',
      }),
    )
    const payload = realtimeService.publishComandaClosed.mock.calls[0][1]
    expect(payload).not.toHaveProperty('comanda')
  })
})
