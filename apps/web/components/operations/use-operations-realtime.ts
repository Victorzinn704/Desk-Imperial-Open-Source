'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import type { OperationsLiveResponse, OperationsSummaryResponse } from '@contracts/contracts'
import { toast } from 'sonner'
import {
  fetchUserNotificationPreferences,
  USER_NOTIFICATION_PREFERENCES_QUERY_KEY,
  type UserNotificationPreference,
} from '@/lib/api'
import {
  invalidateOperationsWorkspace,
  OPERATIONS_KITCHEN_QUERY_KEY,
  OPERATIONS_LIVE_COMPACT_QUERY_KEY,
  OPERATIONS_LIVE_QUERY_PREFIX,
  OPERATIONS_SUMMARY_QUERY_KEY,
  settleScheduledOperationsWorkspaceReconcile,
} from '@/lib/operations/operations-query'
import {
  detectOperationsRealtimeEnvelopeOutOfOrder,
  recordOperationsRealtimeEnvelopeDropped,
  recordOperationsRealtimeEnvelopeOutOfOrder,
  recordOperationsRealtimeEnvelopeProcessed,
  recordOperationsReconnectRefreshEvent,
} from '@/lib/operations/operations-performance-diagnostics'
import {
  OPERATIONS_EVENTS,
  type OperationsRealtimeEnvelope,
  type RealtimeStatus,
  useOperationsSocket,
} from './hooks/use-operations-socket'
import {
  applyRealtimeEnvelope,
  requiresKitchenRefresh,
  requiresSummaryRefresh,
  syncSummarySnapshotFromLive,
} from '@/lib/operations/operations-realtime-patching'
import { asString, mapComandaStatus, mapKitchenStatus } from '@/lib/operations/operations-realtime-coercion'

// Debounce para operações (200ms) e comercial (500ms para coalescer múltiplos closes)
const OPERATIONS_DEBOUNCE_MS = 200
const COMMERCIAL_DEBOUNCE_MS = 500
const SUMMARY_DEBOUNCE_MS = 1_500
// Janela de dedup por envelope.id (FIFO). Cobre rede instável que retransmite o mesmo evento.
const MAX_PROCESSED_ENVELOPE_IDS = 200
// Buffer de envelopes recebidos durante reidratação REST. Acima disso, prefere descartar e re-baseline.
const MAX_REIDRATATION_BUFFER = 100

export type { RealtimeStatus } from './hooks/use-operations-socket'
export { OPERATIONS_EVENTS }
export { applyRealtimeEnvelope } from '@/lib/operations/operations-realtime-patching'

type UseOperationsRealtimeOptions = {
  currentUserId?: string | null
  notificationChannel?: UserNotificationPreference['channel'] | null
}

export function useOperationsRealtime(
  enabled: boolean,
  queryClient: QueryClient,
  options: UseOperationsRealtimeOptions = {},
): { status: RealtimeStatus } {
  const currentUserId = options.currentUserId ?? null
  const notificationChannel = options.notificationChannel ?? null
  const operationsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const kitchenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const summaryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const commercialTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const notifiedEnvelopeIdsRef = useRef<{ set: Set<string>; order: string[] }>({ set: new Set(), order: [] })
  // Idempotência de patch: dedup por envelope.id em janela FIFO (cap em MAX_PROCESSED_ENVELOPE_IDS).
  const processedEnvelopeIdsRef = useRef<Set<string>>(new Set())
  const processedEnvelopeIdsOrderRef = useRef<string[]>([])
  // Reidratação REST: durante refreshBaseline, envelopes WS são bufferizados e drenados na ordem após o refetch resolver.
  const isSyncingRef = useRef(false)
  const reidratationBufferRef = useRef<OperationsRealtimeEnvelope[]>([])
  // Permite refreshBaseline drenar via handleEvent sem criar dependência circular no useCallback.
  const handleEventRef = useRef<(envelope?: OperationsRealtimeEnvelope) => void>(() => {})

  useEffect(
    () => () => {
      for (const timerRef of [operationsTimerRef, kitchenTimerRef, summaryTimerRef, commercialTimerRef]) {
        if (timerRef.current) {
          clearTimeout(timerRef.current)
          timerRef.current = null
        }
      }
    },
    [],
  )

  useEffect(() => {
    if (!(enabled && notificationChannel)) {
      return
    }

    void queryClient.fetchQuery({
      queryKey: [...USER_NOTIFICATION_PREFERENCES_QUERY_KEY],
      queryFn: fetchUserNotificationPreferences,
      staleTime: 30_000,
    })
  }, [enabled, notificationChannel, queryClient])

  const refreshBaseline = useCallback(async () => {
    const startedAt = now()
    // Abre janela de reidratação: envelopes que chegarem agora vão pro buffer em vez de patchear estado stale.
    isSyncingRef.current = true
    reidratationBufferRef.current = []
    // Reset da janela de dedup — envelopes pós-baseline são processados de novo, mesmo que id colida com pré-queda.
    processedEnvelopeIdsRef.current.clear()
    processedEnvelopeIdsOrderRef.current.length = 0

    try {
      await Promise.all([
        invalidateOperationsWorkspace(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
          includeOrders: true,
          includeFinance: true,
        }),
        queryClient.invalidateQueries({ queryKey: ['mesas'] }),
      ])
      // Fecha janela ANTES de drenar para que o handleEvent processe normalmente cada um.
      isSyncingRef.current = false
      const buffered = reidratationBufferRef.current
      reidratationBufferRef.current = []
      for (const envelope of buffered) {
        handleEventRef.current?.(envelope)
      }
      recordOperationsReconnectRefreshEvent({
        status: 'success',
        durationMs: Math.max(0, now() - startedAt),
        invalidatedMesas: true,
      })
    } catch (error) {
      isSyncingRef.current = false
      const droppedOnError = reidratationBufferRef.current
      reidratationBufferRef.current = []
      // Envelopes que estavam no buffer durante a falha não voltam ao fluxo (estado pré-erro pode estar stale).
      // Registra perda explícita pra dashboards distinguirem 'baseline-error' de outras razões de drop.
      for (const envelope of droppedOnError) {
        recordOperationsRealtimeEnvelopeDropped({
          event: envelope.event,
          entityKey: resolveRealtimeEnvelopeEntityKey(envelope),
          reason: 'baseline-error',
        })
      }
      recordOperationsReconnectRefreshEvent({
        status: 'error',
        durationMs: Math.max(0, now() - startedAt),
        invalidatedMesas: true,
      })
      throw error
    }
  }, [queryClient])

  const queueOperationsRefresh = useCallback(() => {
    if (operationsTimerRef.current) {
      clearTimeout(operationsTimerRef.current)
    }
    operationsTimerRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: OPERATIONS_LIVE_QUERY_PREFIX })
      queryClient.invalidateQueries({ queryKey: ['mesas'] })
    }, OPERATIONS_DEBOUNCE_MS)
  }, [queryClient])

  const queueCommercialRefresh = useCallback(() => {
    if (commercialTimerRef.current) {
      clearTimeout(commercialTimerRef.current)
    }
    commercialTimerRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] })
    }, COMMERCIAL_DEBOUNCE_MS)
  }, [queryClient])

  const queueKitchenRefresh = useCallback(() => {
    if (kitchenTimerRef.current) {
      clearTimeout(kitchenTimerRef.current)
    }
    kitchenTimerRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: OPERATIONS_KITCHEN_QUERY_KEY })
    }, OPERATIONS_DEBOUNCE_MS)
  }, [queryClient])

  const queueSummaryRefresh = useCallback(() => {
    if (summaryTimerRef.current) {
      clearTimeout(summaryTimerRef.current)
    }
    summaryTimerRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: OPERATIONS_SUMMARY_QUERY_KEY })
    }, SUMMARY_DEBOUNCE_MS)
  }, [queryClient])

  const syncSummaryFromLive = useCallback(() => {
    const liveSnapshot = queryClient.getQueryData<OperationsLiveResponse>(OPERATIONS_LIVE_COMPACT_QUERY_KEY)
    const summarySnapshot = queryClient.getQueryData<OperationsSummaryResponse>(OPERATIONS_SUMMARY_QUERY_KEY)
    const nextSummarySnapshot = syncSummarySnapshotFromLive(summarySnapshot, liveSnapshot)

    if (!nextSummarySnapshot) {
      return false
    }

    queryClient.setQueryData(OPERATIONS_SUMMARY_QUERY_KEY, nextSummarySnapshot)
    return true
  }, [queryClient])

  const handleEvent = useCallback(
    (envelope?: OperationsRealtimeEnvelope) => {
      if (!envelope) {
        queueRealtimeFallbackRefreshes({ queueOperationsRefresh, queueKitchenRefresh, queueSummaryRefresh })
        return
      }

      if (bufferRealtimeEnvelopeDuringSync(envelope, isSyncingRef.current, reidratationBufferRef.current)) {
        return
      }

      if (dropDuplicateRealtimeEnvelope(envelope, processedEnvelopeIdsRef.current)) {
        return
      }

      if (dropStaleBusinessDateEnvelope(queryClient, envelope)) {
        return
      }

      const startedAt = now()
      const entityKey = recordRealtimeEnvelopeOrdering(envelope)
      const isSelfEvent = isSelfRealtimeEnvelope(envelope, currentUserId)

      maybeNotifyRealtimeStatusChange(
        envelope,
        currentUserId,
        notifiedEnvelopeIdsRef.current,
        notificationChannel,
        queryClient,
      )

      const patchResult = applyRealtimeEnvelope(queryClient, envelope)

      const summarySyncedFromLive = patchResult.livePatched ? syncSummaryFromLive() : false

      settleSelfEventReconcile({ queryClient, envelope, isSelfEvent, patchResult, summarySyncedFromLive })
      queueRealtimeRefreshesAfterPatch({
        envelope,
        patchResult,
        summarySyncedFromLive,
        queueOperationsRefresh,
        queueKitchenRefresh,
        queueSummaryRefresh,
      })
      recordNoApplicableSnapshotDrop(queryClient, envelope, entityKey, patchResult)

      if (shouldQueueCommercialRefresh(envelope, isSelfEvent)) {
        queueCommercialRefresh()
      }

      rememberProcessedRealtimeEnvelope(envelope, processedEnvelopeIdsRef.current, processedEnvelopeIdsOrderRef.current)

      recordRealtimeEnvelopeProcessing(envelope, isSelfEvent, startedAt, patchResult)
    },
    [
      queryClient,
      queueCommercialRefresh,
      queueKitchenRefresh,
      queueOperationsRefresh,
      queueSummaryRefresh,
      syncSummaryFromLive,
      currentUserId,
      notificationChannel,
    ],
  )

  const handleSocketError = useCallback((message: string) => {
    toast.error(message)
  }, [])

  useEffect(() => {
    handleEventRef.current = handleEvent
  }, [handleEvent])

  const { status } = useOperationsSocket(enabled, handleEvent, refreshBaseline, handleSocketError)

  return { status }
}

type RefreshQueues = {
  queueOperationsRefresh: () => void
  queueKitchenRefresh: () => void
  queueSummaryRefresh: () => void
}

type PatchResult = ReturnType<typeof applyRealtimeEnvelope>

function queueRealtimeFallbackRefreshes({
  queueOperationsRefresh,
  queueKitchenRefresh,
  queueSummaryRefresh,
}: RefreshQueues) {
  queueOperationsRefresh()
  queueKitchenRefresh()
  queueSummaryRefresh()
}

function bufferRealtimeEnvelopeDuringSync(
  envelope: OperationsRealtimeEnvelope,
  isSyncing: boolean,
  buffer: OperationsRealtimeEnvelope[],
) {
  if (!isSyncing) {
    return false
  }

  // Reidratação em curso: bufferiza para drenar na ordem após o baseline REST resolver.
  if (buffer.length < MAX_REIDRATATION_BUFFER) {
    buffer.push(envelope)
    return true
  }

  recordOperationsRealtimeEnvelopeDropped({
    event: envelope.event,
    entityKey: resolveRealtimeEnvelopeEntityKey(envelope),
    reason: 'buffer-overflow',
  })
  return true
}

function dropDuplicateRealtimeEnvelope(envelope: OperationsRealtimeEnvelope, processedIds: Set<string>) {
  if (!(envelope.id && processedIds.has(envelope.id))) {
    return false
  }

  recordOperationsRealtimeEnvelopeDropped({
    event: envelope.event,
    entityKey: resolveRealtimeEnvelopeEntityKey(envelope),
    reason: 'duplicate-id',
  })
  return true
}

function dropStaleBusinessDateEnvelope(queryClient: QueryClient, envelope: OperationsRealtimeEnvelope) {
  const envelopeBusinessDate = asString(envelope.payload.businessDate)
  if (!envelopeBusinessDate) {
    return false
  }

  const liveSnapshot = queryClient.getQueryData<OperationsLiveResponse>(OPERATIONS_LIVE_COMPACT_QUERY_KEY)
  if (!(liveSnapshot?.businessDate && liveSnapshot.businessDate !== envelopeBusinessDate)) {
    return false
  }

  recordOperationsRealtimeEnvelopeDropped({
    event: envelope.event,
    entityKey: resolveRealtimeEnvelopeEntityKey(envelope),
    reason: 'stale-business-date',
  })
  return true
}

function recordRealtimeEnvelopeOrdering(envelope: OperationsRealtimeEnvelope) {
  const entityKey = resolveRealtimeEnvelopeEntityKey(envelope)
  const eventCreatedAtMs = parseRealtimeEnvelopeCreatedAt(envelope.createdAt)
  const outOfOrderLastSeenAt = detectOperationsRealtimeEnvelopeOutOfOrder(entityKey, eventCreatedAtMs)

  if (entityKey && eventCreatedAtMs != null && outOfOrderLastSeenAt != null) {
    recordOperationsRealtimeEnvelopeOutOfOrder({
      event: envelope.event,
      entityKey,
      eventCreatedAtMs,
      lastSeenCreatedAtMs: outOfOrderLastSeenAt,
    })
  }

  return entityKey
}

function isSelfRealtimeEnvelope(envelope: OperationsRealtimeEnvelope, currentUserId: string | null) {
  return Boolean(currentUserId && envelope.actorUserId && currentUserId === envelope.actorUserId)
}

function settleSelfEventReconcile({
  queryClient,
  envelope,
  isSelfEvent,
  patchResult,
  summarySyncedFromLive,
}: {
  queryClient: QueryClient
  envelope: OperationsRealtimeEnvelope
  isSelfEvent: boolean
  patchResult: PatchResult
  summarySyncedFromLive: boolean
}) {
  if (!isSelfEvent) {
    return
  }

  const satisfiedLive = patchResult.livePatched && !patchResult.liveNeedsRefresh
  const satisfiedKitchen =
    requiresKitchenRefresh(envelope) && patchResult.kitchenPatched && !patchResult.kitchenNeedsRefresh
  const satisfiedSummary =
    requiresSummaryRefresh(envelope.event) &&
    (summarySyncedFromLive || (patchResult.summaryPatched && !patchResult.summaryNeedsRefresh))

  if (!(satisfiedLive || satisfiedKitchen || satisfiedSummary)) {
    return
  }

  settleScheduledOperationsWorkspaceReconcile(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
    includeLive: satisfiedLive,
    includeKitchen: satisfiedKitchen,
    includeSummary: satisfiedSummary,
  })
}

function queueRealtimeRefreshesAfterPatch({
  envelope,
  patchResult,
  summarySyncedFromLive,
  queueOperationsRefresh,
  queueKitchenRefresh,
  queueSummaryRefresh,
}: RefreshQueues & {
  envelope: OperationsRealtimeEnvelope
  patchResult: PatchResult
  summarySyncedFromLive: boolean
}) {
  if (!patchResult.livePatched || patchResult.liveNeedsRefresh) {
    queueOperationsRefresh()
  }

  if (requiresKitchenRefresh(envelope) && (!patchResult.kitchenPatched || patchResult.kitchenNeedsRefresh)) {
    queueKitchenRefresh()
  }

  if (shouldRefreshSummaryAfterPatch(envelope, patchResult, summarySyncedFromLive)) {
    queueSummaryRefresh()
  }
}

function shouldRefreshSummaryAfterPatch(
  envelope: OperationsRealtimeEnvelope,
  patchResult: PatchResult,
  summarySyncedFromLive: boolean,
) {
  return (
    requiresSummaryRefresh(envelope.event) &&
    !summarySyncedFromLive &&
    (!patchResult.summaryPatched || patchResult.summaryNeedsRefresh)
  )
}

function recordNoApplicableSnapshotDrop(
  queryClient: QueryClient,
  envelope: OperationsRealtimeEnvelope,
  entityKey: string | null,
  patchResult: PatchResult,
) {
  if (!shouldRecordDroppedRealtimeEnvelope(queryClient, patchResult)) {
    return
  }

  recordOperationsRealtimeEnvelopeDropped({
    event: envelope.event,
    entityKey,
    reason: 'no-applicable-snapshot',
  })
}

function shouldQueueCommercialRefresh(envelope: OperationsRealtimeEnvelope, isSelfEvent: boolean) {
  return envelope.event === 'comanda.closed' && !isSelfEvent
}

function rememberProcessedRealtimeEnvelope(
  envelope: OperationsRealtimeEnvelope,
  processedIds: Set<string>,
  processedOrder: string[],
) {
  if (!envelope.id) {
    return
  }

  processedIds.add(envelope.id)
  processedOrder.push(envelope.id)
  while (processedOrder.length > MAX_PROCESSED_ENVELOPE_IDS) {
    const evicted = processedOrder.shift()
    if (evicted) {
      processedIds.delete(evicted)
    }
  }
}

function recordRealtimeEnvelopeProcessing(
  envelope: OperationsRealtimeEnvelope,
  isSelfEvent: boolean,
  startedAt: number,
  patchResult: PatchResult,
) {
  const durationMs = Math.max(0, now() - startedAt)

  afterNextPaint(() => {
    recordOperationsRealtimeEnvelopeProcessed({
      event: envelope.event,
      isSelfEvent,
      durationMs,
      paintDelayMs: Math.max(0, now() - startedAt),
      livePatched: patchResult.livePatched,
      liveNeedsRefresh: patchResult.liveNeedsRefresh,
      kitchenPatched: patchResult.kitchenPatched,
      kitchenNeedsRefresh: patchResult.kitchenNeedsRefresh,
      summaryPatched: patchResult.summaryPatched,
      summaryNeedsRefresh: patchResult.summaryNeedsRefresh,
    })
  })
}

function shouldRecordDroppedRealtimeEnvelope(
  queryClient: QueryClient,
  patchResult: ReturnType<typeof applyRealtimeEnvelope>,
) {
  if (
    patchResult.livePatched ||
    patchResult.kitchenPatched ||
    patchResult.summaryPatched ||
    patchResult.liveNeedsRefresh ||
    patchResult.kitchenNeedsRefresh ||
    patchResult.summaryNeedsRefresh
  ) {
    return false
  }

  const hasActiveLiveSnapshot = queryClient
    .getQueriesData<OperationsLiveResponse>({
      queryKey: OPERATIONS_LIVE_QUERY_PREFIX,
    })
    .some(([, snapshot]) => Boolean(snapshot))
  const hasActiveKitchenSnapshot = Boolean(queryClient.getQueryData(OPERATIONS_KITCHEN_QUERY_KEY))
  const hasActiveSummarySnapshot = Boolean(queryClient.getQueryData(OPERATIONS_SUMMARY_QUERY_KEY))

  return hasActiveLiveSnapshot || hasActiveKitchenSnapshot || hasActiveSummarySnapshot
}

function maybeNotifyRealtimeStatusChange(
  envelope: OperationsRealtimeEnvelope,
  currentUserId: string | null,
  notifiedEnvelopeIds: { set: Set<string>; order: string[] },
  notificationChannel: UserNotificationPreference['channel'] | null,
  queryClient: QueryClient,
) {
  if (currentUserId && envelope.actorUserId && currentUserId === envelope.actorUserId) {
    return
  }

  if (envelope.id) {
    if (notifiedEnvelopeIds.set.has(envelope.id)) {
      return
    }

    notifiedEnvelopeIds.set.add(envelope.id)
    notifiedEnvelopeIds.order.push(envelope.id)
    while (notifiedEnvelopeIds.order.length > 40) {
      const evicted = notifiedEnvelopeIds.order.shift()
      if (evicted) {
        notifiedEnvelopeIds.set.delete(evicted)
      }
    }
  }

  const notification = resolveRealtimeStatusNotification(envelope)
  if (!notification) {
    return
  }

  if (notificationChannel && !isRealtimeToastEnabled(queryClient, notificationChannel, notification.eventType)) {
    return
  }

  if (notification.tone === 'success') {
    toast.success(notification.message)
    return
  }

  toast.info(notification.message)
}

function resolveRealtimeStatusNotification(envelope: OperationsRealtimeEnvelope) {
  if (envelope.event === 'comanda.updated') {
    return resolveComandaUpdatedNotification(envelope)
  }

  if (envelope.event === 'comanda.closed') {
    return resolveComandaClosedNotification(envelope)
  }

  if (envelope.event === 'kitchen.item.updated') {
    return resolveKitchenItemUpdatedNotification(envelope)
  }

  return null
}

function resolveComandaUpdatedNotification(envelope: OperationsRealtimeEnvelope) {
  const previousStatus = mapComandaStatus(asString(envelope.payload.previousStatus))
  const nextStatus = mapComandaStatus(asString(envelope.payload.status))
  if (!(previousStatus && nextStatus) || previousStatus === nextStatus) {
    return null
  }

  const mesaLabel = asString(envelope.payload.mesaLabel) ?? 'Mesa'
  return {
    eventType: 'operations.comanda.status_changed' as const,
    tone: nextStatus === 'READY' ? ('success' as const) : ('info' as const),
    message: `${mesaLabel} mudou para ${formatComandaStatus(nextStatus)}.`,
  }
}

function resolveComandaClosedNotification(envelope: OperationsRealtimeEnvelope) {
  const mesaLabel = asString(envelope.payload.mesaLabel) ?? 'Mesa'
  return {
    eventType: 'operations.comanda.status_changed' as const,
    tone: 'success' as const,
    message: `${mesaLabel} foi fechada no PDV.`,
  }
}

function resolveKitchenItemUpdatedNotification(envelope: OperationsRealtimeEnvelope) {
  const nextStatus = mapKitchenStatus(asString(envelope.payload.kitchenStatus))
  if (!nextStatus) {
    return null
  }

  const mesaLabel = asString(envelope.payload.mesaLabel) ?? 'Mesa'
  const productName = asString(envelope.payload.productName) ?? 'Item'
  return {
    eventType: 'operations.kitchen_item.status_changed' as const,
    tone: nextStatus === 'READY' || nextStatus === 'DELIVERED' ? ('success' as const) : ('info' as const),
    message: `${mesaLabel} · ${productName} -> ${formatKitchenStatus(nextStatus)}.`,
  }
}

function isRealtimeToastEnabled(
  queryClient: QueryClient,
  notificationChannel: UserNotificationPreference['channel'],
  eventType: UserNotificationPreference['eventType'],
) {
  const snapshot = queryClient.getQueryData<{ preferences: UserNotificationPreference[] }>([
    ...USER_NOTIFICATION_PREFERENCES_QUERY_KEY,
  ])

  const preference = snapshot?.preferences.find(
    (entry) => entry.channel === notificationChannel && entry.eventType === eventType,
  )

  return preference?.enabled ?? true
}

function formatComandaStatus(status: NonNullable<ReturnType<typeof mapComandaStatus>>) {
  switch (status) {
    case 'OPEN':
      return 'aberta'
    case 'IN_PREPARATION':
      return 'em preparo'
    case 'READY':
      return 'pronta'
    case 'CLOSED':
      return 'fechada'
    case 'CANCELLED':
      return 'cancelada'
    default:
      return 'atualizada'
  }
}

function formatKitchenStatus(status: NonNullable<ReturnType<typeof mapKitchenStatus>>) {
  switch (status) {
    case 'QUEUED':
      return 'na fila'
    case 'IN_PREPARATION':
      return 'em preparo'
    case 'READY':
      return 'pronto'
    case 'DELIVERED':
      return 'entregue'
    default:
      return 'atualizado'
  }
}

function afterNextPaint(callback: () => void) {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(() => callback())
    return
  }

  callback()
}

function resolveRealtimeEnvelopeEntityKey(envelope: OperationsRealtimeEnvelope) {
  const payload = envelope.payload
  const entityId =
    readString(payload.comandaId) ??
    readString(payload.itemId) ??
    readString(payload.cashSessionId) ??
    readString(payload.closureId) ??
    readString(payload.mesaId)

  if (entityId) {
    return `${envelope.event}:${entityId}`
  }

  const businessDate = readString(payload.businessDate)
  if (businessDate) {
    return `${envelope.event}:${businessDate}`
  }

  return null
}

function parseRealtimeEnvelopeCreatedAt(createdAt: string | undefined) {
  if (!createdAt) {
    return null
  }

  const parsedAt = Date.parse(createdAt)
  return Number.isFinite(parsedAt) ? parsedAt : null
}

function readString(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function now() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now()
  }

  return Date.now()
}
