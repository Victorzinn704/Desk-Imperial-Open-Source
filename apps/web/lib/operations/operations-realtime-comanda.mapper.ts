import type { ComandaRecord } from '@contracts/contracts'
import {
  asArray,
  asComandaItemRecord,
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

  if (!comandaId || !openedAt) {
    return null
  }

  return {
    ...resolveComandaIdentity(companyOwnerId, legacy, existing, payload),
    ...resolveComandaPartyFields(legacy, existing, payload),
    ...resolveComandaAmounts(legacy, existing, payload),
    id: comandaId,
    items: resolveComandaItems(legacy, existing, payload),
    notes: legacy?.notes ?? existing?.notes ?? asNullableString(payload.notes),
    openedAt,
    closedAt: legacy?.closedAt ?? existing?.closedAt ?? asNullableString(payload.closedAt),
    participantCount: resolveParticipantCount(legacy, existing, payload),
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
  if (legacy?.items?.length) {
    return legacy.items
  }

  return extractComandaItemsFromPayload(payload) ?? existing?.items ?? []
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
