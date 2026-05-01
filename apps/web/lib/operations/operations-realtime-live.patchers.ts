import type { ComandaRecord, ComandaStatus, KitchenItemStatus, OperationsLiveResponse } from '@contracts/contracts'
import {
  asCashSessionRecord,
  asMesaRecord,
  asNullableNumber,
  asNullableString,
  asNumber,
  mapCashSessionStatus,
  mapClosureStatus,
  mapMesaStatus,
} from './operations-realtime-coercion'
import { buildComandaFromPayload, resolveComandaIdFromPayload } from './operations-realtime-comanda.mapper'
import { buildKitchenItemFromPayload, type ResolvedKitchenItemPatch } from './operations-realtime-kitchen.mapper'
import {
  findComandaInSnapshot,
  isOpenComandaStatus,
  patchClosureOpenComandasCount,
  resolveTargetGroup,
  upsertComandaRecord,
  upsertMesa,
  withGroupMetrics,
} from './operations-realtime-snapshot-helpers'

export function upsertComandaFromEvent(
  snapshot: OperationsLiveResponse,
  payload: Record<string, unknown>,
  fallbackStatus?: Extract<ComandaStatus, 'OPEN'>,
  fallbackOpenComandasDelta = 0,
) {
  const comandaId = resolveComandaIdFromPayload(payload)
  const existing = comandaId ? findComandaInSnapshot(snapshot, comandaId) : null
  const nextComanda = buildComandaFromPayload({
    companyOwnerId: snapshot.companyOwnerId,
    existing,
    fallbackStatus,
    payload,
  })
  if (!nextComanda) {
    return null
  }

  const nextSnapshot = upsertComandaRecord(snapshot, nextComanda)
  const existingWasOpen = existing ? isOpenComandaStatus(existing.status) : false
  const nextIsOpen = isOpenComandaStatus(nextComanda.status)

  if (!existing) {
    return patchClosureOpenComandasCount(nextSnapshot, nextIsOpen ? fallbackOpenComandasDelta : 0)
  }

  if (existingWasOpen === nextIsOpen) {
    return nextSnapshot
  }

  return patchClosureOpenComandasCount(nextSnapshot, nextIsOpen ? 1 : -1)
}

export function closeComandaFromEvent(snapshot: OperationsLiveResponse, payload: Record<string, unknown>) {
  const comandaId = resolveComandaIdFromPayload(payload)
  const existing = comandaId ? findComandaInSnapshot(snapshot, comandaId) : null
  const nextComanda = buildComandaFromPayload({
    companyOwnerId: snapshot.companyOwnerId,
    existing,
    fallbackStatus: 'CLOSED',
    payload,
  })
  if (!nextComanda) {
    return null
  }

  const nextSnapshot = upsertComandaRecord(snapshot, { ...nextComanda, status: 'CLOSED' })
  if (existing && existing.status !== 'CLOSED' && existing.status !== 'CANCELLED') {
    return patchClosureOpenComandasCount(nextSnapshot, -1)
  }

  return nextSnapshot
}

export function upsertKitchenItem(
  snapshot: OperationsLiveResponse,
  payload: Record<string, unknown>,
  fallbackStatus?: KitchenItemStatus,
) {
  const nextItem = buildKitchenItemFromPayload(payload, fallbackStatus)
  const payloadComandaId = resolveComandaIdFromPayload(payload)
  const existing = payloadComandaId ? findComandaInSnapshot(snapshot, payloadComandaId) : null
  const nextComanda = buildComandaFromPayload({
    companyOwnerId: snapshot.companyOwnerId,
    existing,
    payload,
  })
  if (!nextItem && !nextComanda) {
    return null
  }

  const comandaId = nextItem?.item.comandaId ?? nextComanda?.id
  if (!comandaId) {
    return null
  }

  const existingComanda = findComandaInSnapshot(snapshot, comandaId)
  const baseComanda = nextComanda ?? existingComanda
  if (!baseComanda) {
    return null
  }

  const mergedItems = mergeComandaItemsForKitchenUpdate(baseComanda.items, nextItem)
  return upsertComandaRecord(snapshot, { ...baseComanda, items: mergedItems })
}

export function patchCashSession(snapshot: OperationsLiveResponse, payload: Record<string, unknown>) {
  const cashSession = asCashSessionRecord(payload.cashSession)
  if (cashSession) {
    return patchVisibleCashSession(snapshot, cashSession.employeeId, cashSession)
  }

  const cashSessionId = asNullableString(payload.cashSessionId)
  if (!cashSessionId) {
    return null
  }

  return patchCashSessionById(snapshot, cashSessionId, payload)
}

export function patchCashOpened(snapshot: OperationsLiveResponse, payload: Record<string, unknown>) {
  const cashSession = asCashSessionRecord(payload.cashSession)
  if (!cashSession) {
    return null
  }

  return patchVisibleCashSession(snapshot, cashSession.employeeId, cashSession)
}

export function patchClosure(snapshot: OperationsLiveResponse, payload: Record<string, unknown>) {
  if (!snapshot.closure) {
    return null
  }

  return {
    ...snapshot,
    closure: {
      ...snapshot.closure,
      countedCashAmount: asNullableNumber(payload.countedAmount) ?? snapshot.closure.countedCashAmount,
      differenceAmount: asNullableNumber(payload.differenceAmount) ?? snapshot.closure.differenceAmount,
      expectedCashAmount: asNumber(payload.expectedAmount) ?? snapshot.closure.expectedCashAmount,
      grossRevenueAmount: asNumber(payload.grossRevenueAmount) ?? snapshot.closure.grossRevenueAmount,
      openComandasCount: asNumber(payload.openComandasCount) ?? snapshot.closure.openComandasCount,
      openSessionsCount: asNumber(payload.pendingCashSessions) ?? snapshot.closure.openSessionsCount,
      realizedProfitAmount: asNumber(payload.realizedProfitAmount) ?? snapshot.closure.realizedProfitAmount,
      status: mapClosureStatus(asNullableString(payload.status)) ?? snapshot.closure.status,
    },
  }
}

export function patchMesa(snapshot: OperationsLiveResponse, payload: Record<string, unknown>) {
  const mesa = asMesaRecord(payload.mesa)
  if (mesa) {
    return { ...snapshot, mesas: upsertMesa(snapshot.mesas, mesa) }
  }

  const mesaId = asNullableString(payload.mesaId)
  const mesaLabel = asNullableString(payload.label) ?? asNullableString(payload.mesaLabel)
  const status = mapMesaStatus(asNullableString(payload.status))
  if (!status || (!mesaId && !mesaLabel)) {
    return null
  }

  return {
    ...snapshot,
    mesas: snapshot.mesas.map((currentMesa) =>
      currentMesa.id === mesaId || currentMesa.label === mesaLabel ? { ...currentMesa, status } : currentMesa,
    ),
  }
}

function mergeComandaItemsForKitchenUpdate(items: ComandaRecord['items'], nextItem: ResolvedKitchenItemPatch | null) {
  if (!nextItem) {
    return items
  }

  const existingIndex = items.findIndex((item) => item.id === nextItem.item.itemId)
  if (nextItem.delivered) {
    return existingIndex === -1 ? items : items.filter((item) => item.id !== nextItem.item.itemId)
  }

  if (existingIndex === -1) {
    return items
  }

  const nextItems = [...items]
  nextItems[existingIndex] = {
    ...nextItems[existingIndex],
    id: nextItem.item.itemId,
    kitchenQueuedAt: nextItem.item.kitchenQueuedAt,
    kitchenReadyAt: nextItem.item.kitchenReadyAt,
    kitchenStatus: nextItem.item.kitchenStatus,
    notes: nextItem.item.notes,
    productId: nextItems[existingIndex].productId ?? null,
    productName: nextItem.item.productName,
    quantity: nextItem.item.quantity,
    totalAmount: nextItems[existingIndex].totalAmount ?? 0,
    unitPrice: nextItems[existingIndex].unitPrice ?? 0,
  }
  return nextItems
}

function patchCashSessionById(
  snapshot: OperationsLiveResponse,
  cashSessionId: string,
  payload: Record<string, unknown>,
) {
  return {
    ...snapshot,
    employees: snapshot.employees.map((group) =>
      group.cashSession?.id === cashSessionId
        ? withGroupMetrics({ ...group, cashSession: mergeCashSessionPatch(group.cashSession, payload) })
        : group,
    ),
    unassigned:
      snapshot.unassigned.cashSession?.id === cashSessionId
        ? withGroupMetrics({
            ...snapshot.unassigned,
            cashSession: mergeCashSessionPatch(snapshot.unassigned.cashSession, payload),
          })
        : snapshot.unassigned,
  }
}

function patchVisibleCashSession(
  snapshot: OperationsLiveResponse,
  employeeId: string | null,
  cashSession: NonNullable<ReturnType<typeof asCashSessionRecord>>,
) {
  const target = resolveTargetGroup(snapshot, employeeId)
  if (!target) {
    return snapshot
  }

  return {
    ...snapshot,
    employees: snapshot.employees.map((group) =>
      group.employeeId === target.employeeId ? withGroupMetrics({ ...group, cashSession }) : group,
    ),
    unassigned:
      target.employeeId === null ? withGroupMetrics({ ...snapshot.unassigned, cashSession }) : snapshot.unassigned,
  }
}

function mergeCashSessionPatch(
  cashSession: NonNullable<OperationsLiveResponse['employees'][number]['cashSession']>,
  payload: Record<string, unknown>,
) {
  return {
    ...cashSession,
    countedCashAmount: asNullableNumber(payload.countedAmount) ?? cashSession.countedCashAmount,
    differenceAmount: asNullableNumber(payload.differenceAmount) ?? cashSession.differenceAmount,
    expectedCashAmount: asNumber(payload.expectedAmount) ?? cashSession.expectedCashAmount,
    openingCashAmount: asNumber(payload.openingAmount) ?? cashSession.openingCashAmount,
    status: mapCashSessionStatus(asNullableString(payload.status)) ?? cashSession.status,
  }
}
