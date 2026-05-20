import type { OperationsRealtimeEnvelope } from '../operations-realtime/operations-realtime.types'
import type { NotificationEnvelope } from './notifications.types'
import { boldTelegram, metricLine } from './telegram-message-format'

export type ResolvedOperationsRealtimeNotification = {
  eventType: NotificationEnvelope['eventType']
  recipientScope: NotificationEnvelope['recipientScope']
  payload: Record<string, unknown>
  text: string
}

export function resolveOperationsRealtimeNotification(
  envelope: OperationsRealtimeEnvelope,
): ResolvedOperationsRealtimeNotification | null {
  switch (envelope.event) {
    case 'comanda.updated':
      return resolveComandaUpdatedNotification(envelope.payload)
    case 'comanda.closed':
      return resolveComandaClosedNotification(envelope.payload)
    case 'kitchen.item.updated':
      return resolveKitchenItemUpdatedNotification(envelope.payload)
    default:
      return null
  }
}

function resolveComandaUpdatedNotification(payload: unknown): ResolvedOperationsRealtimeNotification | null {
  const data = payload as Record<string, unknown>
  const previousStatus = asString(data.previousStatus)
  const nextStatus = asString(data.status)

  if (!(previousStatus && nextStatus) || previousStatus === nextStatus) {
    return null
  }

  const mesaLabel = asString(data.mesaLabel) ?? 'Mesa'
  const comandaId = asString(data.comandaId) ?? 'comanda'

  return {
    eventType: 'operations.comanda.status_changed',
    recipientScope: 'WORKSPACE_OWNER',
    payload: {
      comandaId,
      mesaLabel,
      previousStatus,
      status: nextStatus,
    },
    text: [
      '🔁 Atualização de comanda',
      '',
      metricLine('🍽️', 'Mesa', mesaLabel),
      metricLine('🧾', 'Comanda', shortComandaId(comandaId)),
      metricLine('📌', 'Status', `${formatComandaStatus(previousStatus)} → ${formatComandaStatus(nextStatus)}`),
    ].join('\n'),
  }
}

function resolveComandaClosedNotification(payload: unknown): ResolvedOperationsRealtimeNotification {
  const data = payload as Record<string, unknown>
  const mesaLabel = asString(data.mesaLabel) ?? 'Mesa'
  const comandaId = asString(data.comandaId) ?? 'comanda'
  const paymentMethod = asString(data.paymentMethod)

  return {
    eventType: 'operations.comanda.status_changed',
    recipientScope: 'WORKSPACE_OWNER',
    payload: {
      comandaId,
      mesaLabel,
      status: 'CLOSED',
      paymentMethod,
    },
    text: [
      '✅ Pagamento aprovado',
      '',
      boldTelegram('Comanda fechada com sucesso'),
      metricLine('🍽️', 'Mesa', mesaLabel),
      metricLine('🧾', 'Comanda', shortComandaId(comandaId)),
      metricLine('💳', 'Pagamento', paymentMethod ? formatPaymentMethod(paymentMethod) : 'Registrado'),
    ].join('\n'),
  }
}

function resolveKitchenItemUpdatedNotification(payload: unknown): ResolvedOperationsRealtimeNotification | null {
  const data = payload as Record<string, unknown>
  const kitchenStatus = asString(data.kitchenStatus)
  const previousKitchenStatus = asString(data.previousKitchenStatus)

  if (!kitchenStatus || previousKitchenStatus === kitchenStatus) {
    return null
  }

  const mesaLabel = asString(data.mesaLabel) ?? 'Mesa'
  const productName = asString(data.productName) ?? 'Item'

  return {
    eventType: 'operations.kitchen_item.status_changed',
    recipientScope: 'WORKSPACE_OWNER',
    payload: {
      mesaLabel,
      productName,
      previousKitchenStatus,
      kitchenStatus,
    },
    text: [
      '👨‍🍳 Cozinha',
      '',
      metricLine('🍽️', 'Mesa', mesaLabel),
      metricLine('📦', 'Item', productName),
      metricLine('🔥', 'Status', formatKitchenStatusTransition({ previousKitchenStatus, kitchenStatus })),
    ].join('\n'),
  }
}

function formatKitchenStatusTransition(params: { previousKitchenStatus: string | null; kitchenStatus: string }) {
  if (!params.previousKitchenStatus) {
    return formatKitchenStatus(params.kitchenStatus)
  }

  return `${formatKitchenStatus(params.previousKitchenStatus)} -> ${formatKitchenStatus(params.kitchenStatus)}`
}

function asString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function shortComandaId(comandaId: string) {
  return `#${comandaId.slice(-6).toUpperCase()}`
}

function formatComandaStatus(status: string) {
  switch (status) {
    case 'OPEN':
      return 'Aberta'
    case 'IN_PREPARATION':
      return 'Em preparo'
    case 'READY':
      return 'Pronta'
    case 'CLOSED':
      return 'Fechada'
    case 'CANCELLED':
      return 'Cancelada'
    default:
      return status
  }
}

function formatKitchenStatus(status: string) {
  switch (status) {
    case 'QUEUED':
      return 'Na fila'
    case 'IN_PREPARATION':
      return 'Em preparo'
    case 'READY':
      return 'Pronto'
    case 'DELIVERED':
      return 'Entregue'
    default:
      return status
  }
}

function formatPaymentMethod(method: string) {
  switch (method) {
    case 'PIX':
      return 'PIX'
    case 'DEBIT':
      return 'Débito'
    case 'CREDIT':
      return 'Crédito'
    case 'CASH':
      return 'Dinheiro'
    case 'VOUCHER':
      return 'Voucher'
    default:
      return method
  }
}
