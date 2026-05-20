import { KitchenItemStatus } from '@prisma/client'
import { COMANDA_WRITE_ISOLATION_LEVEL } from './comanda.constants'
import {
  toBatchComandaItemCreateManyRow,
  toDraftComandaItemCreateManyRow,
  toReplaceComandaUpdateData,
} from './comanda-items-mappers.utils'
import { takeMatchingKitchenState } from './comanda-kitchen.utils'
import type { PrismaService } from '../../database/prisma.service'
import type { OperationsHelpersService } from './operations-helpers.service'

type Helpers = Pick<OperationsHelpersService, 'recalculateComanda' | 'resolveComandaBusinessDate'>
type PreparedSingleItem = {
  kitchenQueuedAt: Date | null
  notes: string | null
  productId: string | null
  productName: string
  quantity: number
  requiresKitchen: boolean
  totalAmount: number
  unitPrice: number
}
type ExistingKitchenItem = {
  kitchenQueuedAt: Date | null
  kitchenReadyAt: Date | null
  kitchenStatus: KitchenItemStatus | null
  notes: string | null
  productId: string | null
  productName: string
  quantity: number
  unitPrice: { toNumber(): number } | number
}
type ReplaceItemsInput = Parameters<typeof toReplaceComandaUpdateData>[0] & {
  draftItems: Array<Omit<PreparedSingleItem, 'kitchenQueuedAt'>>
  fields: Parameters<typeof toReplaceComandaUpdateData>[0]['fields'] & {
    discountAmount: number
    serviceFeeAmount: number
  }
}

export function createSingleComandaItem(params: {
  comandaId: string
  helpers: Helpers
  item: PreparedSingleItem
  prisma: PrismaService
}) {
  const { comandaId, helpers, item, prisma } = params
  return prisma.$transaction(
    async (transaction) => {
      const createdItem = await transaction.comandaItem.create({
        data: {
          comandaId,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalAmount: item.totalAmount,
          notes: item.notes,
          kitchenStatus: item.requiresKitchen ? KitchenItemStatus.QUEUED : null,
          kitchenQueuedAt: item.kitchenQueuedAt,
        },
      })
      const refreshedComanda = await helpers.recalculateComanda(transaction, comandaId)
      return {
        businessDate: await helpers.resolveComandaBusinessDate(transaction, refreshedComanda),
        item: createdItem,
        refreshedComanda,
      }
    },
    { isolationLevel: COMANDA_WRITE_ISOLATION_LEVEL },
  )
}

export function createBatchComandaItems(params: {
  comandaId: string
  helpers: Helpers
  items: PreparedSingleItem[]
  prisma: PrismaService
}) {
  const { comandaId, helpers, items, prisma } = params
  return prisma.$transaction(
    async (transaction) => {
      await transaction.comandaItem.createMany({
        data: items.map((item) => toBatchComandaItemCreateManyRow(comandaId, item)),
      })
      const createdItems = await transaction.comandaItem.findMany({
        where: { comandaId },
        orderBy: { createdAt: 'desc' },
        take: items.length,
      })
      const refreshedComanda = await helpers.recalculateComanda(transaction, comandaId)
      return {
        businessDate: await helpers.resolveComandaBusinessDate(transaction, refreshedComanda),
        createdItems,
        refreshedComanda,
      }
    },
    { isolationLevel: COMANDA_WRITE_ISOLATION_LEVEL },
  )
}

export function replaceComandaItems(params: {
  comanda: { id: string; items: ExistingKitchenItem[] }
  helpers: Helpers
  input: ReplaceItemsInput
  prisma: PrismaService
}) {
  const { comanda, helpers, input, prisma } = params
  return prisma.$transaction(async (transaction) => {
    const now = new Date()
    const remainingExistingItems = [...comanda.items]
    await transaction.comanda.update({ where: { id: comanda.id }, data: toReplaceComandaUpdateData(input) })
    await transaction.comandaItem.deleteMany({ where: { comandaId: comanda.id } })
    if (input.draftItems.length) {
      await transaction.comandaItem.createMany({
        data: input.draftItems.map((item) => ({
          ...toDraftComandaItemCreateManyRow(comanda.id, item),
          ...takeMatchingKitchenState(remainingExistingItems, item, item.requiresKitchen, now),
        })),
      })
    }
    const refreshedComanda = await helpers.recalculateComanda(transaction, comanda.id, {
      discountAmount: input.fields.discountAmount,
      serviceFeeAmount: input.fields.serviceFeeAmount,
    })
    return {
      businessDate: await helpers.resolveComandaBusinessDate(transaction, refreshedComanda),
      refreshedComanda,
    }
  })
}
