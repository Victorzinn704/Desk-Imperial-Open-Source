import type { KitchenItemStatus } from '@prisma/client'
import type { ComandaPaymentRecord } from './operations.types'
import { toNumberOrZero } from './operations-domain.utils'

export type RealtimeComandaLike = {
  id: string
  mesaId?: string | null
  cashSessionId?: string | null
  tableLabel: string
  currentEmployeeId: string | null
  customerName?: string | null
  customerDocument?: string | null
  participantCount?: number | null
  subtotalAmount: { toNumber(): number } | number
  discountAmount: { toNumber(): number } | number
  serviceFeeAmount: { toNumber(): number } | number
  totalAmount: { toNumber(): number } | number
  notes?: string | null
  closedAt: Date | null
  openedAt: Date
  status: string
  items: RealtimeComandaItemLike[]
  payments?: RealtimeComandaPaymentLike[]
}

export type RealtimeComandaItemLike = {
  quantity: number
  id?: string
  productId?: string | null
  productName?: string
  unitPrice?: { toNumber(): number } | number
  totalAmount?: { toNumber(): number } | number
  notes?: string | null
  kitchenStatus?: KitchenItemStatus | null
  kitchenQueuedAt?: Date | string | null
  kitchenReadyAt?: Date | string | null
}

export type RealtimeComandaPaymentLike = {
  id?: string
  method: string
  amount?: { toNumber(): number } | number
  note?: string | null
  status?: string
  paidAt?: Date | string
}

const REALTIME_PAYMENT_METHODS: ComandaPaymentRecord['method'][] = [
  'CASH',
  'PIX',
  'DEBIT',
  'CREDIT',
  'VOUCHER',
  'OTHER',
]
const REALTIME_PAYMENT_STATUSES: ComandaPaymentRecord['status'][] = ['CONFIRMED', 'VOIDED']

export function resolveClosedPaymentMethod(comanda: RealtimeComandaLike) {
  const payments = comanda.payments ?? []
  return payments.at(-1)?.method ?? null
}

export function buildRealtimeComandaDetails(comanda: RealtimeComandaLike) {
  const payments = buildRealtimePayments(comanda.payments)
  const totalAmount = toNumberOrZero(comanda.totalAmount)
  const paidAmount = payments
    .filter((payment) => payment.status === 'CONFIRMED')
    .reduce((sum, payment) => sum + payment.amount, 0)
  const remainingAmount = Math.max(0, totalAmount - paidAmount)

  return {
    ...(comanda.mesaId !== undefined ? { mesaId: comanda.mesaId } : {}),
    ...(comanda.cashSessionId !== undefined ? { cashSessionId: comanda.cashSessionId } : {}),
    ...(comanda.customerName !== undefined ? { customerName: comanda.customerName } : {}),
    ...(comanda.customerDocument !== undefined ? { customerDocument: comanda.customerDocument } : {}),
    ...(comanda.participantCount !== undefined ? { participantCount: comanda.participantCount ?? 1 } : {}),
    ...(comanda.notes !== undefined ? { notes: comanda.notes } : {}),
    openedAt: comanda.openedAt.toISOString(),
    items: buildRealtimeComandaItems(comanda.items),
    paidAmount,
    paymentStatus: resolveRealtimePaymentStatus(paidAmount, remainingAmount),
    payments,
    remainingAmount,
  }
}

function buildRealtimeComandaItems(items: RealtimeComandaItemLike[]) {
  return items
    .filter(
      (
        item,
      ): item is Required<Pick<RealtimeComandaItemLike, 'id' | 'productName' | 'quantity'>> & RealtimeComandaItemLike =>
        typeof item.id === 'string' && typeof item.productName === 'string' && Number.isFinite(item.quantity),
    )
    .map((item) => ({
      id: item.id,
      productId: item.productId ?? null,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: toNumberOrZero(item.unitPrice ?? 0),
      totalAmount:
        item.totalAmount != null
          ? toNumberOrZero(item.totalAmount)
          : toNumberOrZero(item.unitPrice ?? 0) * item.quantity,
      notes: item.notes ?? null,
      kitchenStatus: item.kitchenStatus ?? null,
      kitchenQueuedAt: toIsoStringOrNull(item.kitchenQueuedAt ?? null),
      kitchenReadyAt: toIsoStringOrNull(item.kitchenReadyAt ?? null),
    }))
}

function buildRealtimePayments(payments: RealtimeComandaPaymentLike[] | undefined) {
  return (payments ?? [])
    .filter(
      (
        payment,
      ): payment is Required<Pick<RealtimeComandaPaymentLike, 'id' | 'paidAt' | 'status'>> &
        RealtimeComandaPaymentLike =>
        typeof payment.id === 'string' &&
        REALTIME_PAYMENT_METHODS.includes(payment.method as ComandaPaymentRecord['method']) &&
        (payment.paidAt instanceof Date || typeof payment.paidAt === 'string') &&
        REALTIME_PAYMENT_STATUSES.includes(payment.status as ComandaPaymentRecord['status']),
    )
    .map((payment) => ({
      id: payment.id,
      method: payment.method as ComandaPaymentRecord['method'],
      amount: toNumberOrZero(payment.amount ?? 0),
      note: payment.note ?? null,
      status: payment.status as ComandaPaymentRecord['status'],
      paidAt: toIsoString(payment.paidAt),
    }))
}

function resolveRealtimePaymentStatus(paidAmount: number, remainingAmount: number) {
  if (paidAmount <= 0) {
    return 'UNPAID' as const
  }

  if (remainingAmount > 0.009) {
    return 'PARTIAL' as const
  }

  return 'PAID' as const
}

function toIsoStringOrNull(value: Date | string | null) {
  if (value instanceof Date) {
    return value.toISOString()
  }

  return value ?? null
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value
}
