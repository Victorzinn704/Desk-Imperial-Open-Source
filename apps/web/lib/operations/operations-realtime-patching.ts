import type { QueryClient } from '@tanstack/react-query'
import type {
  CashClosureStatus,
  CashSessionRecord,
  ComandaRecord,
  ComandaStatus,
  KitchenItemStatus,
  MesaRecord,
  OperationsKitchenItemRecord,
  OperationsLiveResponse,
  OperationsSummaryResponse,
} from '@contracts/contracts'
import {
  OPERATIONS_KITCHEN_QUERY_KEY,
  OPERATIONS_LIVE_QUERY_PREFIX,
  OPERATIONS_SUMMARY_QUERY_KEY,
} from '@/lib/operations/operations-query'
import { buildOperationsExecutiveKpis, buildTopProducts } from '@/lib/operations/operations-kpis'
import type { OperationsRealtimeEnvelope } from '@/components/operations/hooks/use-operations-socket'

type OperationsRealtimePatchResult = {
  livePatched: boolean
  liveNeedsRefresh: boolean
  kitchenPatched: boolean
  kitchenNeedsRefresh: boolean
  summaryPatched: boolean
  summaryNeedsRefresh: boolean
}

type OperationsKitchenSnapshot = {
  businessDate: string
  companyOwnerId: string
  items: OperationsKitchenItemRecord[]
  statusCounts: {
    queued: number
    inPreparation: number
    ready: number
  }
}

type ResolvedKitchenItemPatch = {
  item: OperationsKitchenItemRecord
  delivered: boolean
}

export type { OperationsRealtimePatchResult, OperationsKitchenSnapshot }

export function applyRealtimeEnvelope(
  queryClient: QueryClient,
  envelope: OperationsRealtimeEnvelope,
): OperationsRealtimePatchResult {
  const result: OperationsRealtimePatchResult = {
    livePatched: false,
    liveNeedsRefresh: false,
    kitchenPatched: false,
    kitchenNeedsRefresh: false,
    summaryPatched: false,
    summaryNeedsRefresh: false,
  }

  applyLivePatches(queryClient, envelope, result)
  applyKitchenPatch(queryClient, envelope, result)
  applySummaryPatch(queryClient, envelope, result)

  return result
}

export function requiresKitchenRefresh(envelope: OperationsRealtimeEnvelope) {
  if (isKitchenEvent(envelope.event)) {
    return true
  }

  return (
    envelope.event === 'comanda.updated' &&
    (envelope.payload.requiresKitchenRefresh === true || envelope.payload.replaceKitchenItems === true)
  )
}

export function requiresSummaryRefresh(event: OperationsRealtimeEnvelope['event']) {
  return (
    event === 'comanda.opened' ||
    event === 'comanda.updated' ||
    event === 'comanda.closed'
  )
}

export function syncSummarySnapshotFromLive(
  summarySnapshot: OperationsSummaryResponse | null | undefined,
  liveSnapshot: OperationsLiveResponse | null | undefined,
) {
  if (!summarySnapshot || !liveSnapshot) {
    return null
  }

  if (summarySnapshot.businessDate !== liveSnapshot.businessDate) {
    return null
  }

  return {
    ...summarySnapshot,
    kpis: buildOperationsExecutiveKpis(liveSnapshot),
    topProducts: buildTopProducts(liveSnapshot),
  }
}

function isKitchenEvent(event: OperationsRealtimeEnvelope['event']) {
  return event === 'kitchen.item.queued' || event === 'kitchen.item.updated'
}

function applyLivePatches(
  queryClient: QueryClient,
  envelope: OperationsRealtimeEnvelope,
  result: OperationsRealtimePatchResult,
) {
  const liveQueries = queryClient.getQueriesData<OperationsLiveResponse>({
    queryKey: OPERATIONS_LIVE_QUERY_PREFIX,
  })

  for (const [queryKey, current] of liveQueries) {
    if (!current) {continue}

    const next = patchOperationsSnapshot(current, envelope)
    if (!next) {
      result.liveNeedsRefresh = true
      continue
    }

    if (next !== current) {
      queryClient.setQueryData(queryKey, next)
    }
    result.livePatched = true
  }
}

function applyKitchenPatch(
  queryClient: QueryClient,
  envelope: OperationsRealtimeEnvelope,
  result: OperationsRealtimePatchResult,
) {
  const kitchenSnapshot = queryClient.getQueryData<OperationsKitchenSnapshot>(OPERATIONS_KITCHEN_QUERY_KEY)
  if (!kitchenSnapshot) {return}

  const nextKitchenSnapshot = patchKitchenSnapshot(kitchenSnapshot, envelope)
  if (!nextKitchenSnapshot) {
    if (isKitchenEvent(envelope.event)) {result.kitchenNeedsRefresh = true}
    return
  }

  if (nextKitchenSnapshot !== kitchenSnapshot) {
    queryClient.setQueryData(OPERATIONS_KITCHEN_QUERY_KEY, nextKitchenSnapshot)
  }
  result.kitchenPatched = true
}

function applySummaryPatch(
  queryClient: QueryClient,
  envelope: OperationsRealtimeEnvelope,
  result: OperationsRealtimePatchResult,
) {
  const summarySnapshot = queryClient.getQueryData<OperationsSummaryResponse>(OPERATIONS_SUMMARY_QUERY_KEY)
  if (!summarySnapshot) {return}

  const nextSummarySnapshot = patchSummarySnapshot(summarySnapshot, envelope)
  if (!nextSummarySnapshot) {
    if (envelope.event === 'cash.closure.updated') {result.summaryNeedsRefresh = true}
    return
  }

  if (nextSummarySnapshot !== summarySnapshot) {
    queryClient.setQueryData(OPERATIONS_SUMMARY_QUERY_KEY, nextSummarySnapshot)
  }
  result.summaryPatched = true
}

function patchOperationsSnapshot(snapshot: OperationsLiveResponse, envelope: OperationsRealtimeEnvelope) {
  const payloadBusinessDate = asNullableString(envelope.payload.businessDate)
  if (payloadBusinessDate && payloadBusinessDate !== snapshot.businessDate) {
    return null
  }

  switch (envelope.event) {
    case 'comanda.opened':
      return upsertComandaFromEvent(snapshot, envelope.payload, 'OPEN', 1)
    case 'comanda.updated':
      return upsertComandaFromEvent(snapshot, envelope.payload)
    case 'comanda.closed':
      return closeComandaFromEvent(snapshot, envelope.payload)
    case 'kitchen.item.queued':
      return upsertKitchenItem(snapshot, envelope.payload, 'QUEUED')
    case 'kitchen.item.updated':
      return upsertKitchenItem(snapshot, envelope.payload)
    case 'cash.updated':
      return patchCashSession(snapshot, envelope.payload)
    case 'cash.closure.updated':
      return patchClosure(snapshot, envelope.payload)
    case 'cash.opened':
      return patchCashOpened(snapshot, envelope.payload)
    case 'mesa.upserted':
      return patchMesa(snapshot, envelope.payload)
    default:
      return null
  }
}

function patchKitchenSnapshot(snapshot: OperationsKitchenSnapshot, envelope: OperationsRealtimeEnvelope) {
  const payloadBusinessDate = asNullableString(envelope.payload.businessDate)
  if (payloadBusinessDate && payloadBusinessDate !== snapshot.businessDate) {
    return null
  }

  switch (envelope.event) {
    case 'comanda.opened':
    case 'comanda.updated':
    case 'comanda.closed':
      return patchKitchenFromComandaEvent(snapshot, envelope.payload)
    case 'kitchen.item.queued':
    case 'kitchen.item.updated':
      return patchKitchenFromItemEvent(snapshot, envelope.payload)
    default:
      return null
  }
}

function patchSummarySnapshot(snapshot: OperationsSummaryResponse, envelope: OperationsRealtimeEnvelope) {
  const payloadBusinessDate = asNullableString(envelope.payload.businessDate)
  if (payloadBusinessDate && payloadBusinessDate !== snapshot.businessDate) {
    return null
  }

  if (envelope.event !== 'cash.closure.updated') {
    return null
  }

  const nextKpis = patchSummaryKpis(snapshot.kpis, envelope.payload)
  if (!nextKpis) {
    return null
  }

  return {
    ...snapshot,
    kpis: nextKpis,
  }
}

function patchSummaryKpis(snapshot: OperationsSummaryResponse['kpis'], payload: Record<string, unknown>) {
  const expectedAmount = asNumber(payload.expectedAmount)
  const grossRevenueAmount = asNumber(payload.grossRevenueAmount)
  const realizedProfitAmount = asNumber(payload.realizedProfitAmount)
  const openComandasCount = asNumber(payload.openComandasCount)
  const pendingCashSessions = asNumber(payload.pendingCashSessions)

  if (
    expectedAmount == null &&
    grossRevenueAmount == null &&
    realizedProfitAmount == null &&
    openComandasCount == null &&
    pendingCashSessions == null
  ) {
    return null
  }

  const receitaRealizada = grossRevenueAmount ?? snapshot.receitaRealizada
  const lucroRealizado = realizedProfitAmount ?? snapshot.lucroRealizado
  const estimatedOpenMargin =
    receitaRealizada > 0 ? (lucroRealizado / receitaRealizada) * snapshot.faturamentoAberto : 0

  return {
    ...snapshot,
    caixaEsperado: expectedAmount ?? snapshot.caixaEsperado,
    receitaRealizada,
    lucroRealizado,
    faturamentoAberto: snapshot.faturamentoAberto,
    projecaoTotal: receitaRealizada + snapshot.faturamentoAberto,
    lucroEsperado: lucroRealizado + estimatedOpenMargin,
    openComandasCount: openComandasCount ?? snapshot.openComandasCount,
    openSessionsCount: pendingCashSessions ?? snapshot.openSessionsCount,
  }
}

function patchKitchenFromComandaEvent(snapshot: OperationsKitchenSnapshot, payload: Record<string, unknown>) {
  const comandaId = asString(payload.comandaId)
  const status = mapComandaStatus(asNullableString(payload.status))

  if (comandaId && status === 'CLOSED') {
    const nextItems = snapshot.items.filter((item) => item.comandaId !== comandaId)

    return {
      ...snapshot,
      items: nextItems,
      statusCounts: buildKitchenStatusCounts(nextItems),
    }
  }

  if (comandaId && payload.replaceKitchenItems === true) {
    const nextItems = snapshot.items.filter((item) => item.comandaId !== comandaId)
    const replacementItems = extractKitchenItemsFromPayload(payload)
      .filter((item) => !item.delivered)
      .map((item) => item.item)

    const mergedItems = [...nextItems, ...replacementItems].sort((left, right) => {
      const leftTime = left.kitchenQueuedAt ? new Date(left.kitchenQueuedAt).getTime() : 0
      const rightTime = right.kitchenQueuedAt ? new Date(right.kitchenQueuedAt).getTime() : 0
      return leftTime - rightTime
    })

    return {
      ...snapshot,
      items: mergedItems,
      statusCounts: buildKitchenStatusCounts(mergedItems),
    }
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

function patchKitchenFromItemEvent(snapshot: OperationsKitchenSnapshot, payload: Record<string, unknown>) {
  const item = buildKitchenItemFromPayload(payload)
  if (!item) {
    return null
  }

  return patchKitchenItem(snapshot, item)
}

function patchKitchenItem(snapshot: OperationsKitchenSnapshot, patch: ResolvedKitchenItemPatch) {
  const existingIndex = snapshot.items.findIndex((item) => item.itemId === patch.item.itemId)
  const nextItems = [...snapshot.items]

  if (patch.delivered) {
    if (existingIndex === -1) {
      return null
    }

    nextItems.splice(existingIndex, 1)
  } else if (existingIndex === -1) {
    nextItems.push(patch.item)
  } else {
    nextItems[existingIndex] = {
      ...nextItems[existingIndex],
      ...patch.item,
    }
  }

  return {
    ...snapshot,
    items: nextItems.sort((left, right) => {
      const leftTime = left.kitchenQueuedAt ? new Date(left.kitchenQueuedAt).getTime() : 0
      const rightTime = right.kitchenQueuedAt ? new Date(right.kitchenQueuedAt).getTime() : 0
      return leftTime - rightTime
    }),
    statusCounts: buildKitchenStatusCounts(nextItems),
  }
}

function buildKitchenStatusCounts(items: OperationsKitchenItemRecord[]) {
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

function extractKitchenItemsFromPayload(payload: Record<string, unknown>): ResolvedKitchenItemPatch[] {
  const kitchenItems = asArray(payload.kitchenItems)
  if (kitchenItems.length) {
    return kitchenItems
      .map((rawItem) =>
        buildKitchenItemFromPayload(
          rawItem && typeof rawItem === 'object' ? (rawItem as Record<string, unknown>) : {},
          undefined,
        ),
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

function buildKitchenItemPatchFromLegacyItem(
  payload: Record<string, unknown>,
  comandaId: string | null,
  mesaLabel: string | null,
  rawItem: unknown,
): ResolvedKitchenItemPatch | null {
  const item = asComandaItemRecord(rawItem)
  if (!item || !comandaId || !mesaLabel) {
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

function upsertComandaFromEvent(
  snapshot: OperationsLiveResponse,
  payload: Record<string, unknown>,
  fallbackStatus?: Extract<ComandaStatus, 'OPEN'>,
  fallbackOpenComandasDelta = 0,
) {
  const nextComanda = buildComandaFromPayload(snapshot, payload, fallbackStatus)
  if (!nextComanda) {
    return null
  }

  const existing = findComandaInSnapshot(snapshot, nextComanda.id)

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

function closeComandaFromEvent(snapshot: OperationsLiveResponse, payload: Record<string, unknown>) {
  const nextComanda = buildComandaFromPayload(snapshot, payload, 'CLOSED')
  if (!nextComanda) {
    return null
  }

  const existing = findComandaInSnapshot(snapshot, nextComanda.id)
  const nextSnapshot = upsertComandaRecord(snapshot, {
    ...nextComanda,
    status: 'CLOSED',
  })

  if (existing && existing.status !== 'CLOSED' && existing.status !== 'CANCELLED') {
    return patchClosureOpenComandasCount(nextSnapshot, -1)
  }

  return nextSnapshot
}

function buildComandaFromPayload(
  snapshot: OperationsLiveResponse,
  payload: Record<string, unknown>,
  fallbackStatus?: ComandaRecord['status'],
): ComandaRecord | null {
  const legacy = asComandaRecord(payload.comanda)
  const comandaId = legacy?.id ?? asString(payload.comandaId)
  if (!comandaId) {
    return null
  }

  const existing = findComandaInSnapshot(snapshot, comandaId)
  const fallbackEmployeeId = asNullableString(payload.currentEmployeeId) ?? asNullableString(payload.employeeId)
  const fallbackTableLabel = asString(payload.tableLabel) ?? asString(payload.mesaLabel)
  const fallbackOpenedAt = asString(payload.openedAt)
  const fallbackClosedAt = asNullableString(payload.closedAt)
  const fallbackItems = extractComandaItemsFromPayload(payload)
  const itemSource = legacy?.items?.length ? legacy.items : fallbackItems
  const openedAt = legacy?.openedAt ?? existing?.openedAt ?? fallbackOpenedAt
  if (!openedAt) {
    return null
  }

  return {
    id: comandaId,
    companyOwnerId: legacy?.companyOwnerId ?? existing?.companyOwnerId ?? snapshot.companyOwnerId,
    cashSessionId: legacy?.cashSessionId ?? existing?.cashSessionId ?? asNullableString(payload.cashSessionId),
    mesaId: legacy?.mesaId ?? existing?.mesaId ?? asNullableString(payload.mesaId),
    currentEmployeeId: legacy?.currentEmployeeId ?? existing?.currentEmployeeId ?? fallbackEmployeeId,
    tableLabel: legacy?.tableLabel ?? existing?.tableLabel ?? fallbackTableLabel ?? 'Mesa',
    customerName: legacy?.customerName ?? existing?.customerName ?? asNullableString(payload.customerName),
    customerDocument:
      legacy?.customerDocument ?? existing?.customerDocument ?? asNullableString(payload.customerDocument),
    participantCount:
      legacy?.participantCount ??
      existing?.participantCount ??
      (typeof payload.participantCount === 'number' ? payload.participantCount : 1),
    status:
      fallbackStatus ??
      mapComandaStatus(asNullableString(payload.status)) ??
      legacy?.status ??
      existing?.status ??
      'OPEN',
    subtotalAmount:
      legacy?.subtotalAmount ??
      (typeof payload.subtotalAmount === 'number'
        ? payload.subtotalAmount
        : typeof payload.subtotal === 'number'
          ? payload.subtotal
          : null) ??
      existing?.subtotalAmount ??
      0,
    discountAmount:
      legacy?.discountAmount ??
      (typeof payload.discountAmount === 'number' ? payload.discountAmount : null) ??
      existing?.discountAmount ??
      0,
    serviceFeeAmount:
      legacy?.serviceFeeAmount ??
      (typeof payload.serviceFeeAmount === 'number' ? payload.serviceFeeAmount : null) ??
      existing?.serviceFeeAmount ??
      0,
    totalAmount:
      legacy?.totalAmount ??
      (typeof payload.totalAmount === 'number' ? payload.totalAmount : null) ??
      existing?.totalAmount ??
      0,
    notes: legacy?.notes ?? existing?.notes ?? asNullableString(payload.notes),
    openedAt,
    closedAt: legacy?.closedAt ?? existing?.closedAt ?? fallbackClosedAt,
    items: itemSource ?? existing?.items ?? [],
  }
}

function extractComandaItemsFromPayload(payload: Record<string, unknown>): ComandaRecord['items'] | null {
  const rawItems = asArray(payload.items)
  if (!rawItems.length) {
    return null
  }

  const items: ComandaRecord['items'] = []
  for (const rawItem of rawItems) {
    const item = asComandaItemRecord(rawItem)
    if (!item) {
      continue
    }
    items.push(item)
  }

  return items.length ? items : null
}

function upsertKitchenItem(
  snapshot: OperationsLiveResponse,
  payload: Record<string, unknown>,
  fallbackStatus?: KitchenItemStatus,
) {
  const nextItem = buildKitchenItemFromPayload(payload, fallbackStatus)
  const nextComanda = buildComandaFromPayload(snapshot, payload)
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
  const nextSnapshot = upsertComandaRecord(snapshot, {
    ...baseComanda,
    items: mergedItems,
  })

  if (baseComanda.status === 'CLOSED' || baseComanda.status === 'CANCELLED') {
    return nextSnapshot
  }

  return nextSnapshot
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

  const nextComandaItem: ComandaRecord['items'][number] = {
    id: nextItem.item.itemId,
    productId: null,
    productName: nextItem.item.productName,
    quantity: nextItem.item.quantity,
    unitPrice: 0,
    totalAmount: 0,
    notes: nextItem.item.notes,
    kitchenStatus: nextItem.item.kitchenStatus,
    kitchenQueuedAt: nextItem.item.kitchenQueuedAt,
    kitchenReadyAt: nextItem.item.kitchenReadyAt,
  }

  const nextItems = [...items]
  nextItems[existingIndex] = {
    ...nextItems[existingIndex],
    ...nextComandaItem,
  }
  return nextItems
}

function buildKitchenItemFromPayload(
  payload: Record<string, unknown>,
  fallbackStatus?: KitchenItemStatus,
): ResolvedKitchenItemPatch | null {
  const legacyItem = asComandaItemRecord(payload.item)
  const itemId = legacyItem?.id ?? asString(payload.itemId)
  const comandaId = asString(payload.comandaId)
  const productName = legacyItem?.productName ?? asString(payload.productName)
  const mesaLabel = asString(payload.mesaLabel) ?? asString(payload.tableLabel)
  const quantity = legacyItem?.quantity ?? asNumber(payload.quantity)
  const rawStatus = asNullableString(payload.kitchenStatus) ?? legacyItem?.kitchenStatus ?? null
  const status = mapKitchenStatus(rawStatus)
  const employeeId = asNullableString(payload.employeeId) ?? asNullableString(payload.currentEmployeeId)
  const employeeName = asString(payload.employeeName)

  if (!itemId || !comandaId || !productName || !mesaLabel || quantity == null) {
    return null
  }

  const nextStatus = status ?? fallbackStatus ?? null
  const delivered = rawStatus === 'DELIVERED'

  return {
    delivered,
    item: {
      itemId,
      comandaId,
      mesaLabel,
      employeeId,
      employeeName: employeeName ?? 'Operação',
      productName,
      quantity,
      notes: asNullableString(payload.notes) ?? legacyItem?.notes ?? null,
      kitchenStatus: (nextStatus ?? 'QUEUED') as OperationsKitchenItemRecord['kitchenStatus'],
      kitchenQueuedAt: asNullableString(payload.kitchenQueuedAt) ?? legacyItem?.kitchenQueuedAt ?? null,
      kitchenReadyAt: asNullableString(payload.kitchenReadyAt) ?? legacyItem?.kitchenReadyAt ?? null,
    },
  }
}

function patchCashSession(snapshot: OperationsLiveResponse, payload: Record<string, unknown>) {
  const cashSession = asCashSessionRecord(payload.cashSession)
  if (!cashSession) {
    const cashSessionId = asString(payload.cashSessionId)
    if (!cashSessionId) {
      return null
    }

    return {
      ...snapshot,
      employees: snapshot.employees.map((group) =>
        group.cashSession?.id === cashSessionId
          ? withGroupMetrics({
              ...group,
              cashSession: {
                ...group.cashSession,
                status: mapCashSessionStatus(asNullableString(payload.status)) ?? group.cashSession.status,
                openingCashAmount: asNumber(payload.openingAmount) ?? group.cashSession.openingCashAmount,
                expectedCashAmount: asNumber(payload.expectedAmount) ?? group.cashSession.expectedCashAmount,
                countedCashAmount: asNullableNumber(payload.countedAmount) ?? group.cashSession.countedCashAmount,
                differenceAmount: asNullableNumber(payload.differenceAmount) ?? group.cashSession.differenceAmount,
              },
            })
          : group,
      ),
      unassigned:
        snapshot.unassigned.cashSession?.id === cashSessionId
          ? withGroupMetrics({
              ...snapshot.unassigned,
              cashSession: {
                ...snapshot.unassigned.cashSession,
                status:
                  mapCashSessionStatus(asNullableString(payload.status)) ?? snapshot.unassigned.cashSession.status,
                openingCashAmount: asNumber(payload.openingAmount) ?? snapshot.unassigned.cashSession.openingCashAmount,
                expectedCashAmount:
                  asNumber(payload.expectedAmount) ?? snapshot.unassigned.cashSession.expectedCashAmount,
                countedCashAmount:
                  asNullableNumber(payload.countedAmount) ?? snapshot.unassigned.cashSession.countedCashAmount,
                differenceAmount:
                  asNullableNumber(payload.differenceAmount) ?? snapshot.unassigned.cashSession.differenceAmount,
              },
            })
          : snapshot.unassigned,
    }
  }

  const target = resolveTargetGroup(snapshot, cashSession.employeeId)
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

function patchCashOpened(snapshot: OperationsLiveResponse, payload: Record<string, unknown>) {
  const cashSession = asCashSessionRecord(payload.cashSession)
  if (!cashSession) {
    return null
  }

  const target = resolveTargetGroup(snapshot, cashSession.employeeId)
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

function patchClosure(snapshot: OperationsLiveResponse, payload: Record<string, unknown>) {
  if (!snapshot.closure) {
    return null
  }

  return {
    ...snapshot,
    closure: {
      ...snapshot.closure,
      status: mapClosureStatus(asNullableString(payload.status)) ?? snapshot.closure.status,
      expectedCashAmount: asNumber(payload.expectedAmount) ?? snapshot.closure.expectedCashAmount,
      grossRevenueAmount: asNumber(payload.grossRevenueAmount) ?? snapshot.closure.grossRevenueAmount,
      realizedProfitAmount: asNumber(payload.realizedProfitAmount) ?? snapshot.closure.realizedProfitAmount,
      countedCashAmount: asNullableNumber(payload.countedAmount) ?? snapshot.closure.countedCashAmount,
      differenceAmount: asNullableNumber(payload.differenceAmount) ?? snapshot.closure.differenceAmount,
      openSessionsCount: asNumber(payload.pendingCashSessions) ?? snapshot.closure.openSessionsCount,
      openComandasCount: asNumber(payload.openComandasCount) ?? snapshot.closure.openComandasCount,
    },
  }
}

function patchClosureOpenComandasCount(snapshot: OperationsLiveResponse, delta: number) {
  if (!snapshot.closure) {
    return snapshot
  }

  return {
    ...snapshot,
    closure: {
      ...snapshot.closure,
      openComandasCount: Math.max(0, snapshot.closure.openComandasCount + delta),
    },
  }
}

function patchMesa(snapshot: OperationsLiveResponse, payload: Record<string, unknown>) {
  const mesa = asMesaRecord(payload.mesa)
  if (mesa) {
    return {
      ...snapshot,
      mesas: upsertMesa(snapshot.mesas, mesa),
    }
  }

  const mesaId = asNullableString(payload.mesaId)
  const mesaLabel = asNullableString(payload.label) ?? asNullableString(payload.mesaLabel)
  const status = mapMesaStatus(asNullableString(payload.status))

  if (!status || (!mesaId && !mesaLabel)) {
    return null
  }

  return {
    ...snapshot,
    mesas: snapshot.mesas.map((mesa) =>
      mesa.id === mesaId || mesa.label === mesaLabel
        ? {
            ...mesa,
            status,
          }
        : mesa,
    ),
  }
}

function resolveTargetGroup(snapshot: OperationsLiveResponse, employeeId: string | null) {
  if (!employeeId) {
    return snapshot.unassigned
  }

  return snapshot.employees.find((group) => group.employeeId === employeeId) ?? null
}

function upsertComanda(list: ComandaRecord[], next: ComandaRecord) {
  const existing = list.find((comanda) => comanda.id === next.id)
  if (!existing) {
    return [next, ...list]
  }

  return list.map((comanda) => (comanda.id === next.id ? { ...existing, ...next } : comanda))
}

function findComandaInSnapshot(snapshot: OperationsLiveResponse, comandaId: string) {
  for (const group of [...snapshot.employees, snapshot.unassigned]) {
    const comanda = group.comandas.find((item) => item.id === comandaId)
    if (comanda) {
      return comanda
    }
  }

  return null
}

function upsertComandaRecord(snapshot: OperationsLiveResponse, nextComanda: ComandaRecord) {
  const groupsWithoutComanda = snapshot.employees.map((group) => ({
    ...group,
    comandas: group.comandas.filter((item) => item.id !== nextComanda.id),
  }))
  const unassignedWithoutComanda = {
    ...snapshot.unassigned,
    comandas: snapshot.unassigned.comandas.filter((item) => item.id !== nextComanda.id),
  }

  let targetWasVisible = false
  const employees = groupsWithoutComanda.map((group) => {
    if (group.employeeId !== nextComanda.currentEmployeeId) {
      return withGroupMetrics(group)
    }

    targetWasVisible = true
    return withGroupMetrics({
      ...group,
      comandas: upsertComanda(group.comandas, nextComanda),
    })
  })

  const shouldUseUnassigned = nextComanda.currentEmployeeId == null
  const unassigned = shouldUseUnassigned
    ? withGroupMetrics({
        ...unassignedWithoutComanda,
        comandas: upsertComanda(unassignedWithoutComanda.comandas, nextComanda),
      })
    : withGroupMetrics(unassignedWithoutComanda)

  return {
    ...snapshot,
    employees,
    unassigned,
    mesas: upsertMesaForComanda(
      snapshot.mesas,
      nextComanda,
      shouldUseUnassigned || targetWasVisible || findComandaInSnapshot(snapshot, nextComanda.id) != null,
    ),
  }
}

function upsertMesaForComanda(mesas: MesaRecord[], comanda: ComandaRecord, shouldTrack: boolean) {
  if (!shouldTrack) {
    return mesas
  }

  const nextStatus: MesaRecord['status'] = isOpenComandaStatus(comanda.status) ? 'ocupada' : 'livre'
  const nextComandaId = nextStatus === 'ocupada' ? comanda.id : null
  const nextEmployeeId = nextStatus === 'ocupada' ? comanda.currentEmployeeId : null

  return mesas.map((mesa) =>
    mesa.id === comanda.mesaId
      ? {
          ...mesa,
          status: nextStatus,
          comandaId: nextComandaId,
          employeeId: nextEmployeeId,
        }
      : mesa,
  )
}

function upsertMesa(mesas: MesaRecord[], next: MesaRecord) {
  const existing = mesas.find((mesa) => mesa.id === next.id)
  if (!existing) {
    return [...mesas, next]
  }

  return mesas.map((mesa) => (mesa.id === next.id ? { ...existing, ...next } : mesa))
}

function withGroupMetrics<T extends { comandas: ComandaRecord[] }>(group: T): T {
  const totalComandas = group.comandas.length
  const openComandas = group.comandas.filter((c) => isOpenComandaStatus(c.status)).length
  const totalAmount = group.comandas.reduce((sum, c) => sum + (Number(c.totalAmount) || 0), 0)

  return {
    ...group,
    metrics: { totalComandas, openComandas, totalAmount },
  } as T
}

function isOpenComandaStatus(status: ComandaStatus) {
  return status === 'OPEN' || status === 'IN_PREPARATION' || status === 'READY'
}

function mapComandaStatus(status: string | null): ComandaRecord['status'] | null {
  if (!status) {
    return null
  }
  const validStatuses: ComandaRecord['status'][] = ['OPEN', 'IN_PREPARATION', 'READY', 'CLOSED', 'CANCELLED']
  return validStatuses.includes(status as ComandaRecord['status']) ? (status as ComandaRecord['status']) : null
}

function mapKitchenStatus(status: string | null): KitchenItemStatus | null {
  if (!status) {
    return null
  }
  const validStatuses: KitchenItemStatus[] = ['QUEUED', 'IN_PREPARATION', 'READY', 'DELIVERED']
  return validStatuses.includes(status as KitchenItemStatus) ? (status as KitchenItemStatus) : null
}

function mapCashSessionStatus(status: string | null): CashSessionRecord['status'] | null {
  if (!status) {
    return null
  }
  const validStatuses: CashSessionRecord['status'][] = ['OPEN', 'CLOSED', 'FORCE_CLOSED']
  return validStatuses.includes(status as CashSessionRecord['status']) ? (status as CashSessionRecord['status']) : null
}

function mapClosureStatus(status: string | null): CashClosureStatus | null {
  if (!status) {
    return null
  }
  const statusMap: Record<string, CashClosureStatus> = {
    OPEN: 'OPEN',
    PENDING: 'PENDING_EMPLOYEE_CLOSE',
    PENDING_EMPLOYEE_CLOSE: 'PENDING_EMPLOYEE_CLOSE',
    CLOSED: 'CLOSED',
    FORCE_CLOSED: 'FORCE_CLOSED',
  }
  return statusMap[status] ?? null
}

function mapMesaStatus(status: string | null): MesaRecord['status'] | null {
  if (!status) {
    return null
  }
  const validStatuses: MesaRecord['status'][] = ['livre', 'ocupada', 'reservada']
  return validStatuses.includes(status as MesaRecord['status']) ? (status as MesaRecord['status']) : null
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value
  }
  return null
}

function asNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && !Number.isNaN(value) ? value : null
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function asComandaRecord(value: unknown): ComandaRecord | null {
  if (!value || typeof value !== 'object') {
    return null
  }
  const record = value as Record<string, unknown>
  if (!record.id || typeof record.id !== 'string') {
    return null
  }
  return record as unknown as ComandaRecord
}

function asComandaItemRecord(value: unknown): ComandaRecord['items'][number] | null {
  if (!value || typeof value !== 'object') {
    return null
  }
  const record = value as Record<string, unknown>
  if (!record.id || typeof record.id !== 'string') {
    return null
  }
  return record as unknown as ComandaRecord['items'][number]
}

function asCashSessionRecord(value: unknown): CashSessionRecord | null {
  if (!value || typeof value !== 'object') {
    return null
  }
  const record = value as Record<string, unknown>
  if (!record.id || typeof record.id !== 'string') {
    return null
  }
  return record as unknown as CashSessionRecord
}

function asMesaRecord(value: unknown): MesaRecord | null {
  if (!value || typeof value !== 'object') {
    return null
  }
  const record = value as Record<string, unknown>
  if (!record.id || typeof record.id !== 'string') {
    return null
  }
  return record as unknown as MesaRecord
}
