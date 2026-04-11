import type { KitchenItemStatus } from '@prisma/client'
import type { AuthContext } from '../auth/auth.types'
import type { OperationsRealtimeService } from '../operations-realtime/operations-realtime.service'
import {
  buildCashClosurePayload,
  buildCashUpdatedPayload,
  formatBusinessDateKey,
  toNumberOrZero,
} from './operations-domain.utils'
import { toRealtimeOpenStatus, toRealtimeStatus } from './comanda-realtime-status.utils'

type ComandaLike = {
  id: string
  tableLabel: string
  currentEmployeeId: string | null
  subtotalAmount: { toNumber(): number } | number
  discountAmount: { toNumber(): number } | number
  serviceFeeAmount: { toNumber(): number } | number
  totalAmount: { toNumber(): number } | number
  closedAt: Date | null
  openedAt: Date
  status: string
  items: Array<{ quantity: number }>
}

export function publishComandaOpened(
  realtimeService: OperationsRealtimeService,
  auth: AuthContext,
  comanda: ComandaLike,
  businessDate: Date,
) {
  realtimeService.publishComandaOpened(auth, {
    comandaId: comanda.id,
    mesaLabel: comanda.tableLabel,
    openedAt: comanda.openedAt.toISOString(),
    employeeId: comanda.currentEmployeeId,
    status: toRealtimeOpenStatus(comanda.status),
    subtotal: toNumberOrZero(comanda.subtotalAmount),
    discountAmount: toNumberOrZero(comanda.discountAmount),
    serviceFeeAmount: toNumberOrZero(comanda.serviceFeeAmount),
    totalAmount: toNumberOrZero(comanda.totalAmount),
    totalItems: comanda.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
    businessDate: formatBusinessDateKey(businessDate),
  })
}

export function publishComandaUpdated(
  realtimeService: OperationsRealtimeService,
  auth: AuthContext,
  comanda: ComandaLike,
  businessDate: Date,
  options?: {
    requiresKitchenRefresh?: boolean
    replaceKitchenItems?: boolean
    kitchenItems?: Array<{
      itemId: string
      comandaId: string
      mesaLabel: string
      employeeId: string | null
      productName: string
      quantity: number
      notes: string | null
      kitchenStatus: 'QUEUED' | 'IN_PREPARATION' | 'READY' | 'DELIVERED'
      kitchenQueuedAt: string | null
      kitchenReadyAt: string | null
      businessDate: string
    }>
  },
) {
  realtimeService.publishComandaUpdated(auth, {
    comandaId: comanda.id,
    mesaLabel: comanda.tableLabel,
    status: toRealtimeStatus(comanda.status),
    employeeId: comanda.currentEmployeeId,
    subtotal: toNumberOrZero(comanda.subtotalAmount),
    discountAmount: toNumberOrZero(comanda.discountAmount),
    serviceFeeAmount: toNumberOrZero(comanda.serviceFeeAmount),
    totalAmount: toNumberOrZero(comanda.totalAmount),
    totalItems: comanda.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
    businessDate: formatBusinessDateKey(businessDate),
    ...(options?.requiresKitchenRefresh ? { requiresKitchenRefresh: true } : {}),
    ...(options?.replaceKitchenItems ? { replaceKitchenItems: true } : {}),
    ...(options?.kitchenItems ? { kitchenItems: options.kitchenItems } : {}),
  })
}

export function publishKitchenItemQueued(
  realtimeService: OperationsRealtimeService,
  auth: AuthContext,
  comanda: ComandaLike,
  item: {
    id: string
    productName: string
    quantity: number
    notes: string | null
    kitchenStatus: KitchenItemStatus | null
    kitchenQueuedAt: Date | null
    kitchenReadyAt: Date | null
  },
  businessDate: Date,
) {
  const payload = buildKitchenItemRealtimeDelta(comanda, item, businessDate)
  realtimeService.publishKitchenItemQueued(auth, {
    ...payload,
    kitchenStatus: 'QUEUED',
    kitchenQueuedAt: payload.kitchenQueuedAt ?? new Date().toISOString(),
  })
}

export function publishKitchenItemUpdated(
  realtimeService: OperationsRealtimeService,
  auth: AuthContext,
  comanda: ComandaLike,
  item: {
    id: string
    productName: string
    quantity: number
    notes: string | null
    kitchenStatus: KitchenItemStatus | null
    kitchenQueuedAt: Date | null
    kitchenReadyAt: Date | null
  },
  businessDate: Date,
) {
  const payload = buildKitchenItemRealtimeDelta(comanda, item, businessDate)
  realtimeService.publishKitchenItemUpdated(auth, {
    ...payload,
    kitchenStatus:
      item.kitchenStatus === 'DELIVERED' ? 'DELIVERED' : item.kitchenStatus === 'READY' ? 'READY' : 'IN_PREPARATION',
  })
}

export function publishComandaClosed(
  realtimeService: OperationsRealtimeService,
  auth: AuthContext,
  comanda: {
    id: string
    tableLabel: string
    currentEmployeeId: string | null
    subtotalAmount: { toNumber(): number } | number
    discountAmount: { toNumber(): number } | number
    serviceFeeAmount: { toNumber(): number } | number
    totalAmount: { toNumber(): number } | number
    closedAt: Date | null
    items: Array<{ quantity: number }>
  },
  refreshedSession: Parameters<typeof buildCashUpdatedPayload>[0] | null,
  closure: Parameters<typeof buildCashClosurePayload>[0],
  businessDate: Date,
) {
  realtimeService.publishComandaClosed(auth, {
    comandaId: comanda.id,
    mesaLabel: comanda.tableLabel,
    closedAt: comanda.closedAt?.toISOString() ?? new Date().toISOString(),
    employeeId: comanda.currentEmployeeId,
    status: 'CLOSED',
    subtotal: toNumberOrZero(comanda.subtotalAmount),
    discountAmount: toNumberOrZero(comanda.discountAmount),
    serviceFeeAmount: toNumberOrZero(comanda.serviceFeeAmount),
    totalAmount: toNumberOrZero(comanda.totalAmount),
    totalItems: comanda.items.reduce((sum, item) => sum + item.quantity, 0),
    paymentMethod: null,
    businessDate: formatBusinessDateKey(businessDate),
  })

  if (refreshedSession) {
    realtimeService.publishCashUpdated(auth, {
      ...buildCashUpdatedPayload(refreshedSession),
      businessDate: formatBusinessDateKey(businessDate),
    })
  }

  realtimeService.publishCashClosureUpdated(auth, buildCashClosurePayload(closure))
}

export function buildKitchenItemRealtimeDelta(
  comanda: ComandaLike,
  item: {
    id: string
    productName: string
    quantity: number
    notes: string | null
    kitchenStatus: KitchenItemStatus | null
    kitchenQueuedAt: Date | string | null
    kitchenReadyAt: Date | string | null
  },
  businessDate: Date,
) {
  return {
    itemId: item.id,
    comandaId: comanda.id,
    mesaLabel: comanda.tableLabel,
    employeeId: comanda.currentEmployeeId,
    productName: item.productName,
    quantity: item.quantity,
    notes: item.notes ?? null,
    kitchenStatus:
      item.kitchenStatus === 'DELIVERED'
        ? 'DELIVERED'
        : item.kitchenStatus === 'READY'
          ? 'READY'
          : item.kitchenStatus === 'IN_PREPARATION'
            ? 'IN_PREPARATION'
            : 'QUEUED',
    kitchenQueuedAt:
      item.kitchenQueuedAt instanceof Date ? item.kitchenQueuedAt.toISOString() : (item.kitchenQueuedAt ?? null),
    kitchenReadyAt:
      item.kitchenReadyAt instanceof Date ? item.kitchenReadyAt.toISOString() : (item.kitchenReadyAt ?? null),
    businessDate: formatBusinessDateKey(businessDate),
  } as const
}
