import { ConflictException, NotFoundException } from '@nestjs/common'
import { CashClosureStatus, CashSessionStatus, KitchenItemStatus } from '@prisma/client'
import type { CacheService } from '../src/common/services/cache.service'
import type { PrismaService } from '../src/database/prisma.service'
import type { AuthContext } from '../src/modules/auth/auth.types'
import type { AuditLogService } from '../src/modules/monitoring/audit-log.service'
import type { OperationsRealtimeService } from '../src/modules/operations-realtime/operations-realtime.service'
import { ComandaService } from '../src/modules/operations/comanda.service'
import type { OperationsHelpersService } from '../src/modules/operations/operations-helpers.service'
import { makeOwnerAuthContext } from './helpers/auth-context.factory'

describe('ComandaService helpers', () => {
  const prisma = {
    comanda: {
      findFirst: jest.fn(),
    },
    mesa: {
      findUnique: jest.fn(),
    },
  }

  const cache = {
    delByPrefix: jest.fn(async () => {}),
    del: jest.fn(async () => {}),
  }

  const auditLogService = {
    record: jest.fn(async () => {}),
  }

  const operationsRealtimeService = {
    publishComandaUpdated: jest.fn(),
    publishComandaClosed: jest.fn(),
    publishCashUpdated: jest.fn(),
    publishCashClosureUpdated: jest.fn(),
    publishKitchenItemQueued: jest.fn(),
    publishKitchenItemUpdated: jest.fn(),
  }

  const helpers = {
    assertOpenTableAvailability: jest.fn(async () => {}),
  }

  const service = new ComandaService(
    prisma as unknown as PrismaService,
    cache as unknown as CacheService,
    auditLogService as unknown as AuditLogService,
    operationsRealtimeService as unknown as OperationsRealtimeService,
    helpers as unknown as OperationsHelpersService,
  )

  const auth = makeOwnerAuthContext() as AuthContext

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('mapeia delta de cozinha para realtime com serializacao de datas', () => {
    const result = (service as any).buildKitchenItemRealtimeDelta(
      {
        id: 'comanda-1',
        tableLabel: 'Mesa 7',
        currentEmployeeId: 'emp-1',
      },
      {
        id: 'item-1',
        productName: 'Pizza',
        quantity: 2,
        notes: 'Sem cebola',
        kitchenStatus: KitchenItemStatus.IN_PREPARATION,
        kitchenQueuedAt: new Date('2026-04-01T10:00:00.000Z'),
        kitchenReadyAt: null,
      },
      new Date('2026-04-01T00:00:00.000Z'),
    )

    expect(result).toEqual(
      expect.objectContaining({
        comandaId: 'comanda-1',
        itemId: 'item-1',
        kitchenStatus: 'IN_PREPARATION',
      }),
    )
    expect(result.businessDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(result.kitchenQueuedAt).toBe('2026-04-01T10:00:00.000Z')
  })

  it('filtra apenas itens de cozinha ao montar deltas em lote', () => {
    const deltas = (service as any).buildKitchenItemRealtimeDeltas(
      {
        id: 'comanda-1',
        tableLabel: 'Mesa 3',
        currentEmployeeId: null,
        items: [
          {
            id: 'item-1',
            productName: 'Prato 1',
            quantity: 1,
            notes: null,
            kitchenStatus: KitchenItemStatus.QUEUED,
            kitchenQueuedAt: new Date('2026-04-01T09:00:00.000Z'),
            kitchenReadyAt: null,
          },
          {
            id: 'item-2',
            productName: 'Bebida',
            quantity: 1,
            notes: null,
            kitchenStatus: null,
            kitchenQueuedAt: null,
            kitchenReadyAt: null,
          },
        ],
      },
      new Date('2026-04-01T00:00:00.000Z'),
    )

    expect(deltas).toHaveLength(1)
    expect(deltas[0].itemId).toBe('item-1')
    expect(deltas[0].kitchenStatus).toBe('QUEUED')
  })

  it('preserva estado de cozinha quando item equivalente ja existia', () => {
    const existingItems = [
      {
        productId: 'prod-1',
        productName: 'Pizza',
        quantity: 2,
        unitPrice: 45,
        notes: 'sem cebola',
        kitchenStatus: KitchenItemStatus.READY,
        kitchenQueuedAt: new Date('2026-04-01T09:00:00.000Z'),
        kitchenReadyAt: new Date('2026-04-01T09:20:00.000Z'),
      },
    ]

    const state = (service as any).takeMatchingKitchenState(
      existingItems,
      {
        productId: 'prod-1',
        productName: 'Pizza',
        quantity: 2,
        unitPrice: 45,
        notes: 'sem cebola',
      },
      true,
      new Date('2026-04-01T09:30:00.000Z'),
    )

    expect(state.kitchenStatus).toBe(KitchenItemStatus.READY)
    expect(state.kitchenReadyAt).toEqual(new Date('2026-04-01T09:20:00.000Z'))
    expect(existingItems).toHaveLength(0)
  })

  it('marca item como queued quando nao existe correspondencia', () => {
    const fallbackQueuedAt = new Date('2026-04-01T09:30:00.000Z')
    const state = (service as any).takeMatchingKitchenState(
      [],
      {
        productId: null,
        productName: 'Item Manual',
        quantity: 1,
        unitPrice: 10,
        notes: null,
      },
      true,
      fallbackQueuedAt,
    )

    expect(state).toEqual({
      kitchenStatus: KitchenItemStatus.QUEUED,
      kitchenQueuedAt: fallbackQueuedAt,
      kitchenReadyAt: null,
    })
  })

  it('retorna null para estado de cozinha quando item nao exige cozinha', () => {
    const state = (service as any).takeMatchingKitchenState(
      [],
      {
        productId: null,
        productName: 'Suco',
        quantity: 1,
        unitPrice: 12,
        notes: null,
      },
      false,
      new Date('2026-04-01T09:30:00.000Z'),
    )

    expect(state).toEqual({
      kitchenStatus: null,
      kitchenQueuedAt: null,
      kitchenReadyAt: null,
    })
  })

  it('bloqueia mesa quando ja existe comanda aberta', async () => {
    prisma.comanda.findFirst.mockResolvedValueOnce({ id: 'comanda-open' })

    await expect((service as any).assertMesaAvailability('mesa-1')).rejects.toThrow(ConflictException)
  })

  it('resolve selecao de mesa por mesaId e valida disponibilidade', async () => {
    prisma.mesa.findUnique.mockResolvedValueOnce({
      id: 'mesa-7',
      label: 'Mesa 7',
      active: true,
      companyOwnerId: 'owner-1',
    })
    const mesaAvailabilitySpy = jest.spyOn(service as any, 'assertMesaAvailability').mockResolvedValue(undefined)

    const selection = await (service as any).resolveMesaSelection('owner-1', 'Mesa 7', 'mesa-7', 'comanda-1')

    expect(selection).toEqual({ mesaId: 'mesa-7', tableLabel: 'Mesa 7' })
    expect(helpers.assertOpenTableAvailability).toHaveBeenCalledWith(
      expect.anything(),
      'owner-1',
      'Mesa 7',
      'comanda-1',
    )
    expect(mesaAvailabilitySpy).toHaveBeenCalledWith('mesa-7', 'comanda-1')
  })

  it('falha quando mesaId refere mesa inativa ou de outro owner', async () => {
    prisma.mesa.findUnique.mockResolvedValueOnce({
      id: 'mesa-9',
      label: 'Mesa 9',
      active: false,
      companyOwnerId: 'owner-1',
    })

    await expect((service as any).resolveMesaSelection('owner-1', 'Mesa 9', 'mesa-9')).rejects.toThrow(
      NotFoundException,
    )
  })

  it('publica evento de comanda atualizada com mapeamento de status e kitchenItems', () => {
    ;(service as any).publishComandaUpdatedRealtime(
      auth,
      {
        id: 'comanda-1',
        tableLabel: 'Mesa 2',
        status: 'READY',
        currentEmployeeId: 'emp-1',
        subtotalAmount: 100,
        discountAmount: 5,
        serviceFeeAmount: 10,
        totalAmount: 105,
        items: [{ quantity: 2 }, { quantity: 1 }],
      },
      new Date('2026-04-01T00:00:00.000Z'),
      {
        requiresKitchenRefresh: true,
        replaceKitchenItems: true,
        kitchenItems: [
          {
            itemId: 'item-1',
            comandaId: 'comanda-1',
            mesaLabel: 'Mesa 2',
            employeeId: 'emp-1',
            productName: 'Pizza',
            quantity: 1,
            notes: null,
            kitchenStatus: 'READY',
            kitchenQueuedAt: null,
            kitchenReadyAt: null,
            businessDate: '2026-04-01',
          },
        ],
      },
    )

    expect(operationsRealtimeService.publishComandaUpdated).toHaveBeenCalledWith(
      auth,
      expect.objectContaining({
        comandaId: 'comanda-1',
        status: 'READY',
        totalItems: 3,
        requiresKitchenRefresh: true,
        replaceKitchenItems: true,
      }),
    )
  })

  it('publica fechamento de comanda com cash update e cash closure', () => {
    ;(service as any).publishComandaCloseRealtime(
      auth,
      {
        id: 'comanda-1',
        tableLabel: 'Mesa 5',
        currentEmployeeId: 'emp-1',
        subtotalAmount: 120,
        discountAmount: 10,
        serviceFeeAmount: 5,
        totalAmount: 115,
        closedAt: new Date('2026-04-01T11:30:00.000Z'),
        items: [{ quantity: 2 }],
      },
      {
        id: 'cash-1',
        status: CashSessionStatus.OPEN,
        openingCashAmount: 200,
        countedCashAmount: null,
        expectedCashAmount: 315,
        differenceAmount: null,
        movements: [{ type: 'SUPPLY', amount: 50 }],
      },
      {
        id: 'closure-1',
        status: CashClosureStatus.CLOSED,
        createdAt: new Date('2026-04-01T08:00:00.000Z'),
        closedAt: new Date('2026-04-01T23:00:00.000Z'),
        expectedCashAmount: 315,
        grossRevenueAmount: 500,
        realizedProfitAmount: 200,
        countedCashAmount: 315,
        differenceAmount: 0,
        openComandasCount: 0,
        openSessionsCount: 0,
      } as any,
      new Date('2026-04-01T00:00:00.000Z'),
    )

    expect(operationsRealtimeService.publishComandaClosed).toHaveBeenCalledWith(
      auth,
      expect.objectContaining({ comandaId: 'comanda-1', status: 'CLOSED' }),
    )
    const closedPayload = operationsRealtimeService.publishComandaClosed.mock.calls[0][1]
    expect(closedPayload.businessDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(operationsRealtimeService.publishCashUpdated).toHaveBeenCalledWith(
      auth,
      expect.objectContaining({ cashSessionId: 'cash-1', status: 'OPEN' }),
    )
    expect(operationsRealtimeService.publishCashClosureUpdated).toHaveBeenCalledWith(
      auth,
      expect.objectContaining({ closureId: 'closure-1', status: 'CLOSED' }),
    )
  })
})
