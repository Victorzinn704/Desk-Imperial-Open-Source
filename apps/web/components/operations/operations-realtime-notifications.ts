import type { QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { USER_NOTIFICATION_PREFERENCES_QUERY_KEY, type UserNotificationPreference } from '@/lib/api'
import { asString, mapComandaStatus, mapKitchenStatus } from '@/lib/operations/operations-realtime-coercion'
import type { OperationsRealtimeEnvelope } from './hooks/use-operations-socket'

export type NotifiedEnvelopeIds = {
  order: string[]
  set: Set<string>
}

export function maybeNotifyRealtimeStatusChange(
  envelope: OperationsRealtimeEnvelope,
  currentUserId: string | null,
  notifiedEnvelopeIds: NotifiedEnvelopeIds,
  notificationChannel: UserNotificationPreference['channel'] | null,
  queryClient: QueryClient,
) {
  if (isEnvelopeFromCurrentUser(envelope, currentUserId)) {
    return
  }

  if (!trackNotifiedEnvelopeId(envelope.id, notifiedEnvelopeIds)) {
    return
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

function isEnvelopeFromCurrentUser(envelope: OperationsRealtimeEnvelope, currentUserId: string | null) {
  return Boolean(currentUserId && envelope.actorUserId && currentUserId === envelope.actorUserId)
}

function trackNotifiedEnvelopeId(envelopeId: string | undefined, notifiedEnvelopeIds: NotifiedEnvelopeIds) {
  if (!envelopeId) {
    return true
  }

  if (notifiedEnvelopeIds.set.has(envelopeId)) {
    return false
  }

  notifiedEnvelopeIds.set.add(envelopeId)
  notifiedEnvelopeIds.order.push(envelopeId)
  while (notifiedEnvelopeIds.order.length > 40) {
    const evicted = notifiedEnvelopeIds.order.shift()
    if (evicted) {
      notifiedEnvelopeIds.set.delete(evicted)
    }
  }

  return true
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
  if (!previousStatus || !nextStatus) {
    return null
  }

  if (previousStatus === nextStatus) {
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
    tone: isKitchenSuccessStatus(nextStatus) ? ('success' as const) : ('info' as const),
    message: `${mesaLabel} · ${productName} -> ${formatKitchenStatus(nextStatus)}.`,
  }
}

function isKitchenSuccessStatus(status: NonNullable<ReturnType<typeof mapKitchenStatus>>) {
  return status === 'READY' || status === 'DELIVERED'
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

type ComandaStatus = NonNullable<ReturnType<typeof mapComandaStatus>>
type KitchenStatus = NonNullable<ReturnType<typeof mapKitchenStatus>>

const COMANDA_STATUS_LABELS: Record<ComandaStatus, string> = {
  OPEN: 'aberta',
  IN_PREPARATION: 'em preparo',
  READY: 'pronta',
  CLOSED: 'fechada',
  CANCELLED: 'cancelada',
}

const KITCHEN_STATUS_LABELS: Record<KitchenStatus, string> = {
  QUEUED: 'na fila',
  IN_PREPARATION: 'em preparo',
  READY: 'pronto',
  DELIVERED: 'entregue',
}

function formatStatus<T extends string>(status: T, labels: Partial<Record<T, string>>, fallback: string) {
  return labels[status] ?? fallback
}

function formatComandaStatus(status: ComandaStatus) {
  return formatStatus(status, COMANDA_STATUS_LABELS, 'atualizada')
}

function formatKitchenStatus(status: KitchenStatus) {
  return formatStatus(status, KITCHEN_STATUS_LABELS, 'atualizado')
}
