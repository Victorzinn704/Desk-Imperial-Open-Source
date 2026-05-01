import type {
  CashClosureStatus,
  CashSessionRecord,
  ComandaRecord,
  KitchenItemStatus,
  MesaRecord,
} from '@contracts/contracts'

export function mapComandaStatus(status: string | null): ComandaRecord['status'] | null {
  if (!status) {
    return null
  }

  const validStatuses: ComandaRecord['status'][] = ['OPEN', 'IN_PREPARATION', 'READY', 'CLOSED', 'CANCELLED']
  return validStatuses.includes(status as ComandaRecord['status']) ? (status as ComandaRecord['status']) : null
}

export function mapKitchenStatus(status: string | null): KitchenItemStatus | null {
  if (!status) {
    return null
  }

  const validStatuses: KitchenItemStatus[] = ['QUEUED', 'IN_PREPARATION', 'READY', 'DELIVERED']
  return validStatuses.includes(status as KitchenItemStatus) ? (status as KitchenItemStatus) : null
}

export function mapCashSessionStatus(status: string | null): CashSessionRecord['status'] | null {
  if (!status) {
    return null
  }

  const validStatuses: CashSessionRecord['status'][] = ['OPEN', 'CLOSED', 'FORCE_CLOSED']
  return validStatuses.includes(status as CashSessionRecord['status']) ? (status as CashSessionRecord['status']) : null
}

export function mapClosureStatus(status: string | null): CashClosureStatus | null {
  if (!status) {
    return null
  }

  const statusMap: Record<string, CashClosureStatus> = {
    OPEN: 'OPEN',
    PENDING: 'PENDING_EMPLOYEE_CLOSE',
    PENDING_EMPLOYEE_CLOSE: 'PENDING_EMPLOYEE_CLOSE',
    CLOSED: 'CLOSED',
    FORCE_CLOSED: 'FORCE_CLOSED',
  }

  return statusMap[status] ?? null
}

export function mapMesaStatus(status: string | null): MesaRecord['status'] | null {
  if (!status) {
    return null
  }

  const validStatuses: MesaRecord['status'][] = ['livre', 'ocupada', 'reservada']
  return validStatuses.includes(status as MesaRecord['status']) ? (status as MesaRecord['status']) : null
}

export function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

export function asNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

export function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value
  }

  return null
}

export function asNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && !Number.isNaN(value) ? value : null
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

export function asComandaRecord(value: unknown): ComandaRecord | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const record = value as Record<string, unknown>
  if (!record.id || typeof record.id !== 'string') {
    return null
  }

  return record as unknown as ComandaRecord
}

export function asComandaItemRecord(value: unknown): ComandaRecord['items'][number] | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const record = value as Record<string, unknown>
  if (!record.id || typeof record.id !== 'string') {
    return null
  }

  return record as unknown as ComandaRecord['items'][number]
}

export function asCashSessionRecord(value: unknown): CashSessionRecord | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const record = value as Record<string, unknown>
  if (!record.id || typeof record.id !== 'string') {
    return null
  }

  return record as unknown as CashSessionRecord
}

export function asMesaRecord(value: unknown): MesaRecord | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const record = value as Record<string, unknown>
  if (!record.id || typeof record.id !== 'string') {
    return null
  }

  return record as unknown as MesaRecord
}
