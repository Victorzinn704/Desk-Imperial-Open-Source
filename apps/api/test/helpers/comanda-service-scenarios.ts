import { ComandaStatus, KitchenItemStatus } from '@prisma/client'
import type { ComandaService } from '../../src/modules/operations/comanda.service'
import type { ComandaServiceHarness } from './comanda-service-harness'
import {
  makeBusinessDate,
  makeComanda,
  makeComandaItem,
  makeOpenCashClosure,
  makeRecalculatedCashSession,
} from './comanda-service-fixtures'

export function arrangeCatalogItemScenario(harness: ComandaServiceHarness) {
  const { prisma, helpers } = harness
  helpers.requireAuthorizedComanda.mockResolvedValue(makeComanda())
  prisma.product.findFirst.mockResolvedValue({
    id: 'product-1',
    name: 'Pizza',
    unitPrice: 30,
    requiresKitchen: false,
    category: 'pizza',
  })
  prisma.comandaItem.create.mockResolvedValue(
    makeComandaItem({
      id: 'item-1',
      quantity: 2,
      kitchenQueuedAt: new Date('2026-04-01T10:05:00.000Z'),
    }),
  )
  helpers.recalculateComanda.mockResolvedValue(
    makeComanda({
      subtotalAmount: 160,
      totalAmount: 160,
      items: [
        makeComandaItem({
          id: 'item-1',
          quantity: 2,
          kitchenQueuedAt: new Date('2026-04-01T10:05:00.000Z'),
        }),
      ],
    }),
  )
  helpers.resolveComandaBusinessDate.mockResolvedValue(makeBusinessDate())

  return {
    productId: 'product-1',
    quantity: 2,
    notes: 'sem cebola',
  } satisfies Parameters<ComandaService['addComandaItem']>[2]
}

export function arrangeBatchItemsScenario(harness: ComandaServiceHarness) {
  const { prisma, helpers } = harness
  const items = makeBatchItems()

  helpers.requireAuthorizedComanda.mockResolvedValue(makeComanda())
  prisma.product.findMany.mockResolvedValue([makeProduct({ unitPrice: 50, requiresKitchen: true })])
  prisma.comandaItem.createMany.mockResolvedValue({ count: 2 })
  prisma.comandaItem.findMany.mockResolvedValue(items)
  helpers.recalculateComanda.mockResolvedValue(makeComanda({ subtotalAmount: 140, totalAmount: 140, items }))
  helpers.resolveComandaBusinessDate.mockResolvedValue(makeBusinessDate())

  return {
    items: [
      { productId: 'product-1', quantity: 2 },
      { productName: 'Suco', unitPrice: 20, quantity: 2 },
    ],
  } satisfies Parameters<ComandaService['addComandaItems']>[2]
}

export function arrangeReplaceComandaScenario(harness: ComandaServiceHarness) {
  const { prisma, helpers } = harness
  helpers.requireAuthorizedComanda.mockResolvedValue(makeComandaWithReadyKitchenItem())
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
  prisma.mesa.findUnique.mockResolvedValue({ id: 'mesa-1', label: 'Mesa 1', active: true, companyOwnerId: 'owner-1' })
  prisma.comanda.findFirst.mockResolvedValue(null)
  prisma.product.findMany.mockResolvedValue([makeProduct({ requiresKitchen: true })])
  helpers.recalculateComanda.mockResolvedValue(makeComanda())
  helpers.resolveComandaBusinessDate.mockResolvedValue(makeBusinessDate())

  return {
    mesaId: 'mesa-1',
    tableLabel: 'Mesa 1',
    items: [{ productId: 'product-1', quantity: 1 }],
  } satisfies Parameters<ComandaService['replaceComanda']>[2]
}

export function arrangeAssignComandaScenario(harness: ComandaServiceHarness) {
  const { prisma, helpers } = harness
  helpers.requireOwnedComanda.mockResolvedValue(makeComanda())
  helpers.resolveComandaBusinessDate.mockResolvedValue(makeBusinessDate())
  helpers.requireOwnedEmployee.mockResolvedValue({ id: 'employee-1' })
  prisma.cashSession.findFirst.mockResolvedValue({ id: 'cash-open-1' })
  prisma.comanda.update.mockResolvedValue(
    makeComanda({ currentEmployeeId: 'employee-1', cashSessionId: 'cash-open-1' }),
  )

  return { employeeId: 'employee-1' } satisfies Parameters<ComandaService['assignComanda']>[2]
}

export function arrangeCancelComandaScenario(harness: ComandaServiceHarness) {
  const { prisma, helpers } = harness
  helpers.requireAuthorizedComanda.mockResolvedValue(makeComanda())
  prisma.comanda.update.mockResolvedValue(makeComanda({ status: ComandaStatus.CANCELLED }))
  helpers.resolveComandaBusinessDate.mockResolvedValue(makeBusinessDate())
  helpers.syncCashClosure.mockResolvedValue(makeOpenCashClosure({ expectedCashAmount: 100, grossRevenueAmount: 100 }))

  return { status: ComandaStatus.CANCELLED } satisfies Parameters<ComandaService['updateComandaStatus']>[2]
}

export function arrangeReadyKitchenItemScenario(harness: ComandaServiceHarness) {
  const { prisma, helpers } = harness
  prisma.comandaItem.findUnique.mockResolvedValue(makeQueuedKitchenItemWithComanda())
  prisma.comandaItem.update.mockResolvedValue(
    makeComandaItem({
      id: 'item-1',
      notes: null,
      kitchenStatus: KitchenItemStatus.READY,
      kitchenReadyAt: new Date('2026-04-01T10:15:00.000Z'),
    }),
  )
  prisma.comandaItem.findMany.mockResolvedValue([
    { kitchenStatus: KitchenItemStatus.READY },
    { kitchenStatus: KitchenItemStatus.DELIVERED },
  ])
  prisma.comanda.update.mockResolvedValue(makeComanda({ status: ComandaStatus.READY }))
  helpers.resolveComandaBusinessDate.mockResolvedValue(makeBusinessDate())

  return { status: 'READY' } satisfies Parameters<ComandaService['updateKitchenItemStatus']>[2]
}

export function arrangeCloseComandaScenario(harness: ComandaServiceHarness, paidAmount: number) {
  const { prisma, helpers } = harness
  const closedAt = new Date('2026-04-01T11:00:00.000Z')

  helpers.requireAuthorizedComanda.mockResolvedValue(makeComanda())
  helpers.recalculateComanda.mockResolvedValue(makeComanda({ totalAmount: 120 }))
  prisma.comandaPayment.aggregate.mockResolvedValue({ _sum: { amount: paidAmount } })
  prisma.comandaPayment.create.mockResolvedValue({ id: 'payment-1', amount: 120, status: 'CONFIRMED' })
  prisma.comanda.update.mockResolvedValue(makeComanda({ status: ComandaStatus.CLOSED, totalAmount: 120, closedAt }))
  prisma.comanda.findUnique.mockResolvedValue(makeClosedComandaWithPayment(closedAt))
  helpers.resolveComandaBusinessDate.mockResolvedValue(makeBusinessDate())
  helpers.recalculateCashSession.mockResolvedValue(makeRecalculatedCashSession())
  helpers.syncCashClosure.mockResolvedValue(makeOpenCashClosure())

  return {
    discountAmount: 5,
    serviceFeeAmount: 10,
  } satisfies Parameters<ComandaService['closeComanda']>[2]
}

function makeProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: 'product-1',
    name: 'Pizza',
    unitPrice: 100,
    category: 'pizza',
    requiresKitchen: false,
    ...overrides,
  }
}

function makeBatchItems() {
  const queuedAt = new Date('2026-04-01T10:10:00.000Z')

  return [
    makeComandaItem({
      id: 'item-1',
      quantity: 2,
      unitPrice: 50,
      totalAmount: 100,
      notes: null,
      kitchenQueuedAt: queuedAt,
    }),
    makeComandaItem({
      id: 'item-2',
      productId: null,
      productName: 'Suco',
      quantity: 2,
      unitPrice: 20,
      totalAmount: 40,
      notes: null,
      kitchenStatus: null,
      kitchenQueuedAt: null,
    }),
  ]
}

function makeComandaWithReadyKitchenItem() {
  return makeComanda({
    discountAmount: 10,
    serviceFeeAmount: 5,
    items: [
      makeComandaItem({
        id: 'item-old',
        kitchenStatus: KitchenItemStatus.READY,
        kitchenReadyAt: new Date('2026-04-01T10:12:00.000Z'),
      }),
    ],
  })
}

function makeQueuedKitchenItemWithComanda() {
  return {
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
  }
}

function makeClosedComandaWithPayment(closedAt: Date) {
  return makeComanda({
    status: ComandaStatus.CLOSED,
    totalAmount: 120,
    closedAt,
    payments: [{ id: 'payment-1', amount: 120, status: 'CONFIRMED', paidAt: closedAt }],
  })
}
