import { CashSessionStatus, ComandaStatus, KitchenItemStatus } from '@prisma/client'
import { CacheService } from '../src/common/services/cache.service'
import { ComandaService } from '../src/modules/operations/comanda.service'
import type { PrismaService } from '../src/database/prisma.service'
import type { AuditLogService } from '../src/modules/monitoring/audit-log.service'
import type { OperationsRealtimeService } from '../src/modules/operations-realtime/operations-realtime.service'
import type { OperationsHelpersService } from '../src/modules/operations/operations-helpers.service'

describe('ComandaService - openComanda realtime', () => {
  const realtimeService = {
    publishComandaOpened: jest.fn(),
    publishKitchenItemQueued: jest.fn(),
    publishComandaUpdated: jest.fn(),
    publishComandaClosed: jest.fn(),
    publishKitchenItemUpdated: jest.fn(),
    publishCashUpdated: jest.fn(),
    publishCashClosureUpdated: jest.fn(),
  }

  const auditLogService = {
    record: jest.fn(async () => {}),
  }

  const cache = {
    delByPrefix: jest.fn(async () => {}),
    del: jest.fn(async () => {}),
    get: jest.fn(),
    set: jest.fn(),
  }

  const helpers = {
    resolveComandaDraftItems: jest.fn(),
    assertBusinessDayOpen: jest.fn(async () => {}),
    assertOpenTableAvailability: jest.fn(async () => {}),
    resolveEmployeeForStaff: jest.fn(async () => null),
    resolveOwnedCashSession: jest.fn(),
    requireOwnedEmployee: jest.fn(),
    recalculateComanda: jest.fn(),
    resolveComandaBusinessDate: jest.fn(async (_tx: unknown, comanda: { openedAt: Date }) => comanda.openedAt),
  }

  function createPrismaMock() {
    const queuedItems: Array<{
      id: string
      comandaId: string
      productName: string
      quantity: number
      notes: string | null
      kitchenStatus: KitchenItemStatus | null
      kitchenQueuedAt: Date | null
      kitchenReadyAt: Date | null
    }> = []

    const tx = {
      comanda: {
        create: jest.fn(async ({ data }: any) => ({
          id: 'comanda-1',
          ...data,
        })),
      },
      product: {
        findMany: jest.fn(async () => [
          {
            id: 'product-1',
            category: 'food',
            requiresKitchen: true,
          },
        ]),
      },
      comandaItem: {
        createMany: jest.fn(async ({ data }: any) => {
          data.forEach((item: any, index: number) => {
            if (item.kitchenStatus) {
              queuedItems.push({
                id: `item-${index + 1}`,
                comandaId: item.comandaId,
                productName: item.productName,
                quantity: item.quantity,
                notes: item.notes ?? null,
                kitchenStatus: item.kitchenStatus,
                kitchenQueuedAt: item.kitchenQueuedAt ?? null,
                kitchenReadyAt: null,
              })
            }
          })
          return { count: data.length }
        }),
        findMany: jest.fn(async ({ where }: any) => {
          return queuedItems.filter((item) => {
            if (where?.comandaId && item.comandaId !== where.comandaId) {
              return false
            }
            if (where?.kitchenStatus?.not !== undefined && item.kitchenStatus === null) {
              return false
            }
            return true
          })
        }),
      },
      comandaAssignment: {
        create: jest.fn(async () => ({})),
      },
    }

    return {
      mesa: {
        findUnique: jest.fn(async () => ({
          id: 'mesa-1',
          label: 'Mesa 1',
          active: true,
          companyOwnerId: 'owner-1',
        })),
      },
      comanda: {
        findFirst: jest.fn(async () => null),
      },
      cashSession: {
        findFirst: jest.fn(async () => ({
          id: 'session-1',
          businessDate: new Date(2026, 2, 30),
          status: CashSessionStatus.OPEN,
        })),
      },
      product: {
        findMany: tx.product.findMany,
      },
      comandaItem: {
        createMany: tx.comandaItem.createMany,
        findMany: tx.comandaItem.findMany,
      },
      comandaAssignment: {
        create: tx.comandaAssignment.create,
      },
      $transaction: jest.fn(async (callback: any) => callback(tx)),
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('publica kitchen.item.queued na abertura quando há itens que entram na cozinha', async () => {
    const prisma = createPrismaMock()
    const service = new ComandaService(
      prisma as unknown as PrismaService,
      cache as unknown as CacheService,
      auditLogService as unknown as AuditLogService,
      realtimeService as unknown as OperationsRealtimeService,
      helpers as unknown as OperationsHelpersService,
    )

    ;(helpers.resolveComandaDraftItems as jest.Mock).mockResolvedValue([
      {
        productId: 'product-1',
        productName: 'Pizza',
        quantity: 2,
        unitPrice: 10,
        totalAmount: 20,
        notes: 'Sem cebola',
      },
    ])
    ;(helpers.recalculateComanda as jest.Mock).mockResolvedValue({
      id: 'comanda-1',
      companyOwnerId: 'owner-1',
      cashSessionId: 'session-1',
      mesaId: 'mesa-1',
      currentEmployeeId: null,
      tableLabel: 'Mesa 1',
      customerName: 'Cliente',
      customerDocument: null,
      participantCount: 2,
      status: ComandaStatus.OPEN,
      subtotalAmount: 20,
      discountAmount: 0,
      serviceFeeAmount: 0,
      totalAmount: 20,
      notes: null,
      openedAt: new Date('2026-03-30T10:00:00.000Z'),
      closedAt: null,
      items: [
        {
          id: 'item-1',
          productName: 'Pizza',
          quantity: 2,
          notes: 'Sem cebola',
          kitchenStatus: KitchenItemStatus.QUEUED,
          kitchenQueuedAt: new Date('2026-03-30T10:00:00.000Z'),
          kitchenReadyAt: null,
        },
      ],
    })

    await service.openComanda(
      {
        userId: 'user-1',
        role: 'OWNER',
        workspaceOwnerUserId: 'owner-1',
        companyOwnerUserId: 'owner-1',
      } as any,
      {
        tableLabel: 'Mesa 1',
        participantCount: 2,
        items: [{ productId: 'product-1', quantity: 2 }],
      } as any,
      { ipAddress: '127.0.0.1', userAgent: 'jest' } as any,
      { includeSnapshot: false } as any,
    )

    expect(realtimeService.publishComandaOpened).toHaveBeenCalledTimes(1)
    expect(realtimeService.publishKitchenItemQueued).toHaveBeenCalledTimes(1)
    expect(realtimeService.publishKitchenItemQueued).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        itemId: 'item-1',
        comandaId: 'comanda-1',
        mesaLabel: 'Mesa 1',
        employeeId: null,
        productName: 'Pizza',
        quantity: 2,
        notes: 'Sem cebola',
        kitchenStatus: 'QUEUED',
        kitchenQueuedAt: expect.any(String),
        kitchenReadyAt: null,
        businessDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      }),
    )
  })
})
