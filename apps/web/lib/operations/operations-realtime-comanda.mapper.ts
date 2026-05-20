import type { ComandaRecord } from '@contracts/contracts'
import {
  asArray,
  asComandaItemRecord,
  asComandaPaymentRecord,
  asComandaRecord,
  asNullableString,
  asString,
  mapComandaStatus,
} from './operations-realtime-coercion'

type BuildComandaFromPayloadInput = {
  companyOwnerId: string
  existing: ComandaRecord | null
  payload: Record<string, unknown>
  fallbackStatus?: ComandaRecord['status']
}

export function resolveComandaIdFromPayload(payload: Record<string, unknown>) {
  const legacy = asComandaRecord(payload.comanda)
  return legacy?.id ?? asString(payload.comandaId)
}

export function buildComandaFromPayload({
  companyOwnerId,
  existing,
  payload,
  fallbackStatus,
}: BuildComandaFromPayloadInput): ComandaRecord | null {
  const legacy = asComandaRecord(payload.comanda)
  const comandaId = legacy?.id ?? asString(payload.comandaId)
  const openedAt = resolveComandaOpenedAt(legacy, existing, payload)
  const amounts = resolveComandaAmounts(legacy, existing, payload)
  const payments = resolveComandaPayments(legacy, existing, payload)

  if (!(comandaId && openedAt)) {
    return null
  }

  const paidAmount = resolveComandaPaidAmount(legacy, existing, payload, payments)
  const remainingAmount = resolveComandaRemainingAmount(legacy, existing, payload, amounts.totalAmount, paidAmount)

  return {
    ...resolveComandaIdentity(companyOwnerId, legacy, existing, payload),
    ...resolveComandaPartyFields(legacy, existing, payload),
    ...amounts,
    id: comandaId,
    items: resolveComandaItems(legacy, existing, payload),
    notes: legacy?.notes ?? existing?.notes ?? asNullableString(payload.notes),
    openedAt,
    closedAt: legacy?.closedAt ?? existing?.closedAt ?? asNullableString(payload.closedAt),
    participantCount: resolveParticipantCount(legacy, existing, payload),
    paidAmount,
    paymentStatus: resolvePaymentStatus(legacy, existing, payload, paidAmount, remainingAmount),
    payments,
    remainingAmount,
    status: resolveComandaStatus(legacy, existing, payload, fallbackStatus),
  }
}

export function extractComandaItemsFromPayload(payload: Record<string, unknown>): ComandaRecord['items'] | null {
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

export function extractComandaPaymentsFromPayload(payload: Record<string, unknown>): ComandaRecord['payments'] | null {
  const rawPayments = asArray(payload.payments)
  if (!rawPayments.length) {
    return null
  }

  const payments: ComandaRecord['payments'] = []
  for (const rawPayment of rawPayments) {
    const payment = asComandaPaymentRecord(rawPayment)
    if (!payment) {
      continue
    }

    payments.push(payment)
  }

  return payments.length ? payments : null
}

// Fallback resolver intentionally centralizes nullable transport variants from legacy + current payload.
// eslint-disable-next-line complexity
function resolveComandaIdentity(
  companyOwnerId: string,
  legacy: ComandaRecord | null,
  existing: ComandaRecord | null,
  payload: Record<string, unknown>,
) {
  return {
    cashSessionId: legacy?.cashSessionId ?? existing?.cashSessionId ?? asNullableString(payload.cashSessionId),
    companyOwnerId: legacy?.companyOwnerId ?? existing?.companyOwnerId ?? companyOwnerId,
    currentEmployeeId:
      legacy?.currentEmployeeId ??
      existing?.currentEmployeeId ??
      asNullableString(payload.currentEmployeeId) ??
      asNullableString(payload.employeeId),
    mesaId: legacy?.mesaId ?? existing?.mesaId ?? asNullableString(payload.mesaId),
    tableLabel:
      legacy?.tableLabel ??
      existing?.tableLabel ??
      asString(payload.tableLabel) ??
      asString(payload.mesaLabel) ??
      'Mesa',
  }
}

function resolveComandaPartyFields(
  legacy: ComandaRecord | null,
  existing: ComandaRecord | null,
  payload: Record<string, unknown>,
) {
  return {
    customerDocument:
      legacy?.customerDocument ?? existing?.customerDocument ?? asNullableString(payload.customerDocument),
    customerName: legacy?.customerName ?? existing?.customerName ?? asNullableString(payload.customerName),
  }
}

function resolveComandaAmounts(
  legacy: ComandaRecord | null,
  existing: ComandaRecord | null,
  payload: Record<string, unknown>,
) {
  return {
    discountAmount: resolveAmountValue(legacy?.discountAmount, existing?.discountAmount, payload.discountAmount),
    serviceFeeAmount: resolveAmountValue(
      legacy?.serviceFeeAmount,
      existing?.serviceFeeAmount,
      payload.serviceFeeAmount,
    ),
    subtotalAmount: resolveSubtotalAmount(legacy, existing, payload),
    totalAmount: resolveAmountValue(legacy?.totalAmount, existing?.totalAmount, payload.totalAmount),
  }
}

function resolveSubtotalAmount(
  legacy: ComandaRecord | null,
  existing: ComandaRecord | null,
  payload: Record<string, unknown>,
) {
  if (legacy?.subtotalAmount != null) {
    return legacy.subtotalAmount
  }

  const subtotalAmount = resolveOptionalNumber(payload.subtotalAmount)
  if (subtotalAmount != null) {
    return subtotalAmount
  }

  const subtotal = resolveOptionalNumber(payload.subtotal)
  if (subtotal != null) {
    return subtotal
  }

  return existing?.subtotalAmount ?? 0
}

function resolveAmountValue(
  legacyValue: number | null | undefined,
  existingValue: number | null | undefined,
  rawValue: unknown,
) {
  if (legacyValue != null) {
    return legacyValue
  }

  const nextValue = resolveOptionalNumber(rawValue)
  if (nextValue != null) {
    return nextValue
  }

  return existingValue ?? 0
}

function resolveOptionalNumber(value: unknown) {
  return typeof value === 'number' ? value : null
}

function resolveComandaOpenedAt(
  legacy: ComandaRecord | null,
  existing: ComandaRecord | null,
  payload: Record<string, unknown>,
) {
  return legacy?.openedAt ?? existing?.openedAt ?? asString(payload.openedAt)
}

function resolveComandaItems(
  legacy: ComandaRecord | null,
  existing: ComandaRecord | null,
  payload: Record<string, unknown>,
) {
  return resolveComandaRecordList(legacy?.items, extractComandaItemsFromPayload(payload), existing?.items)
}

function resolveComandaPayments(
  legacy: ComandaRecord | null,
  existing: ComandaRecord | null,
  payload: Record<string, unknown>,
): NonNullable<ComandaRecord['payments']> {
  return resolveComandaRecordList(legacy?.payments, extractComandaPaymentsFromPayload(payload), existing?.payments)
}

function resolveParticipantCount(
  legacy: ComandaRecord | null,
  existing: ComandaRecord | null,
  payload: Record<string, unknown>,
) {
  if (legacy?.participantCount != null) {
    return legacy.participantCount
  }

  if (existing?.participantCount != null) {
    return existing.participantCount
  }

  return typeof payload.participantCount === 'number' ? payload.participantCount : 1
}

function resolveComandaStatus(
  legacy: ComandaRecord | null,
  existing: ComandaRecord | null,
  payload: Record<string, unknown>,
  fallbackStatus?: ComandaRecord['status'],
) {
  return (
    fallbackStatus ?? mapComandaStatus(asNullableString(payload.status)) ?? legacy?.status ?? existing?.status ?? 'OPEN'
  )
}

function resolveComandaPaidAmount(
  legacy: ComandaRecord | null,
  existing: ComandaRecord | null,
  payload: Record<string, unknown>,
  payments: NonNullable<ComandaRecord['payments']>,
) {
  if (legacy?.paidAmount != null) {
    return legacy.paidAmount
  }

  const payloadPaidAmount = resolveOptionalNumber(payload.paidAmount)
  if (payloadPaidAmount != null) {
    return payloadPaidAmount
  }

  if (payments.length > 0) {
    return payments
      .filter((payment) => payment.status === 'CONFIRMED')
      .reduce((sum, payment) => sum + payment.amount, 0)
  }

  return existing?.paidAmount ?? 0
}

function resolveComandaRemainingAmount(
  legacy: ComandaRecord | null,
  existing: ComandaRecord | null,
  payload: Record<string, unknown>,
  totalAmount: number,
  paidAmount: number,
) {
  const explicitRemainingAmount = resolveExplicitComandaAmount(legacy?.remainingAmount, payload.remainingAmount)
  if (explicitRemainingAmount != null) {
    return explicitRemainingAmount
  }

  return paidAmount > 0 ? Math.max(0, totalAmount - paidAmount) : (existing?.remainingAmount ?? totalAmount)
}

function resolvePaymentStatus(
  legacy: ComandaRecord | null,
  existing: ComandaRecord | null,
  payload: Record<string, unknown>,
  paidAmount: number,
  remainingAmount: number,
): ComandaRecord['paymentStatus'] {
  if (legacy?.paymentStatus) {
    return legacy.paymentStatus
  }

  const payloadPaymentStatus = asNullableString(payload.paymentStatus)
  if (payloadPaymentStatus === 'PAID' || payloadPaymentStatus === 'PARTIAL' || payloadPaymentStatus === 'UNPAID') {
    return payloadPaymentStatus
  }

  if (paidAmount <= 0) {
    return existing?.paymentStatus ?? 'UNPAID'
  }

  if (remainingAmount > 0.009) {
    return 'PARTIAL'
  }

  return 'PAID'
}

function resolveExplicitComandaAmount(legacyValue: number | null | undefined, payloadValue: unknown) {
  if (legacyValue != null) {
    return legacyValue
  }

  return resolveOptionalNumber(payloadValue)
}

function resolveComandaRecordList<T>(
  legacyValues: T[] | undefined,
  payloadValues: T[] | null | undefined,
  existingValues: T[] | undefined,
) {
  if (legacyValues?.length) {
    return legacyValues
  }

  return payloadValues ?? existingValues ?? []
}
