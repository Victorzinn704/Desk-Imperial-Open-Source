import type { CashSessionRecord, MesaRecord } from '../operations/operations.types'

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

export type OperationsRealtimeComandaStatus = 'OPEN' | 'IN_PREPARATION' | 'READY' | 'CLOSED'

export type OperationsRealtimeKitchenItemStatus = 'QUEUED' | 'IN_PREPARATION' | 'READY' | 'DELIVERED'

export type OperationsRealtimeComandaDelta = {
  comandaId: string
  mesaLabel: string
  openedAt?: string
  closedAt?: string
  employeeId: string | null
  status: OperationsRealtimeComandaStatus
  subtotal: number
  discountAmount: number
  serviceFeeAmount: number
  totalAmount: number
  totalItems: number
  businessDate: string
  paymentMethod?: string | null
}

export type OperationsRealtimeKitchenItemDelta = {
  itemId: string
  comandaId: string
  mesaLabel: string
  employeeId: string | null
  productName: string
  quantity: number
  notes: string | null
  kitchenStatus: OperationsRealtimeKitchenItemStatus
  kitchenQueuedAt: string | null
  kitchenReadyAt: string | null
  businessDate: string
}

export interface OperationsRealtimeEventPayloadMap {
  'cash.opened': {
    cashSessionId: string
    openedAt: string
    openingAmount: number
    currency: string
    employeeId: string | null
    businessDate: string
    cashSession?: CashSessionRecord
  }
  'cash.updated': {
    cashSessionId: string
    status: 'OPEN' | 'CLOSED'
    openingAmount: number
    inflowAmount: number
    outflowAmount: number
    expectedAmount: number
    countedAmount: number | null
    differenceAmount: number | null
    movementCount: number
    businessDate?: string
    cashSession?: CashSessionRecord
  }
  'comanda.opened': {
    comandaId: string
    mesaLabel: string
    openedAt: string
    employeeId: string | null
    subtotal: number
    discountAmount: number
    serviceFeeAmount: number
    totalAmount: number
    totalItems: number
    status: OperationsRealtimeComandaStatus
    businessDate: string
  }
  'comanda.updated': {
    comandaId: string
    mesaLabel: string
    status: OperationsRealtimeComandaStatus
    employeeId: string | null
    subtotal: number
    discountAmount: number
    serviceFeeAmount: number
    totalAmount: number
    totalItems: number
    businessDate: string
    requiresKitchenRefresh?: boolean
    replaceKitchenItems?: boolean
    kitchenItems?: OperationsRealtimeKitchenItemDelta[]
  }
  'comanda.closed': {
    comandaId: string
    mesaLabel: string
    closedAt: string
    employeeId: string | null
    status: OperationsRealtimeComandaStatus
    subtotal: number
    discountAmount: number
    serviceFeeAmount: number
    totalAmount: number
    totalItems: number
    paymentMethod: string | null
    businessDate: string
  }
  'cash.closure.updated': {
    closureId: string
    status: 'OPEN' | 'PENDING' | 'CLOSED'
    openedAt: string | null
    closedAt: string | null
    expectedAmount: number
    grossRevenueAmount: number
    realizedProfitAmount: number
    countedAmount: number | null
    differenceAmount: number | null
    openComandasCount: number
    pendingCashSessions: number
  }
  'kitchen.item.queued': {
    itemId: string
    comandaId: string
    mesaLabel: string
    employeeId: string | null
    productName: string
    quantity: number
    notes: string | null
    kitchenStatus: 'QUEUED'
    kitchenQueuedAt: string
    kitchenReadyAt: string | null
    businessDate: string
  }
  'kitchen.item.updated': {
    itemId: string
    comandaId: string
    mesaLabel: string
    employeeId: string | null
    productName: string
    quantity: number
    notes: string | null
    kitchenStatus: Exclude<OperationsRealtimeKitchenItemStatus, 'QUEUED'>
    kitchenQueuedAt: string | null
    kitchenReadyAt: string | null
    businessDate: string
  }
  'mesa.upserted': {
    mesaId: string
    label: string
    status: MesaRecord['status']
    mesa?: MesaRecord
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

export type OperationsRealtimeWorkspaceListener<
  TEvent extends OperationsRealtimeEventName = OperationsRealtimeEventName,
> = (envelope: OperationsRealtimeEnvelope<TEvent>) => void

export interface OperationsRealtimeNamespaceLike {
  to(room: string): {
    emit(event: string, payload: unknown): void
  }
}
