type OperationsMutationSurface = 'owner-mobile' | 'staff-mobile'

type OperationsMutationAction =
  | 'open-comanda'
  | 'add-comanda-item'
  | 'add-comanda-items'
  | 'replace-comanda'
  | 'update-comanda-status'
  | 'close-comanda'
  | 'create-comanda-payment'
  | 'cancel-comanda'
  | 'open-cash-session'

type OperationsSocketLifecyclePhase = 'opened' | 'closed' | 'connect' | 'disconnect' | 'connect_error'

type OperationsRealtimeDropReason =
  | 'no-applicable-snapshot'
  | 'duplicate-id'
  | 'buffer-overflow'
  | 'stale-business-date'

type OperationsPerformanceEvent =
  | {
      type: 'reconcile-scheduled' | 'reconcile-merged' | 'reconcile-settled' | 'workspace-invalidated'
      at: number
      queryKey: string
      scopes: {
        includeLive: boolean
        includeKitchen: boolean
        includeSummary: boolean
        includeOrders: boolean
        includeFinance: boolean
      }
      delayMs?: number
      invalidateCount?: number
    }
  | {
      type: 'mutation-finished'
      at: number
      surface: OperationsMutationSurface
      action: OperationsMutationAction
      status: 'success' | 'error'
      durationMs: number
    }
  | {
      type: 'socket-lifecycle'
      at: number
      phase: OperationsSocketLifecyclePhase
      activeSocketInstances: number
      listenerCount: number
    }
  | {
      type: 'realtime-envelope-processed'
      at: number
      event: string
      isSelfEvent: boolean
      durationMs: number
      paintDelayMs: number
      livePatched: boolean
      liveNeedsRefresh: boolean
      kitchenPatched: boolean
      kitchenNeedsRefresh: boolean
      summaryPatched: boolean
      summaryNeedsRefresh: boolean
    }
  | {
      type: 'reconnect-refresh'
      at: number
      status: 'success' | 'error'
      durationMs: number
      invalidatedMesas: boolean
    }
  | {
      type: 'realtime-envelope-out-of-order'
      at: number
      event: string
      entityKey: string
      eventCreatedAtMs: number
      lastSeenCreatedAtMs: number
    }
  | {
      type: 'realtime-envelope-dropped'
      at: number
      event: string
      entityKey: string | null
      reason: OperationsRealtimeDropReason
    }

type OperationsMutationTrace = {
  action: OperationsMutationAction
  startedAt: number
  surface: OperationsMutationSurface
}

type OperationsPerformanceStore = {
  events: OperationsPerformanceEvent[]
  activeSocketInstances: number
  newestEnvelopeByEntity: Record<string, number>
}

const STORE_KEY = '__DESK_IMPERIAL_OPERATIONS_PERF__'
const MAX_EVENTS = 200

export type { OperationsMutationAction, OperationsMutationSurface, OperationsPerformanceEvent, OperationsMutationTrace }

export function recordOperationsPerformanceEvent(event: OperationsPerformanceEvent) {
  const store = getOperationsPerformanceStore()
  store.events.push(event)
  if (store.events.length > MAX_EVENTS) {
    store.events.splice(0, store.events.length - MAX_EVENTS)
  }
}

export function startOperationsMutationTrace(
  surface: OperationsMutationSurface,
  action: OperationsMutationAction,
): OperationsMutationTrace {
  return {
    action,
    startedAt: now(),
    surface,
  }
}

export function finishOperationsMutationTrace(
  trace: OperationsMutationTrace | null | undefined,
  status: 'success' | 'error',
) {
  if (!trace) {
    return
  }

  recordOperationsPerformanceEvent({
    type: 'mutation-finished',
    at: now(),
    surface: trace.surface,
    action: trace.action,
    status,
    durationMs: Math.max(0, now() - trace.startedAt),
  })
}

export function getOperationsPerformanceEvents() {
  return [...getOperationsPerformanceStore().events]
}

export function resetOperationsPerformanceEvents() {
  const store = getOperationsPerformanceStore()
  store.events.splice(0)
  store.activeSocketInstances = 0
  store.newestEnvelopeByEntity = {}
}

export function recordOperationsSocketLifecycleEvent(phase: OperationsSocketLifecyclePhase, listenerCount: number) {
  const store = getOperationsPerformanceStore()
  if (phase === 'opened') {
    store.activeSocketInstances += 1
  }

  if (phase === 'closed') {
    store.activeSocketInstances = Math.max(0, store.activeSocketInstances - 1)
  }

  recordOperationsPerformanceEvent({
    type: 'socket-lifecycle',
    at: now(),
    phase,
    activeSocketInstances: store.activeSocketInstances,
    listenerCount,
  })
}

export function recordOperationsRealtimeEnvelopeProcessed(args: {
  event: string
  isSelfEvent: boolean
  durationMs: number
  paintDelayMs: number
  livePatched: boolean
  liveNeedsRefresh: boolean
  kitchenPatched: boolean
  kitchenNeedsRefresh: boolean
  summaryPatched: boolean
  summaryNeedsRefresh: boolean
}) {
  recordOperationsPerformanceEvent({
    type: 'realtime-envelope-processed',
    at: now(),
    ...args,
  })
}

export function recordOperationsReconnectRefreshEvent(args: {
  status: 'success' | 'error'
  durationMs: number
  invalidatedMesas: boolean
}) {
  recordOperationsPerformanceEvent({
    type: 'reconnect-refresh',
    at: now(),
    ...args,
  })
}

export function recordOperationsRealtimeEnvelopeDropped(args: {
  event: string
  entityKey: string | null
  reason: OperationsRealtimeDropReason
}) {
  recordOperationsPerformanceEvent({
    type: 'realtime-envelope-dropped',
    at: now(),
    ...args,
  })
}

export function recordOperationsRealtimeEnvelopeOutOfOrder(args: {
  event: string
  entityKey: string
  eventCreatedAtMs: number
  lastSeenCreatedAtMs: number
}) {
  recordOperationsPerformanceEvent({
    type: 'realtime-envelope-out-of-order',
    at: now(),
    ...args,
  })
}

export function detectOperationsRealtimeEnvelopeOutOfOrder(entityKey: string | null, eventCreatedAtMs: number | null) {
  if (!entityKey || eventCreatedAtMs == null) {
    return null
  }

  const store = getOperationsPerformanceStore()
  const lastSeenCreatedAtMs = store.newestEnvelopeByEntity[entityKey]
  if (typeof lastSeenCreatedAtMs === 'number' && eventCreatedAtMs < lastSeenCreatedAtMs) {
    return lastSeenCreatedAtMs
  }

  if (typeof lastSeenCreatedAtMs !== 'number' || eventCreatedAtMs > lastSeenCreatedAtMs) {
    store.newestEnvelopeByEntity[entityKey] = eventCreatedAtMs
  }

  return null
}

function getOperationsPerformanceStore(): OperationsPerformanceStore {
  const root = globalThis as typeof globalThis & {
    [STORE_KEY]?: OperationsPerformanceStore
  }

  if (!root[STORE_KEY]) {
    root[STORE_KEY] = { events: [], activeSocketInstances: 0, newestEnvelopeByEntity: {} }
  }

  return root[STORE_KEY]
}

function now() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now()
  }

  return Date.now()
}
