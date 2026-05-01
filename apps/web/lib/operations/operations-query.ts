import type { QueryClient } from '@tanstack/react-query'
import type { ComandaRecord, OperationsLiveResponse } from '@contracts/contracts'
import { recordOperationsPerformanceEvent } from './operations-performance-diagnostics'

export const OPERATIONS_LIVE_COMPACT_QUERY_KEY = ['operations', 'live', 'compact'] as const
export const OPERATIONS_LIVE_QUERY_PREFIX = ['operations', 'live'] as const
export const OPERATIONS_KITCHEN_QUERY_KEY = ['operations', 'kitchen'] as const
export const OPERATIONS_SUMMARY_QUERY_KEY = ['operations', 'summary'] as const

type InvalidateOperationsWorkspaceOptions = {
  includeLive?: boolean
  includeOrders?: boolean
  includeFinance?: boolean
  includeKitchen?: boolean
  includeSummary?: boolean
}

type NormalizedInvalidateOperationsWorkspaceOptions = Required<InvalidateOperationsWorkspaceOptions>

type ScheduledReconcileEntry = {
  dueAt: number
  options: NormalizedInvalidateOperationsWorkspaceOptions
  queryKey: readonly unknown[]
  timer: ReturnType<typeof setTimeout>
}

const scheduledReconciles = new WeakMap<QueryClient, Map<string, ScheduledReconcileEntry>>()

export async function invalidateOperationsWorkspace(
  queryClient: QueryClient,
  operationsQueryKey: readonly unknown[] = OPERATIONS_LIVE_QUERY_PREFIX,
  options?: InvalidateOperationsWorkspaceOptions,
) {
  const tasks: Array<Promise<unknown>> = []
  const normalizedOptions = normalizeInvalidateOperationsWorkspaceOptions(options)
  let invalidateCount = 0

  if (options?.includeLive !== false) {
    tasks.push(queryClient.invalidateQueries({ queryKey: operationsQueryKey }))
    invalidateCount += 1
  }

  if (options?.includeKitchen !== false) {
    tasks.push(queryClient.invalidateQueries({ queryKey: OPERATIONS_KITCHEN_QUERY_KEY }))
    invalidateCount += 1
  }

  if (options?.includeSummary !== false) {
    tasks.push(queryClient.invalidateQueries({ queryKey: OPERATIONS_SUMMARY_QUERY_KEY }))
    invalidateCount += 1
  }

  if (options?.includeOrders) {
    tasks.push(queryClient.invalidateQueries({ queryKey: ['orders'] }))
    invalidateCount += 1
  }

  if (options?.includeFinance) {
    tasks.push(queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] }))
    invalidateCount += 1
  }

  recordOperationsPerformanceEvent({
    type: 'workspace-invalidated',
    at: Date.now(),
    queryKey: JSON.stringify(operationsQueryKey),
    scopes: normalizedOptions,
    invalidateCount,
  })

  await Promise.all(tasks)
}

export function scheduleOperationsWorkspaceReconcile(
  queryClient: QueryClient,
  operationsQueryKey: readonly unknown[] = OPERATIONS_LIVE_QUERY_PREFIX,
  options?: InvalidateOperationsWorkspaceOptions & { delayMs?: number },
) {
  const { delayMs = 1_200, ...invalidateOptions } = options ?? {}
  const normalizedOptions = normalizeInvalidateOperationsWorkspaceOptions(invalidateOptions)
  const registry = getScheduledReconcileRegistry(queryClient)
  const scheduleKey = JSON.stringify(operationsQueryKey)
  const existingEntry = registry.get(scheduleKey)

  if (existingEntry) {
    existingEntry.options = mergeInvalidateOperationsWorkspaceOptions(existingEntry.options, normalizedOptions)
    const nextDueAt = Math.min(existingEntry.dueAt, Date.now() + delayMs)

    recordOperationsPerformanceEvent({
      type: 'reconcile-merged',
      at: Date.now(),
      queryKey: scheduleKey,
      scopes: existingEntry.options,
      delayMs: Math.max(0, nextDueAt - Date.now()),
    })

    if (nextDueAt !== existingEntry.dueAt) {
      clearTimeout(existingEntry.timer)
      existingEntry.dueAt = nextDueAt
      existingEntry.timer = createScheduledReconcileTimer(queryClient, registry, scheduleKey, existingEntry)
    }

    return
  }

  const entry: ScheduledReconcileEntry = {
    dueAt: Date.now() + delayMs,
    options: normalizedOptions,
    queryKey: operationsQueryKey,
    timer: null as unknown as ReturnType<typeof setTimeout>,
  }
  entry.timer = createScheduledReconcileTimer(queryClient, registry, scheduleKey, entry)
  registry.set(scheduleKey, entry)
  recordOperationsPerformanceEvent({
    type: 'reconcile-scheduled',
    at: Date.now(),
    queryKey: scheduleKey,
    scopes: entry.options,
    delayMs,
  })
}

export function settleScheduledOperationsWorkspaceReconcile(
  queryClient: QueryClient,
  operationsQueryKey: readonly unknown[] = OPERATIONS_LIVE_QUERY_PREFIX,
  options?: InvalidateOperationsWorkspaceOptions,
) {
  const registry = scheduledReconciles.get(queryClient)
  if (!registry) {
    return
  }

  const scheduleKey = JSON.stringify(operationsQueryKey)
  const entry = registry.get(scheduleKey)
  if (!entry) {
    return
  }

  const settled = normalizeInvalidateOperationsWorkspaceOptions(options)
  entry.options = {
    includeLive: entry.options.includeLive && !settled.includeLive,
    includeOrders: entry.options.includeOrders && !settled.includeOrders,
    includeFinance: entry.options.includeFinance && !settled.includeFinance,
    includeKitchen: entry.options.includeKitchen && !settled.includeKitchen,
    includeSummary: entry.options.includeSummary && !settled.includeSummary,
  }

  recordOperationsPerformanceEvent({
    type: 'reconcile-settled',
    at: Date.now(),
    queryKey: scheduleKey,
    scopes: settled,
  })

  if (
    !(
      entry.options.includeLive ||
      entry.options.includeOrders ||
      entry.options.includeFinance ||
      entry.options.includeKitchen ||
      entry.options.includeSummary
    )
  ) {
    clearTimeout(entry.timer)
    registry.delete(scheduleKey)
  }
}

export function patchOperationsSnapshot(
  snapshot: OperationsLiveResponse,
  updater: (current: OperationsLiveResponse) => OperationsLiveResponse,
) {
  return updater(snapshot)
}

export function patchComandaInSnapshot(
  snapshot: OperationsLiveResponse,
  comandaId: string,
  patcher: (comanda: ComandaRecord) => ComandaRecord,
) {
  const patchGroup = <TGroup extends { comandas: ComandaRecord[] }>(group: TGroup): TGroup => {
    const index = group.comandas.findIndex((comanda) => comanda.id === comandaId)
    if (index === -1) {
      return group
    }

    const comandas = [...group.comandas]
    comandas[index] = patcher(comandas[index])
    return { ...group, comandas }
  }

  return {
    ...snapshot,
    employees: snapshot.employees.map(patchGroup),
    unassigned: patchGroup(snapshot.unassigned),
  }
}

function normalizeInvalidateOperationsWorkspaceOptions(
  options?: InvalidateOperationsWorkspaceOptions,
): NormalizedInvalidateOperationsWorkspaceOptions {
  return {
    includeLive: options?.includeLive !== false,
    includeOrders: options?.includeOrders === true,
    includeFinance: options?.includeFinance === true,
    includeKitchen: options?.includeKitchen !== false,
    includeSummary: options?.includeSummary !== false,
  }
}

function mergeInvalidateOperationsWorkspaceOptions(
  current: NormalizedInvalidateOperationsWorkspaceOptions,
  next: NormalizedInvalidateOperationsWorkspaceOptions,
): NormalizedInvalidateOperationsWorkspaceOptions {
  return {
    includeLive: current.includeLive || next.includeLive,
    includeOrders: current.includeOrders || next.includeOrders,
    includeFinance: current.includeFinance || next.includeFinance,
    includeKitchen: current.includeKitchen || next.includeKitchen,
    includeSummary: current.includeSummary || next.includeSummary,
  }
}

function getScheduledReconcileRegistry(queryClient: QueryClient) {
  const existing = scheduledReconciles.get(queryClient)
  if (existing) {
    return existing
  }

  const next = new Map<string, ScheduledReconcileEntry>()
  scheduledReconciles.set(queryClient, next)
  return next
}

function createScheduledReconcileTimer(
  queryClient: QueryClient,
  registry: Map<string, ScheduledReconcileEntry>,
  scheduleKey: string,
  entry: ScheduledReconcileEntry,
) {
  const delay = Math.max(0, entry.dueAt - Date.now())
  const timer = setTimeout(() => {
    registry.delete(scheduleKey)
    void invalidateOperationsWorkspace(queryClient, entry.queryKey, entry.options)
  }, delay)

  if (typeof timer === 'object' && 'unref' in timer && typeof timer.unref === 'function') {
    timer.unref()
  }

  return timer
}
