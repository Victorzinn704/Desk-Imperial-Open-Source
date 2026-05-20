import type { KitchenItemStatus, OperationsKitchenItemRecord } from '@contracts/contracts'
import {
  asArray,
  asComandaItemRecord,
  asComandaRecord,
  asNullableString,
  asNumber,
  asString,
  mapKitchenStatus,
} from './operations-realtime-coercion'

export type ResolvedKitchenItemPatch = {
  item: OperationsKitchenItemRecord
  delivered: boolean
}

export function buildKitchenStatusCounts(items: OperationsKitchenItemRecord[]) {
  return items.reduce(
    (accumulator, item) => {
      if (item.kitchenStatus === 'QUEUED') {
        accumulator.queued += 1
      } else if (item.kitchenStatus === 'IN_PREPARATION') {
        accumulator.inPreparation += 1
      } else if (item.kitchenStatus === 'READY') {
        accumulator.ready += 1
      }

      return accumulator
    },
    {
      queued: 0,
      inPreparation: 0,
      ready: 0,
    },
  )
}

export function extractKitchenItemsFromPayload(payload: Record<string, unknown>): ResolvedKitchenItemPatch[] {
  const kitchenItems = asArray(payload.kitchenItems)
  if (kitchenItems.length) {
    return kitchenItems
      .map((rawItem) =>
        buildKitchenItemFromPayload(rawItem && typeof rawItem === 'object' ? (rawItem as Record<string, unknown>) : {}),
      )
      .filter((item): item is ResolvedKitchenItemPatch => Boolean(item))
  }

  const legacyComanda = asComandaRecord(payload.comanda)
  if (legacyComanda?.items?.length) {
    return legacyComanda.items
      .map((item) => buildKitchenItemPatchFromLegacyItem(payload, legacyComanda.id, legacyComanda.tableLabel, item))
      .filter((item): item is ResolvedKitchenItemPatch => Boolean(item))
  }

  const rawItems = asArray(payload.items)
  if (!rawItems.length) {
    return []
  }

  return rawItems
    .map((rawItem) =>
      buildKitchenItemPatchFromLegacyItem(
        payload,
        asString(payload.comandaId),
        asString(payload.mesaLabel) ?? asString(payload.tableLabel),
        rawItem,
      ),
    )
    .filter((item): item is ResolvedKitchenItemPatch => Boolean(item))
}

export function buildKitchenItemFromPayload(
  payload: Record<string, unknown>,
  fallbackStatus?: KitchenItemStatus,
): ResolvedKitchenItemPatch | null {
  const fields = resolveKitchenItemFields(payload)
  if (!fields) {
    return null
  }

  return {
    delivered: fields.rawStatus === 'DELIVERED',
    item: {
      comandaId: fields.comandaId,
      employeeId: fields.employeeId,
      employeeName: fields.employeeName,
      itemId: fields.itemId,
      kitchenQueuedAt: fields.kitchenQueuedAt,
      kitchenReadyAt: fields.kitchenReadyAt,
      kitchenStatus: resolveKitchenRealtimeStatus(fields.rawStatus, fallbackStatus),
      mesaLabel: fields.mesaLabel,
      notes: fields.notes,
      productName: fields.productName,
      quantity: fields.quantity,
    },
  }
}

function buildKitchenItemPatchFromLegacyItem(
  payload: Record<string, unknown>,
  comandaId: string | null,
  mesaLabel: string | null,
  rawItem: unknown,
): ResolvedKitchenItemPatch | null {
  const item = asComandaItemRecord(rawItem)
  if (!(item && comandaId && mesaLabel)) {
    return null
  }

  const rawStatus = asNullableString(payload.kitchenStatus) ?? item.kitchenStatus
  const status = mapKitchenStatus(rawStatus)
  const delivered = rawStatus === 'DELIVERED'

  return {
    delivered,
    item: {
      itemId: item.id,
      comandaId,
      mesaLabel,
      employeeId: asNullableString(payload.employeeId) ?? asNullableString(payload.currentEmployeeId),
      employeeName: asString(payload.employeeName) ?? 'Operação',
      productName: item.productName,
      quantity: item.quantity,
      notes: item.notes,
      kitchenStatus: (status ?? 'QUEUED') as OperationsKitchenItemRecord['kitchenStatus'],
      kitchenQueuedAt: item.kitchenQueuedAt,
      kitchenReadyAt: item.kitchenReadyAt,
    },
  }
}

// Payloads arrive in multiple legacy/new shapes; keeping the coercion centralized is more maintainable here.
// eslint-disable-next-line complexity
function resolveKitchenItemFields(payload: Record<string, unknown>) {
  const legacyItem = asComandaItemRecord(payload.item)
  const itemId = legacyItem?.id ?? asString(payload.itemId)
  const comandaId = asString(payload.comandaId)
  const productName = legacyItem?.productName ?? asString(payload.productName)
  const mesaLabel = asString(payload.mesaLabel) ?? asString(payload.tableLabel)
  const quantity = legacyItem?.quantity ?? asNumber(payload.quantity)

  if (!(itemId && comandaId && productName && mesaLabel) || quantity == null) {
    return null
  }

  return {
    comandaId,
    employeeId: asNullableString(payload.employeeId) ?? asNullableString(payload.currentEmployeeId),
    employeeName: asString(payload.employeeName) ?? 'Operação',
    itemId,
    kitchenQueuedAt: asNullableString(payload.kitchenQueuedAt) ?? legacyItem?.kitchenQueuedAt ?? null,
    kitchenReadyAt: asNullableString(payload.kitchenReadyAt) ?? legacyItem?.kitchenReadyAt ?? null,
    mesaLabel,
    notes: asNullableString(payload.notes) ?? legacyItem?.notes ?? null,
    productName,
    quantity,
    rawStatus: asNullableString(payload.kitchenStatus) ?? legacyItem?.kitchenStatus ?? null,
  }
}

function resolveKitchenRealtimeStatus(
  rawStatus: string | null,
  fallbackStatus?: KitchenItemStatus,
): OperationsKitchenItemRecord['kitchenStatus'] {
  return (mapKitchenStatus(rawStatus) ?? fallbackStatus ?? 'QUEUED') as OperationsKitchenItemRecord['kitchenStatus']
}
