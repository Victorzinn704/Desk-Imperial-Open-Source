export const OPERATIONS_REALTIME_NAMESPACE = '/operations'

export function buildWorkspaceChannel(workspaceOwnerUserId: string) {
  return `workspace:${workspaceOwnerUserId}`
}

export type OperationsRealtimeEventName =
  | 'cash.opened'
  | 'cash.updated'
  | 'comanda.opened'
  | 'comanda.updated'
  | 'comanda.closed'
  | 'cash.closure.updated'
  | 'kitchen.item.queued'
  | 'kitchen.item.updated'
  | 'mesa.upserted'

export type OperationsRealtimeActorRole = 'OWNER' | 'STAFF'

export interface OperationsRealtimeEventPayloadMap {
  'cash.opened': {
    cashSessionId: string
    openedAt: string
    openingAmount: number
    currency: string
    employeeId: string | null
  }
  'cash.updated': {
    cashSessionId: string
    status: 'OPEN' | 'CLOSED' | 'PENDING'
    openingAmount: number
    inflowAmount: number
    outflowAmount: number
    expectedAmount: number
    countedAmount: number | null
    differenceAmount: number | null
    movementCount: number
  }
  'comanda.opened': {
    comandaId: string
    mesaLabel: string
    openedAt: string
    employeeId: string | null
    subtotal: number
    totalItems: number
  }
  'comanda.updated': {
    comandaId: string
    mesaLabel: string
    status: 'ABERTA' | 'EM_PREPARO' | 'PRONTA' | 'FECHADA'
    employeeId: string | null
    subtotal: number
    discountAmount: number
    totalAmount: number
    totalItems: number
  }
  'comanda.closed': {
    comandaId: string
    mesaLabel: string
    closedAt: string
    employeeId: string | null
    totalAmount: number
    totalItems: number
    paymentMethod: string | null
  }
  'cash.closure.updated': {
    closureId: string
    status: 'OPEN' | 'PENDING' | 'CLOSED'
    openedAt: string | null
    closedAt: string | null
    expectedAmount: number
    countedAmount: number | null
    differenceAmount: number | null
    pendingCashSessions: number
    closedCashSessions: number
  }
  'kitchen.item.queued': {
    itemId: string
    comandaId: string
    mesaLabel: string
    productName: string
    quantity: number
    notes: string | null
    kitchenStatus: 'QUEUED'
    kitchenQueuedAt: string
  }
  'kitchen.item.updated': {
    itemId: string
    comandaId: string
    mesaLabel: string
    productName: string
    quantity: number
    notes: string | null
    kitchenStatus: 'IN_PREPARATION' | 'READY' | 'DELIVERED'
    kitchenQueuedAt: string | null
    kitchenReadyAt: string | null
  }
  'mesa.upserted': {
    mesaId: string
    label: string
    status: 'livre' | 'ocupada' | 'reservada'
  }
}

export type OperationsRealtimeEventPayload<TEvent extends OperationsRealtimeEventName> =
  OperationsRealtimeEventPayloadMap[TEvent]

export type OperationsRealtimeEnvelope<TEvent extends OperationsRealtimeEventName = OperationsRealtimeEventName> = {
  id: string
  event: TEvent
  workspaceOwnerUserId: string
  workspaceChannel: string
  actorUserId: string | null
  actorRole: OperationsRealtimeActorRole | null
  createdAt: string
  payload: OperationsRealtimeEventPayload<TEvent>
}

export type OperationsRealtimeWorkspaceListener<TEvent extends OperationsRealtimeEventName = OperationsRealtimeEventName> = (
  envelope: OperationsRealtimeEnvelope<TEvent>,
) => void

export interface OperationsRealtimeNamespaceLike {
  to(room: string): {
    emit(event: string, payload: unknown): void
  }
}
