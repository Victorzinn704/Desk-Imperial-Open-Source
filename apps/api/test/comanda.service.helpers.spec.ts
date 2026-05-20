import { ConflictException, NotFoundException } from '@nestjs/common'
import { CashClosureStatus, CashSessionStatus, KitchenItemStatus } from '@prisma/client'
import type { PrismaService } from '../src/database/prisma.service'
import { takeMatchingKitchenState } from '../src/modules/operations/comanda-kitchen.utils'
import { assertMesaAvailability, resolveMesaSelection } from '../src/modules/operations/comanda-mesa.utils'
import {
  buildKitchenItemRealtimeDelta,
  buildKitchenItemRealtimeDeltas,
} from '../src/modules/operations/comanda-realtime-publish.utils'
import type { OperationsHelpersService } from '../src/modules/operations/operations-helpers.service'
import { makeOwnerAuth } from './helpers/comanda-service-fixtures'
import { createPublisherTestEnv, makePublishedComanda } from './helpers/publisher-test-env'

const HELPER_BUSINESS_DATE = new Date('2026-04-01T00:00:00.000Z')
const HELPER_KITCHEN_QUEUED_AT = new Date('2026-04-01T10:00:00.000Z')

describe('ComandaService helpers — pure functions', () => {
  it('mapeia delta de cozinha para realtime com serializacao de datas', () => {
    const result = buildKitchenItemRealtimeDelta(
      { id: 'comanda-1', tableLabel: 'Mesa 7', currentEmployeeId: 'emp-1' } as never,
      {
        id: 'item-1',
        productName: 'Pizza',
        quantity: 2,
        notes: 'Sem cebola',
        kitchenStatus: KitchenItemStatus.IN_PREPARATION,
        kitchenQueuedAt: HELPER_KITCHEN_QUEUED_AT,
        kitchenReadyAt: null,
      },
      HELPER_BUSINESS_DATE,
    )

    expect(result).toEqual(
      expect.objectContaining({ comandaId: 'comanda-1', itemId: 'item-1', kitchenStatus: 'IN_PREPARATION' }),
    )
    expect(result.businessDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(result.kitchenQueuedAt).toBe('2026-04-01T10:00:00.000Z')
  })

  it('filtra apenas itens de cozinha ao montar deltas em lote', () => {
    const deltas = buildKitchenItemRealtimeDeltas(
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
      } as never,
      HELPER_BUSINESS_DATE,
    )

    expect(deltas).toHaveLength(1)
    expect(deltas[0]).toEqual(expect.objectContaining({ itemId: 'item-1', kitchenStatus: 'QUEUED' }))
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

    const state = takeMatchingKitchenState(
      existingItems,
      { productId: 'prod-1', productName: 'Pizza', quantity: 2, unitPrice: 45, notes: 'sem cebola' },
      true,
      new Date('2026-04-01T09:30:00.000Z'),
    )

    expect(state.kitchenStatus).toBe(KitchenItemStatus.READY)
    expect(state.kitchenReadyAt).toEqual(new Date('2026-04-01T09:20:00.000Z'))
    expect(existingItems).toHaveLength(0)
  })

  it('marca item como queued quando nao existe correspondencia', () => {
    const fallbackQueuedAt = new Date('2026-04-01T09:30:00.000Z')
    const state = takeMatchingKitchenState(
      [],
      { productId: null, productName: 'Item Manual', quantity: 1, unitPrice: 10, notes: null },
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
    const state = takeMatchingKitchenState(
      [],
      { productId: null, productName: 'Suco', quantity: 1, unitPrice: 12, notes: null },
      false,
      new Date('2026-04-01T09:30:00.000Z'),
    )

    expect(state).toEqual({ kitchenStatus: null, kitchenQueuedAt: null, kitchenReadyAt: null })
  })
})

describe('ComandaService helpers — mesa resolution', () => {
  const prisma = {
    comanda: { findFirst: jest.fn() },
    mesa: { findMany: jest.fn(), findUnique: jest.fn() },
  }
  const helpers = { assertOpenTableAvailability: jest.fn(async () => {}) }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('bloqueia mesa quando ja existe comanda aberta', async () => {
    prisma.comanda.findFirst.mockResolvedValueOnce({ id: 'comanda-open' })

    await expect(assertMesaAvailability(prisma as unknown as PrismaService, 'mesa-1')).rejects.toThrow(
      ConflictException,
    )
  })

  it('resolve selecao de mesa por mesaId e valida disponibilidade', async () => {
    prisma.mesa.findUnique.mockResolvedValueOnce({
      id: 'mesa-7',
      label: 'Mesa 7',
      active: true,
      companyOwnerId: 'owner-1',
    })
    const mesaAvailabilitySpy = jest.fn(async () => undefined)

    const selection = await resolveMesaSelection(
      prisma as unknown as PrismaService,
      helpers as unknown as OperationsHelpersService,
      'owner-1',
      'Mesa 7',
      'mesa-7',
      'comanda-1',
      mesaAvailabilitySpy,
    )

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

    await expect(
      resolveMesaSelection(
        prisma as unknown as PrismaService,
        helpers as unknown as OperationsHelpersService,
        'owner-1',
        'Mesa 9',
        'mesa-9',
      ),
    ).rejects.toThrow(NotFoundException)
  })

  it('resolve mesa quando o frontend envia o numero como mesaId', async () => {
    prisma.mesa.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(null)
    prisma.mesa.findMany.mockResolvedValueOnce([
      {
        id: 'mesa-real-2',
        label: 'Mesa 2',
        active: true,
        companyOwnerId: 'owner-1',
      },
    ])
    const mesaAvailabilitySpy = jest.fn(async () => undefined)

    const selection = await resolveMesaSelection(
      prisma as unknown as PrismaService,
      helpers as unknown as OperationsHelpersService,
      'owner-1',
      '2',
      '2',
      undefined,
      mesaAvailabilitySpy,
    )

    expect(selection).toEqual({ mesaId: 'mesa-real-2', tableLabel: 'Mesa 2' })
    expect(helpers.assertOpenTableAvailability).toHaveBeenCalledWith(expect.anything(), 'owner-1', 'Mesa 2', undefined)
    expect(mesaAvailabilitySpy).toHaveBeenCalledWith('mesa-real-2', undefined)
  })

  it('resolve mesa por rotulo normalizado quando o payload nao traz mesaId', async () => {
    prisma.mesa.findUnique.mockResolvedValueOnce(null)
    prisma.mesa.findMany.mockResolvedValueOnce([
      {
        id: 'mesa-real-4',
        label: 'Mesa 04',
        active: true,
      },
    ])

    const selection = await resolveMesaSelection(
      prisma as unknown as PrismaService,
      helpers as unknown as OperationsHelpersService,
      'owner-1',
      '4',
    )

    expect(selection).toEqual({ mesaId: 'mesa-real-4', tableLabel: 'Mesa 04' })
  })
})

describe('ComandaService helpers — publisher integration', () => {
  const auth = makeOwnerAuth()

  it('publica evento de comanda atualizada com mapeamento de status e kitchenItems', () => {
    const { publisher, realtimeService } = createPublisherTestEnv()

    publisher.publishUpdated({
      auth,
      comanda: makePublishedComanda({
        tableLabel: 'Mesa 2',
        status: 'READY',
        subtotalAmount: 100,
        discountAmount: 5,
        serviceFeeAmount: 10,
        totalAmount: 105,
        openedAt: HELPER_KITCHEN_QUEUED_AT,
      }),
      businessDate: HELPER_BUSINESS_DATE,
      options: {
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
    })

    expect(realtimeService.publishComandaUpdated).toHaveBeenCalledTimes(1)
    expect(realtimeService.publishComandaUpdated.mock.calls[0][0]).toBe(auth)
    expect(realtimeService.publishComandaUpdated.mock.calls[0][1]).toEqual(
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
    const { publisher, realtimeService } = createPublisherTestEnv()

    publisher.publishClosed({
      auth,
      comanda: makePublishedComanda({
        tableLabel: 'Mesa 5',
        closedAt: new Date('2026-04-01T11:30:00.000Z'),
        items: [{ quantity: 2 }],
      }),
      refreshedSession: {
        id: 'cash-1',
        status: CashSessionStatus.OPEN,
        openingCashAmount: 200,
        countedCashAmount: null,
        expectedCashAmount: 315,
        differenceAmount: null,
        movements: [{ type: 'SUPPLY', amount: 50 }],
      },
      closure: {
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
      } as never,
      businessDate: HELPER_BUSINESS_DATE,
    })

    expect(realtimeService.publishComandaClosed).toHaveBeenCalledTimes(1)
    expect(realtimeService.publishComandaClosed.mock.calls[0][0]).toBe(auth)
    expect(realtimeService.publishComandaClosed.mock.calls[0][1]).toEqual(
      expect.objectContaining({ comandaId: 'comanda-1', status: 'CLOSED' }),
    )
    expect(realtimeService.publishComandaClosed.mock.calls[0][1].businessDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(realtimeService.publishCashUpdated).toHaveBeenCalledTimes(1)
    expect(realtimeService.publishCashUpdated.mock.calls[0][1]).toEqual(
      expect.objectContaining({ cashSessionId: 'cash-1', status: 'OPEN' }),
    )
    expect(realtimeService.publishCashClosureUpdated).toHaveBeenCalledTimes(1)
    expect(realtimeService.publishCashClosureUpdated.mock.calls[0][1]).toEqual(
      expect.objectContaining({ closureId: 'closure-1', status: 'CLOSED' }),
    )
  })
})
