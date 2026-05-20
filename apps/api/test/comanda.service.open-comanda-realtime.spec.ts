import { CashSessionStatus, KitchenItemStatus } from '@prisma/client'
import {
  COMANDA_ID,
  makeComanda,
  makeComandaItem,
  makeOwnerAuth,
  makeRequest,
  OWNER_ID,
  WITHOUT_LIVE_SNAPSHOT,
} from './helpers/comanda-service-fixtures'
import { type ComandaServiceHarness, createComandaServiceHarness } from './helpers/comanda-service-harness'

const KITCHEN_QUEUED_AT = new Date('2026-03-30T10:00:00.000Z')

describe('ComandaService - openComanda realtime', () => {
  let harness: ComandaServiceHarness

  beforeEach(() => {
    harness = createComandaServiceHarness()

    harness.prisma.mesa.findUnique.mockResolvedValue({
      id: 'mesa-1',
      label: 'Mesa 1',
      active: true,
      companyOwnerId: OWNER_ID,
    })
    harness.prisma.comanda.findFirst.mockResolvedValue(null)
    harness.prisma.comanda.create.mockImplementation(async (input: unknown) => {
      const { data } = input as { data: Record<string, unknown> }
      return {
        id: COMANDA_ID,
        ...data,
      }
    })
    harness.prisma.cashSession.findFirst.mockResolvedValue({
      id: 'session-1',
      businessDate: KITCHEN_QUEUED_AT,
      status: CashSessionStatus.OPEN,
    })
    harness.prisma.comandaItem.createMany.mockResolvedValue({ count: 1 })
    harness.prisma.comandaItem.findMany.mockResolvedValue([
      makeComandaItem({
        id: 'item-1',
        productName: 'Pizza',
        quantity: 2,
        notes: 'Sem cebola',
        kitchenStatus: KitchenItemStatus.QUEUED,
        kitchenQueuedAt: KITCHEN_QUEUED_AT,
      }),
    ])
    harness.prisma.comandaAssignment.create.mockResolvedValue({})

    harness.helpers.resolveComandaBusinessDate.mockImplementation(
      async (_tx: unknown, comanda: unknown) => (comanda as { openedAt: Date }).openedAt,
    )
  })

  it('publica kitchen.item.queued na abertura quando há itens que entram na cozinha', async () => {
    harness.helpers.resolveComandaDraftItems.mockResolvedValue([
      {
        productId: 'product-1',
        productName: 'Pizza',
        quantity: 2,
        requiresKitchen: true,
        unitPrice: 10,
        totalAmount: 20,
        notes: 'Sem cebola',
      },
    ])
    harness.helpers.recalculateComanda.mockResolvedValue(
      makeComanda({
        cashSessionId: 'session-1',
        subtotalAmount: 20,
        totalAmount: 20,
        openedAt: KITCHEN_QUEUED_AT,
        items: [
          makeComandaItem({
            id: 'item-1',
            productName: 'Pizza',
            quantity: 2,
            notes: 'Sem cebola',
            kitchenStatus: KitchenItemStatus.QUEUED,
            kitchenQueuedAt: KITCHEN_QUEUED_AT,
          }),
        ],
      }),
    )

    await harness.service.openComanda(
      makeOwnerAuth(),
      {
        tableLabel: 'Mesa 1',
        participantCount: 2,
        items: [{ productId: 'product-1', quantity: 2 }],
      } as never,
      makeRequest(),
      WITHOUT_LIVE_SNAPSHOT,
    )

    expect(harness.realtime.publishComandaOpened).toHaveBeenCalledTimes(1)
    expect(harness.prisma.product.findMany).not.toHaveBeenCalled()
    expect(harness.realtime.publishKitchenItemQueued).toHaveBeenCalledTimes(1)
    expect(harness.realtime.publishKitchenItemQueued).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        itemId: 'item-1',
        comandaId: COMANDA_ID,
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
      undefined,
    )
  })
})
