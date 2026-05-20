import { ComandaStatus, KitchenItemStatus, type Prisma } from '@prisma/client'
import { roundCurrency } from '../../common/utils/number-rounding.util'
import { isOpenComandaStatus, toNumberOrZero } from './operations-domain.utils'

export async function propagateKitchenStatusToComanda(
  tx: Prisma.TransactionClient,
  comanda: { id: string; status: ComandaStatus; cashSessionId: string | null; openedAt: Date },
  deriveComandaStatusFromKitchen: (
    kitchenItems: Array<{ kitchenStatus: KitchenItemStatus | null }>,
    currentStatus: ComandaStatus,
  ) => ComandaStatus | null,
) {
  const allItems = await tx.comandaItem.findMany({
    where: { comandaId: comanda.id },
    select: { kitchenStatus: true },
  })

  const kitchenItems = allItems.filter((i: { kitchenStatus: KitchenItemStatus | null }) => i.kitchenStatus !== null)
  const newStatus = deriveComandaStatusFromKitchen(kitchenItems, comanda.status)

  if (newStatus) {
    return tx.comanda.update({
      where: { id: comanda.id },
      data: { status: newStatus },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    })
  }

  return (
    (await tx.comanda.findUnique({
      where: { id: comanda.id },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    })) ?? undefined
  )
}

export function deriveComandaStatusFromKitchen(
  kitchenItems: Array<{ kitchenStatus: KitchenItemStatus | null }>,
  currentStatus: ComandaStatus,
): ComandaStatus | null {
  if (kitchenItems.length === 0) {
    return null
  }
  if (!isOpenComandaStatus(currentStatus)) {
    return null
  }

  const allReady = kitchenItems.every(
    (i) => i.kitchenStatus === KitchenItemStatus.READY || i.kitchenStatus === KitchenItemStatus.DELIVERED,
  )
  if (allReady) {
    return ComandaStatus.READY
  }

  const anyInPrep = kitchenItems.some((i) => i.kitchenStatus === KitchenItemStatus.IN_PREPARATION)
  if (anyInPrep && currentStatus === ComandaStatus.OPEN) {
    return ComandaStatus.IN_PREPARATION
  }

  return null
}

export function takeMatchingKitchenState(
  existingItems: Array<{
    productId: string | null
    productName: string
    quantity: number
    unitPrice: { toNumber(): number } | number
    notes: string | null
    kitchenStatus: KitchenItemStatus | null
    kitchenQueuedAt: Date | null
    kitchenReadyAt: Date | null
  }>,
  nextItem: {
    productId: string | null
    productName: string
    quantity: number
    unitPrice: number
    notes: string | null
  },
  needsKitchen: boolean,
  fallbackQueuedAt: Date,
) {
  if (!needsKitchen) {
    return {
      kitchenStatus: null,
      kitchenQueuedAt: null,
      kitchenReadyAt: null,
    }
  }

  const matchingItemIndex = existingItems.findIndex(
    (existingItem) =>
      existingItem.productId === nextItem.productId &&
      existingItem.productName === nextItem.productName &&
      existingItem.quantity === nextItem.quantity &&
      roundCurrency(toNumberOrZero(existingItem.unitPrice)) === roundCurrency(nextItem.unitPrice) &&
      (existingItem.notes ?? null) === (nextItem.notes ?? null),
  )

  if (matchingItemIndex === -1) {
    return {
      kitchenStatus: KitchenItemStatus.QUEUED,
      kitchenQueuedAt: fallbackQueuedAt,
      kitchenReadyAt: null,
    }
  }

  const [matchingItem] = existingItems.splice(matchingItemIndex, 1)
  if (!matchingItem) {
    return {
      kitchenStatus: KitchenItemStatus.QUEUED,
      kitchenQueuedAt: fallbackQueuedAt,
      kitchenReadyAt: null,
    }
  }

  return {
    kitchenStatus: matchingItem.kitchenStatus ?? KitchenItemStatus.QUEUED,
    kitchenQueuedAt: matchingItem.kitchenQueuedAt ?? fallbackQueuedAt,
    kitchenReadyAt: matchingItem.kitchenReadyAt,
  }
}
