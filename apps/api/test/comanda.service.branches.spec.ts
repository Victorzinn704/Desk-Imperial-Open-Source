/**
 * @file comanda.service.branches.spec.ts
 * @module Operations/Comanda
 *
 * Cobre caminhos felizes e efeitos colaterais de comanda (cozinha, caixa, cache e realtime),
 * servindo como referencia de comportamento para contribuidores externos.
 */

import { ComandaStatus, KitchenItemStatus, Prisma } from '@prisma/client'
import type { CacheService } from '../src/common/services/cache.service'
import type { PrismaService } from '../src/database/prisma.service'
import type { AuditLogService } from '../src/modules/monitoring/audit-log.service'
import type { OperationsRealtimeService } from '../src/modules/operations-realtime/operations-realtime.service'
import { ComandaService } from '../src/modules/operations/comanda.service'
import type { OperationsHelpersService } from '../src/modules/operations/operations-helpers.service'
import type { FinanceService } from '../src/modules/finance/finance.service'
import { makeOwnerAuthContext } from './helpers/auth-context.factory'
import { makeRequestContext } from './helpers/request-context.factory'

describe('ComandaService branch happy paths', () => {
  function makeComanda(overrides: Record<string, unknown> = {}) {
    return {
      id: 'comanda-1',
      companyOwnerId: 'owner-1',
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
      items: [
        {
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
        },
      ],
      ...overrides,
    }
  }

  function createSetup() {
    const prisma = {
      product: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      comanda: {
        findFirst: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
      comandaItem: {
        create: jest.fn(),
        createMany: jest.fn(),
        deleteMany: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      comandaAssignment: {
        updateMany: jest.fn(),
        create: jest.fn(),
      },
      comandaPayment: {
        aggregate: jest.fn(),
        create: jest.fn(),
      },
      cashSession: {
        findFirst: jest.fn(),
      },
      mesa: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(),
    }

    type TransactionClient = {
      product: typeof prisma.product
      comanda: typeof prisma.comanda
      comandaItem: typeof prisma.comandaItem
      comandaAssignment: typeof prisma.comandaAssignment
      comandaPayment: typeof prisma.comandaPayment
    }

    prisma.$transaction.mockImplementation(async (callback: (tx: TransactionClient) => Promise<unknown>) =>
      callback({
        product: prisma.product,
        comanda: prisma.comanda,
        comandaItem: prisma.comandaItem,
        comandaAssignment: prisma.comandaAssignment,
        comandaPayment: prisma.comandaPayment,
      }),
    )

    const cache = {
      delByPrefix: jest.fn(async () => {}),
      del: jest.fn(async () => {}),
    }

    const audit = {
      record: jest.fn(async () => {}),
    }

    const realtime = {
      publishComandaOpened: jest.fn(),
      publishComandaUpdated: jest.fn(),
      publishComandaClosed: jest.fn(),
      publishCashUpdated: jest.fn(),
      publishCashClosureUpdated: jest.fn(),
      publishKitchenItemQueued: jest.fn(),
      publishKitchenItemUpdated: jest.fn(),
    }

    const helpers = {
      resolveEmployeeForStaff: jest.fn(async () => null),
      requireAuthorizedComanda: jest.fn(),
      requireOwnedComanda: jest.fn(),
      requireOwnedEmployee: jest.fn(),
      resolveComandaBusinessDate: jest.fn(),
      recalculateComanda: jest.fn(),
      resolveComandaDraftItems: jest.fn(),
      assertDraftSelectionsStockAvailability: jest.fn(async () => {}),
      assertOpenTableAvailability: jest.fn(async () => {}),
      assertBusinessDayOpen: jest.fn(async () => {}),
      syncCashClosure: jest.fn(),
      recalculateCashSession: jest.fn(),
      ensureOrderForClosedComanda: jest.fn(async () => {}),
      buildLiveSnapshot: jest.fn(async () => ({ marker: 'live' })),
    }

    const finance = {
      invalidateAndWarmSummary: jest.fn(async () => {}),
    }

    const service = new ComandaService(
      prisma as unknown as PrismaService,
      cache as unknown as CacheService,
      audit as unknown as AuditLogService,
      realtime as unknown as OperationsRealtimeService,
      helpers as unknown as OperationsHelpersService,
      finance as unknown as FinanceService,
    )

    return {
      service,
      prisma,
      cache,
      audit,
      realtime,
      helpers,
      finance,
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('adiciona item de catalogo e publica evento para cozinha', async () => {
    const { service, prisma, helpers, realtime } = createSetup()
    helpers.requireAuthorizedComanda.mockResolvedValue(makeComanda())
    prisma.product.findFirst.mockResolvedValue({
      id: 'product-1',
      name: 'Pizza',
      unitPrice: 30,
      requiresKitchen: false,
      category: 'pizza',
    })
    prisma.comandaItem.create.mockResolvedValue({
      id: 'item-1',
      productName: 'Pizza',
      quantity: 2,
      notes: 'sem cebola',
      kitchenStatus: KitchenItemStatus.QUEUED,
      kitchenQueuedAt: new Date('2026-04-01T10:05:00.000Z'),
      kitchenReadyAt: null,
    })
    helpers.recalculateComanda.mockResolvedValue(
      makeComanda({
        subtotalAmount: 160,
        totalAmount: 160,
        items: [
          {
            id: 'item-1',
            productName: 'Pizza',
            quantity: 2,
            notes: 'sem cebola',
            kitchenStatus: KitchenItemStatus.QUEUED,
            kitchenQueuedAt: new Date('2026-04-01T10:05:00.000Z'),
            kitchenReadyAt: null,
          },
        ],
      }),
    )
    helpers.resolveComandaBusinessDate.mockResolvedValue(new Date('2026-04-01T00:00:00.000Z'))

    const payload: Parameters<ComandaService['addComandaItem']>[2] = {
      productId: 'product-1',
      quantity: 2,
      notes: 'sem cebola',
    }

    const result = await service.addComandaItem(
      makeOwnerAuthContext({ workspaceOwnerUserId: 'owner-1' }),
      'comanda-1',
      payload,
      makeRequestContext(),
      { includeSnapshot: false },
    )

    expect(result.comanda.id).toBe('comanda-1')
    expect(realtime.publishKitchenItemQueued).toHaveBeenCalledTimes(1)
    expect(realtime.publishComandaUpdated).toHaveBeenCalledTimes(1)
    expect(prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ isolationLevel: Prisma.TransactionIsolationLevel.Serializable }),
    )
  })

  it('adiciona itens em lote e publica replaceKitchenItems no realtime', async () => {
    const { service, prisma, helpers, realtime } = createSetup()
    helpers.requireAuthorizedComanda.mockResolvedValue(makeComanda())
    prisma.product.findMany.mockResolvedValue([
      {
        id: 'product-1',
        name: 'Pizza',
        unitPrice: 50,
        requiresKitchen: true,
        category: 'pizza',
      },
    ])

    prisma.comandaItem.createMany.mockResolvedValue({ count: 2 })
    prisma.comandaItem.findMany.mockResolvedValue([
      {
        id: 'item-1',
        productId: 'product-1',
        productName: 'Pizza',
        quantity: 2,
        unitPrice: 50,
        totalAmount: 100,
        notes: null,
        kitchenStatus: KitchenItemStatus.QUEUED,
        kitchenQueuedAt: new Date('2026-04-01T10:10:00.000Z'),
        kitchenReadyAt: null,
      },
      {
        id: 'item-2',
        productId: null,
        productName: 'Suco',
        quantity: 2,
        unitPrice: 20,
        totalAmount: 40,
        notes: null,
        kitchenStatus: null,
        kitchenQueuedAt: null,
        kitchenReadyAt: null,
      },
    ])

    helpers.recalculateComanda.mockResolvedValue(
      makeComanda({
        subtotalAmount: 140,
        totalAmount: 140,
        items: [
          {
            id: 'item-1',
            productId: 'product-1',
            productName: 'Pizza',
            quantity: 2,
            unitPrice: 50,
            totalAmount: 100,
            notes: null,
            kitchenStatus: KitchenItemStatus.QUEUED,
            kitchenQueuedAt: new Date('2026-04-01T10:10:00.000Z'),
            kitchenReadyAt: null,
          },
          {
            id: 'item-2',
            productId: null,
            productName: 'Suco',
            quantity: 2,
            unitPrice: 20,
            totalAmount: 40,
            notes: null,
            kitchenStatus: null,
            kitchenQueuedAt: null,
            kitchenReadyAt: null,
          },
        ],
      }),
    )
    helpers.resolveComandaBusinessDate.mockResolvedValue(new Date('2026-04-01T00:00:00.000Z'))

    const payload: Parameters<ComandaService['addComandaItems']>[2] = {
      items: [
        {
          productId: 'product-1',
          quantity: 2,
        },
        {
          productName: 'Suco',
          unitPrice: 20,
          quantity: 2,
        },
      ],
    }

    await service.addComandaItems(
      makeOwnerAuthContext({ workspaceOwnerUserId: 'owner-1' }),
      'comanda-1',
      payload,
      makeRequestContext(),
      { includeSnapshot: false },
    )

    expect(realtime.publishComandaUpdated).toHaveBeenCalledTimes(1)
    expect(realtime.publishComandaUpdated.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        replaceKitchenItems: true,
      }),
    )
    expect(realtime.publishKitchenItemQueued).toHaveBeenCalledTimes(1)
  })

  it('substitui comanda preservando estado de cozinha de item equivalente', async () => {
    const { service, prisma, helpers, realtime } = createSetup()
    helpers.requireAuthorizedComanda.mockResolvedValue(
      makeComanda({
        discountAmount: 10,
        serviceFeeAmount: 5,
        items: [
          {
            id: 'item-old',
            productId: 'product-1',
            productName: 'Pizza',
            quantity: 1,
            unitPrice: 100,
            totalAmount: 100,
            notes: 'sem cebola',
            kitchenStatus: KitchenItemStatus.READY,
            kitchenQueuedAt: new Date('2026-04-01T10:00:00.000Z'),
            kitchenReadyAt: new Date('2026-04-01T10:12:00.000Z'),
          },
        ],
      }),
    )
    helpers.resolveComandaDraftItems.mockResolvedValue([
      {
        productId: 'product-1',
        productName: 'Pizza',
        quantity: 1,
        requiresKitchen: true,
        unitPrice: 100,
        totalAmount: 100,
        notes: 'sem cebola',
      },
    ])
    prisma.mesa.findUnique.mockResolvedValue({
      id: 'mesa-1',
      label: 'Mesa 1',
      active: true,
      companyOwnerId: 'owner-1',
    })
    prisma.comanda.findFirst.mockResolvedValue(null)
    prisma.product.findMany.mockResolvedValue([
      {
        id: 'product-1',
        category: 'pizza',
        requiresKitchen: true,
      },
    ])
    helpers.recalculateComanda.mockResolvedValue(makeComanda())
    helpers.resolveComandaBusinessDate.mockResolvedValue(new Date('2026-04-01T00:00:00.000Z'))

    const payload: Parameters<ComandaService['replaceComanda']>[2] = {
      mesaId: 'mesa-1',
      tableLabel: 'Mesa 1',
      items: [{ productId: 'product-1', quantity: 1 }],
    }

    await service.replaceComanda(
      makeOwnerAuthContext({ workspaceOwnerUserId: 'owner-1' }),
      'comanda-1',
      payload,
      makeRequestContext(),
      { includeSnapshot: false },
    )

    expect(prisma.comandaItem.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            kitchenStatus: KitchenItemStatus.READY,
          }),
        ],
      }),
    )
    expect(prisma.product.findMany).not.toHaveBeenCalled()
    expect(realtime.publishComandaUpdated).toHaveBeenCalledTimes(1)
    expect(realtime.publishComandaUpdated.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        replaceKitchenItems: true,
      }),
    )
  })

  it('atribui comanda para funcionario com caixa aberto', async () => {
    const { service, prisma, helpers, realtime } = createSetup()
    helpers.requireOwnedComanda.mockResolvedValue(makeComanda())
    helpers.resolveComandaBusinessDate.mockResolvedValue(new Date('2026-04-01T00:00:00.000Z'))
    helpers.requireOwnedEmployee.mockResolvedValue({ id: 'employee-1' })
    prisma.cashSession.findFirst.mockResolvedValue({
      id: 'cash-open-1',
    })
    prisma.comanda.update.mockResolvedValue(
      makeComanda({
        currentEmployeeId: 'employee-1',
        cashSessionId: 'cash-open-1',
      }),
    )

    await service.assignComanda(
      makeOwnerAuthContext({ workspaceOwnerUserId: 'owner-1' }),
      'comanda-1',
      {
        employeeId: 'employee-1',
      },
      makeRequestContext(),
      { includeSnapshot: false },
    )

    expect(prisma.comanda.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          currentEmployeeId: 'employee-1',
          cashSessionId: 'cash-open-1',
        }),
      }),
    )
    expect(realtime.publishComandaUpdated).toHaveBeenCalledTimes(1)
  })

  it('cancela comanda e publica atualizacao de cash closure', async () => {
    const { service, prisma, helpers, realtime } = createSetup()
    helpers.requireAuthorizedComanda.mockResolvedValue(makeComanda())
    prisma.comanda.update.mockResolvedValue(
      makeComanda({
        status: ComandaStatus.CANCELLED,
      }),
    )
    helpers.resolveComandaBusinessDate.mockResolvedValue(new Date('2026-04-01T00:00:00.000Z'))
    helpers.syncCashClosure.mockResolvedValue({
      id: 'closure-1',
      status: 'OPEN',
      expectedCashAmount: 100,
      countedCashAmount: null,
      differenceAmount: null,
      grossRevenueAmount: 100,
      realizedProfitAmount: 30,
      openSessionsCount: 1,
      openComandasCount: 0,
      createdAt: new Date('2026-04-01T08:00:00.000Z'),
      closedAt: null,
    })

    await service.updateComandaStatus(
      makeOwnerAuthContext({ workspaceOwnerUserId: 'owner-1' }),
      'comanda-1',
      {
        status: ComandaStatus.CANCELLED,
      },
      makeRequestContext(),
      { includeSnapshot: false },
    )

    expect(realtime.publishComandaUpdated).toHaveBeenCalledTimes(1)
    expect(realtime.publishCashClosureUpdated).toHaveBeenCalledTimes(1)
  })

  it('atualiza item de cozinha para READY e reflete status da comanda', async () => {
    const { service, prisma, helpers, realtime } = createSetup()
    prisma.comandaItem.findUnique.mockResolvedValue({
      id: 'item-1',
      kitchenStatus: KitchenItemStatus.QUEUED,
      kitchenQueuedAt: new Date('2026-04-01T10:00:00.000Z'),
      kitchenReadyAt: null,
      comanda: {
        id: 'comanda-1',
        companyOwnerId: 'owner-1',
        tableLabel: 'Mesa 1',
        status: ComandaStatus.OPEN,
        cashSessionId: 'cash-1',
        openedAt: new Date('2026-04-01T10:00:00.000Z'),
      },
    })
    prisma.comandaItem.update.mockResolvedValue({
      id: 'item-1',
      productName: 'Pizza',
      quantity: 1,
      notes: null,
      kitchenStatus: KitchenItemStatus.READY,
      kitchenQueuedAt: new Date('2026-04-01T10:00:00.000Z'),
      kitchenReadyAt: new Date('2026-04-01T10:15:00.000Z'),
    })
    prisma.comandaItem.findMany.mockResolvedValue([
      { kitchenStatus: KitchenItemStatus.READY },
      { kitchenStatus: KitchenItemStatus.DELIVERED },
    ])
    prisma.comanda.update.mockResolvedValue(
      makeComanda({
        status: ComandaStatus.READY,
      }),
    )
    helpers.resolveComandaBusinessDate.mockResolvedValue(new Date('2026-04-01T00:00:00.000Z'))

    const payload: Parameters<ComandaService['updateKitchenItemStatus']>[2] = {
      status: 'READY',
    }

    const result = await service.updateKitchenItemStatus(
      makeOwnerAuthContext({ workspaceOwnerUserId: 'owner-1' }),
      'item-1',
      payload,
      makeRequestContext(),
    )

    expect(result).toEqual({ itemId: 'item-1', status: 'READY' })
    expect(realtime.publishKitchenItemUpdated).toHaveBeenCalledTimes(1)
    expect(realtime.publishComandaUpdated).toHaveBeenCalledTimes(1)
  })

  it('fecha comanda, sincroniza caixa e publica eventos financeiros', async () => {
    const { service, prisma, helpers, realtime, cache, finance } = createSetup()
    helpers.requireAuthorizedComanda.mockResolvedValue(makeComanda())
    helpers.recalculateComanda.mockResolvedValue(makeComanda({ totalAmount: 120 }))
    prisma.comandaPayment.aggregate.mockResolvedValue({
      _sum: {
        amount: 0,
      },
    })
    prisma.comandaPayment.create.mockResolvedValue({
      id: 'payment-1',
      amount: 120,
      status: 'CONFIRMED',
    })
    prisma.comanda.update.mockResolvedValue(
      makeComanda({
        status: ComandaStatus.CLOSED,
        totalAmount: 120,
        closedAt: new Date('2026-04-01T11:00:00.000Z'),
      }),
    )
    prisma.comanda.findUnique.mockResolvedValue(
      makeComanda({
        status: ComandaStatus.CLOSED,
        totalAmount: 120,
        closedAt: new Date('2026-04-01T11:00:00.000Z'),
        payments: [
          {
            id: 'payment-1',
            amount: 120,
            status: 'CONFIRMED',
            paidAt: new Date('2026-04-01T11:00:00.000Z'),
          },
        ],
      }),
    )
    helpers.resolveComandaBusinessDate.mockResolvedValue(new Date('2026-04-01T00:00:00.000Z'))
    helpers.recalculateCashSession.mockResolvedValue({
      id: 'cash-1',
      status: 'OPEN',
      openingCashAmount: 200,
      countedCashAmount: null,
      expectedCashAmount: 320,
      differenceAmount: null,
      movements: [],
    })
    helpers.syncCashClosure.mockResolvedValue({
      id: 'closure-1',
      status: 'OPEN',
      expectedCashAmount: 320,
      countedCashAmount: null,
      differenceAmount: null,
      grossRevenueAmount: 320,
      realizedProfitAmount: 120,
      openComandasCount: 0,
      openSessionsCount: 1,
      createdAt: new Date('2026-04-01T08:00:00.000Z'),
      closedAt: null,
    })

    await service.closeComanda(
      makeOwnerAuthContext({ workspaceOwnerUserId: 'owner-1' }),
      'comanda-1',
      {
        discountAmount: 5,
        serviceFeeAmount: 10,
      },
      makeRequestContext(),
      { includeSnapshot: false },
    )

    expect(helpers.ensureOrderForClosedComanda).toHaveBeenCalledTimes(1)
    expect(realtime.publishComandaClosed).toHaveBeenCalledTimes(1)
    expect(realtime.publishCashUpdated).toHaveBeenCalledTimes(1)
    expect(realtime.publishCashClosureUpdated).toHaveBeenCalledTimes(1)
    expect(cache.del).toHaveBeenCalledTimes(1)
    expect(finance.invalidateAndWarmSummary).toHaveBeenCalledWith('owner-1')
  })

  it('fecha comanda sem criar pagamento final quando o saldo ja esta quitado', async () => {
    const { service, prisma, helpers } = createSetup()
    helpers.requireAuthorizedComanda.mockResolvedValue(makeComanda())
    helpers.recalculateComanda.mockResolvedValue(makeComanda({ totalAmount: 120 }))
    prisma.comandaPayment.aggregate.mockResolvedValue({
      _sum: {
        amount: 120,
      },
    })
    prisma.comanda.update.mockResolvedValue(
      makeComanda({
        status: ComandaStatus.CLOSED,
        totalAmount: 120,
        closedAt: new Date('2026-04-01T11:00:00.000Z'),
      }),
    )
    prisma.comanda.findUnique.mockResolvedValue(
      makeComanda({
        status: ComandaStatus.CLOSED,
        totalAmount: 120,
        closedAt: new Date('2026-04-01T11:00:00.000Z'),
        payments: [
          {
            id: 'payment-1',
            amount: 120,
            status: 'CONFIRMED',
            paidAt: new Date('2026-04-01T11:00:00.000Z'),
          },
        ],
      }),
    )
    helpers.resolveComandaBusinessDate.mockResolvedValue(new Date('2026-04-01T00:00:00.000Z'))
    helpers.recalculateCashSession.mockResolvedValue({
      id: 'cash-1',
      status: 'OPEN',
      openingCashAmount: 200,
      countedCashAmount: null,
      expectedCashAmount: 320,
      differenceAmount: null,
      movements: [],
    })
    helpers.syncCashClosure.mockResolvedValue({
      id: 'closure-1',
      status: 'OPEN',
      expectedCashAmount: 320,
      countedCashAmount: null,
      differenceAmount: null,
      grossRevenueAmount: 320,
      realizedProfitAmount: 120,
      openComandasCount: 0,
      openSessionsCount: 1,
      createdAt: new Date('2026-04-01T08:00:00.000Z'),
      closedAt: null,
    })

    await service.closeComanda(
      makeOwnerAuthContext({ workspaceOwnerUserId: 'owner-1' }),
      'comanda-1',
      {
        discountAmount: 5,
        serviceFeeAmount: 10,
      },
      makeRequestContext(),
      { includeSnapshot: false },
    )

    expect(prisma.comandaPayment.create).not.toHaveBeenCalled()
  })
})
