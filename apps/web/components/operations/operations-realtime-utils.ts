import type { OperationsRealtimeEnvelope } from './hooks/use-operations-socket'

export function resolveRealtimeEnvelopeEntityKey(envelope: OperationsRealtimeEnvelope) {
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

export function parseRealtimeEnvelopeCreatedAt(createdAt: string | undefined) {
  if (!createdAt) {
    return null
  }

  const parsedAt = Date.parse(createdAt)
  return Number.isFinite(parsedAt) ? parsedAt : null
}

export function readString(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : null
}

export function afterNextPaint(callback: () => void) {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(() => callback())
    return
  }

  callback()
}

export function now() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now()
  }

  return Date.now()
}
