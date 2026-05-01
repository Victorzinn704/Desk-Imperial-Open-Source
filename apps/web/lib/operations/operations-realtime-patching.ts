import type { QueryClient } from '@tanstack/react-query'
import type { OperationsLiveResponse, OperationsSummaryResponse } from '@contracts/contracts'
import {
  OPERATIONS_KITCHEN_QUERY_KEY,
  OPERATIONS_LIVE_QUERY_PREFIX,
  OPERATIONS_SUMMARY_QUERY_KEY,
} from '@/lib/operations/operations-query'
import { buildOperationsExecutiveKpis, buildTopProducts } from '@/lib/operations/operations-kpis'
import type { OperationsRealtimeEnvelope } from '@/components/operations/hooks/use-operations-socket'
import {
  asNullableString as asRealtimeNullableString,
  asNumber as asRealtimeNumber,
} from './operations-realtime-coercion'
import { patchKitchenFromComandaEvent, patchKitchenFromItemEvent } from './operations-realtime-kitchen.patchers'
import {
  closeComandaFromEvent,
  patchCashOpened,
  patchCashSession,
  patchClosure,
  patchMesa,
  upsertComandaFromEvent,
  upsertKitchenItem,
} from './operations-realtime-live.patchers'
import type { OperationsKitchenSnapshot } from './operations-realtime-types'

type OperationsRealtimePatchResult = {
  livePatched: boolean
  liveNeedsRefresh: boolean
  kitchenPatched: boolean
  kitchenNeedsRefresh: boolean
  summaryPatched: boolean
  summaryNeedsRefresh: boolean
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
    envelope.event === 'comanda.closed' ||
    (envelope.event === 'comanda.updated' &&
      (envelope.payload.requiresKitchenRefresh === true || envelope.payload.replaceKitchenItems === true))
  )
}

export function requiresSummaryRefresh(event: OperationsRealtimeEnvelope['event']) {
  return event === 'comanda.opened' || event === 'comanda.updated' || event === 'comanda.closed'
}

export function syncSummarySnapshotFromLive(
  summarySnapshot: OperationsSummaryResponse | null | undefined,
  liveSnapshot: OperationsLiveResponse | null | undefined,
) {
  if (!(summarySnapshot && liveSnapshot)) {
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
    if (!current) {
      continue
    }

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
  if (!kitchenSnapshot) {
    return
  }

  const nextKitchenSnapshot = patchKitchenSnapshot(kitchenSnapshot, envelope)
  if (!nextKitchenSnapshot) {
    if (isKitchenEvent(envelope.event)) {
      result.kitchenNeedsRefresh = true
    }
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
  if (!summarySnapshot) {
    return
  }

  const nextSummarySnapshot = patchSummarySnapshot(summarySnapshot, envelope)
  if (!nextSummarySnapshot) {
    if (envelope.event === 'cash.closure.updated') {
      result.summaryNeedsRefresh = true
    }
    return
  }

  if (nextSummarySnapshot !== summarySnapshot) {
    queryClient.setQueryData(OPERATIONS_SUMMARY_QUERY_KEY, nextSummarySnapshot)
  }
  result.summaryPatched = true
}

function patchOperationsSnapshot(snapshot: OperationsLiveResponse, envelope: OperationsRealtimeEnvelope) {
  const payloadBusinessDate = asRealtimeNullableString(envelope.payload.businessDate)
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
  const payloadBusinessDate = asRealtimeNullableString(envelope.payload.businessDate)
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
  const payloadBusinessDate = asRealtimeNullableString(envelope.payload.businessDate)
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
  const expectedAmount = asRealtimeNumber(payload.expectedAmount)
  const grossRevenueAmount = asRealtimeNumber(payload.grossRevenueAmount)
  const realizedProfitAmount = asRealtimeNumber(payload.realizedProfitAmount)
  const openComandasCount = asRealtimeNumber(payload.openComandasCount)
  const pendingCashSessions = asRealtimeNumber(payload.pendingCashSessions)

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
