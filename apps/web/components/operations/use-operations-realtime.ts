'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import type { OperationsLiveResponse, OperationsSummaryResponse } from '@contracts/contracts'
import { toast } from 'sonner'
import {
  fetchUserNotificationPreferences,
  type UserNotificationPreference,
  USER_NOTIFICATION_PREFERENCES_QUERY_KEY,
} from '@/lib/api'
import {
  OPERATIONS_KITCHEN_QUERY_KEY,
  OPERATIONS_LIVE_COMPACT_QUERY_KEY,
  OPERATIONS_LIVE_QUERY_PREFIX,
  OPERATIONS_SUMMARY_QUERY_KEY,
  invalidateOperationsWorkspace,
  settleScheduledOperationsWorkspaceReconcile,
} from '@/lib/operations/operations-query'
import {
  detectOperationsRealtimeEnvelopeOutOfOrder,
  recordOperationsRealtimeEnvelopeDropped,
  recordOperationsRealtimeEnvelopeProcessed,
  recordOperationsRealtimeEnvelopeOutOfOrder,
  recordOperationsReconnectRefreshEvent,
} from '@/lib/operations/operations-performance-diagnostics'
import { OPERATIONS_EVENTS, type OperationsRealtimeEnvelope, type RealtimeStatus, useOperationsSocket } from './hooks/use-operations-socket'
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
  const notifiedEnvelopeIdsRef = useRef<string[]>([])

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
    if (!enabled || !notificationChannel) {
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

    try {
      await Promise.all([
        invalidateOperationsWorkspace(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
          includeOrders: true,
          includeFinance: true,
        }),
        queryClient.invalidateQueries({ queryKey: ['mesas'] }),
      ])
      recordOperationsReconnectRefreshEvent({
        status: 'success',
        durationMs: Math.max(0, now() - startedAt),
        invalidatedMesas: true,
      })
    } catch (error) {
      recordOperationsReconnectRefreshEvent({
        status: 'error',
        durationMs: Math.max(0, now() - startedAt),
        invalidatedMesas: true,
      })
      throw error
    }
  }, [queryClient])

  const queueOperationsRefresh = useCallback(() => {
    if (operationsTimerRef.current) {clearTimeout(operationsTimerRef.current)}
    operationsTimerRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: OPERATIONS_LIVE_QUERY_PREFIX })
      queryClient.invalidateQueries({ queryKey: ['mesas'] })
    }, OPERATIONS_DEBOUNCE_MS)
  }, [queryClient])

  const queueCommercialRefresh = useCallback(() => {
    if (commercialTimerRef.current) {clearTimeout(commercialTimerRef.current)}
    commercialTimerRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] })
    }, COMMERCIAL_DEBOUNCE_MS)
  }, [queryClient])

  const queueKitchenRefresh = useCallback(() => {
    if (kitchenTimerRef.current) {clearTimeout(kitchenTimerRef.current)}
    kitchenTimerRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: OPERATIONS_KITCHEN_QUERY_KEY })
    }, OPERATIONS_DEBOUNCE_MS)
  }, [queryClient])

  const queueSummaryRefresh = useCallback(() => {
    if (summaryTimerRef.current) {clearTimeout(summaryTimerRef.current)}
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
        queueOperationsRefresh()
        queueKitchenRefresh()
        queueSummaryRefresh()
        return
      }

      const startedAt = now()
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

      const isSelfEvent = Boolean(
        currentUserId && envelope.actorUserId && currentUserId === envelope.actorUserId,
      )

      maybeNotifyRealtimeStatusChange(
        envelope,
        currentUserId,
        notifiedEnvelopeIdsRef.current,
        notificationChannel,
        queryClient,
      )

      const patchResult = applyRealtimeEnvelope(queryClient, envelope)

      const summarySyncedFromLive = patchResult.livePatched ? syncSummaryFromLive() : false

      if (isSelfEvent) {
        const satisfiedLive = patchResult.livePatched && !patchResult.liveNeedsRefresh
        const satisfiedKitchen =
          requiresKitchenRefresh(envelope) && patchResult.kitchenPatched && !patchResult.kitchenNeedsRefresh
        const satisfiedSummary =
          requiresSummaryRefresh(envelope.event) &&
          (summarySyncedFromLive || (patchResult.summaryPatched && !patchResult.summaryNeedsRefresh))

        if (satisfiedLive || satisfiedKitchen || satisfiedSummary) {
          settleScheduledOperationsWorkspaceReconcile(queryClient, OPERATIONS_LIVE_QUERY_PREFIX, {
            includeLive: satisfiedLive,
            includeKitchen: satisfiedKitchen,
            includeSummary: satisfiedSummary,
          })
        }
      }

      if (!patchResult.livePatched || patchResult.liveNeedsRefresh) {
        queueOperationsRefresh()
      }

      if (requiresKitchenRefresh(envelope) && (!patchResult.kitchenPatched || patchResult.kitchenNeedsRefresh)) {
        queueKitchenRefresh()
      }

      if (
        requiresSummaryRefresh(envelope.event) &&
        !summarySyncedFromLive &&
        (!patchResult.summaryPatched || patchResult.summaryNeedsRefresh)
      ) {
        queueSummaryRefresh()
      }

      if (shouldRecordDroppedRealtimeEnvelope(queryClient, patchResult)) {
        recordOperationsRealtimeEnvelopeDropped({
          event: envelope.event,
          entityKey,
          reason: 'no-applicable-snapshot',
        })
      }

      if (envelope.event === 'comanda.closed' && !isSelfEvent) {
        queueCommercialRefresh()
      }

      if (patchResult.livePatched || patchResult.kitchenPatched) {
        recordRealtimeEnvelopeProcessing(envelope, isSelfEvent, startedAt, patchResult)
        return
      }

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

  const { status } = useOperationsSocket(enabled, handleEvent, refreshBaseline, handleSocketError)

  return { status }
}

function recordRealtimeEnvelopeProcessing(
  envelope: OperationsRealtimeEnvelope,
  isSelfEvent: boolean,
  startedAt: number,
  patchResult: ReturnType<typeof applyRealtimeEnvelope>,
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

  const hasActiveLiveSnapshot = queryClient.getQueriesData<OperationsLiveResponse>({
    queryKey: OPERATIONS_LIVE_QUERY_PREFIX,
  }).some(([, snapshot]) => Boolean(snapshot))
  const hasActiveKitchenSnapshot = Boolean(queryClient.getQueryData(OPERATIONS_KITCHEN_QUERY_KEY))
  const hasActiveSummarySnapshot = Boolean(queryClient.getQueryData(OPERATIONS_SUMMARY_QUERY_KEY))

  return hasActiveLiveSnapshot || hasActiveKitchenSnapshot || hasActiveSummarySnapshot
}

function maybeNotifyRealtimeStatusChange(
  envelope: OperationsRealtimeEnvelope,
  currentUserId: string | null,
  notifiedEnvelopeIds: string[],
  notificationChannel: UserNotificationPreference['channel'] | null,
  queryClient: QueryClient,
) {
  if (currentUserId && envelope.actorUserId && currentUserId === envelope.actorUserId) {
    return
  }

  if (envelope.id) {
    if (notifiedEnvelopeIds.includes(envelope.id)) {
      return
    }

    notifiedEnvelopeIds.push(envelope.id)
    if (notifiedEnvelopeIds.length > 40) {
      notifiedEnvelopeIds.splice(0, notifiedEnvelopeIds.length - 40)
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
  switch (envelope.event) {
    case 'comanda.updated': {
      const previousStatus = mapComandaStatus(asString(envelope.payload.previousStatus))
      const nextStatus = mapComandaStatus(asString(envelope.payload.status))
      if (!previousStatus || !nextStatus || previousStatus === nextStatus) {
        return null
      }

      const mesaLabel = asString(envelope.payload.mesaLabel) ?? 'Mesa'
      return {
        eventType: 'operations.comanda.status_changed' as const,
        tone: nextStatus === 'READY' ? 'success' as const : 'info' as const,
        message: `${mesaLabel} mudou para ${formatComandaStatus(nextStatus)}.`,
      }
    }
    case 'comanda.closed': {
      const mesaLabel = asString(envelope.payload.mesaLabel) ?? 'Mesa'
      return {
        eventType: 'operations.comanda.status_changed' as const,
        tone: 'success' as const,
        message: `${mesaLabel} foi fechada no PDV.`,
      }
    }
    case 'kitchen.item.updated': {
      const nextStatus = mapKitchenStatus(asString(envelope.payload.kitchenStatus))
      if (!nextStatus) {
        return null
      }

      const mesaLabel = asString(envelope.payload.mesaLabel) ?? 'Mesa'
      const productName = asString(envelope.payload.productName) ?? 'Item'
      return {
        eventType: 'operations.kitchen_item.status_changed' as const,
        tone: nextStatus === 'READY' || nextStatus === 'DELIVERED' ? 'success' as const : 'info' as const,
        message: `${mesaLabel} · ${productName} -> ${formatKitchenStatus(nextStatus)}.`,
      }
    }
    default:
      return null
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
