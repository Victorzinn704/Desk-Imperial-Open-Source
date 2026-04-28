import { asNullableString, asString, mapComandaStatus } from './operations-realtime-coercion'
import {
  buildKitchenItemFromPayload,
  buildKitchenStatusCounts,
  extractKitchenItemsFromPayload,
  type ResolvedKitchenItemPatch,
} from './operations-realtime-kitchen.mapper'
import type { OperationsKitchenSnapshot } from './operations-realtime-types'

export function patchKitchenFromComandaEvent(snapshot: OperationsKitchenSnapshot, payload: Record<string, unknown>) {
  const comandaId = asString(payload.comandaId)
  const status = mapComandaStatus(asNullableString(payload.status))

  if (comandaId && status === 'CLOSED') {
    return rebuildKitchenSnapshot(
      snapshot,
      snapshot.items.filter((item) => item.comandaId !== comandaId),
    )
  }

  if (comandaId && payload.replaceKitchenItems === true) {
    const nextItems = snapshot.items.filter((item) => item.comandaId !== comandaId)
    const replacementItems = extractKitchenItemsFromPayload(payload)
      .filter((item) => !item.delivered)
      .map((item) => item.item)

    return rebuildKitchenSnapshot(snapshot, [...nextItems, ...replacementItems])
  }

  const comandaItems = extractKitchenItemsFromPayload(payload)
  if (!comandaItems.length) {
    return null
  }

  let nextSnapshot: OperationsKitchenSnapshot = snapshot
  let applied = false

  for (const item of comandaItems) {
    const next = patchKitchenItem(nextSnapshot, item)
    if (!next) {
      continue
    }

    nextSnapshot = next
    applied = true
  }

  return applied ? nextSnapshot : null
}

export function patchKitchenFromItemEvent(snapshot: OperationsKitchenSnapshot, payload: Record<string, unknown>) {
  const item = buildKitchenItemFromPayload(payload)
  if (!item) {
    return null
  }

  return patchKitchenItem(snapshot, item)
}

export function patchKitchenItem(snapshot: OperationsKitchenSnapshot, patch: ResolvedKitchenItemPatch) {
  const existingIndex = snapshot.items.findIndex((item) => item.itemId === patch.item.itemId)
  const nextItems = [...snapshot.items]

  if (patch.delivered) {
    if (existingIndex === -1) {
      return null
    }

    nextItems.splice(existingIndex, 1)
    return rebuildKitchenSnapshot(snapshot, nextItems)
  }

  if (existingIndex === -1) {
    nextItems.push(patch.item)
    return rebuildKitchenSnapshot(snapshot, nextItems)
  }

  nextItems[existingIndex] = { ...nextItems[existingIndex], ...patch.item }
  return rebuildKitchenSnapshot(snapshot, nextItems)
}

function rebuildKitchenSnapshot(snapshot: OperationsKitchenSnapshot, items: OperationsKitchenSnapshot['items']) {
  const sortedItems = [...items].sort(compareKitchenQueueTime)

  return {
    ...snapshot,
    items: sortedItems,
    statusCounts: buildKitchenStatusCounts(sortedItems),
  }
}

function compareKitchenQueueTime(
  left: OperationsKitchenSnapshot['items'][number],
  right: OperationsKitchenSnapshot['items'][number],
) {
  const leftTime = left.kitchenQueuedAt ? new Date(left.kitchenQueuedAt).getTime() : 0
  const rightTime = right.kitchenQueuedAt ? new Date(right.kitchenQueuedAt).getTime() : 0
  return leftTime - rightTime
}
