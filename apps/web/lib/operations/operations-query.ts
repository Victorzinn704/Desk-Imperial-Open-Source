import type { QueryClient } from '@tanstack/react-query'
import type { ComandaRecord, OperationsLiveResponse } from '@contracts/contracts'

export const OPERATIONS_LIVE_COMPACT_QUERY_KEY = ['operations', 'live', 'compact'] as const
export const OPERATIONS_KITCHEN_QUERY_KEY = ['operations', 'kitchen'] as const
export const OPERATIONS_SUMMARY_QUERY_KEY = ['operations', 'summary'] as const

type InvalidateOperationsWorkspaceOptions = {
  includeOrders?: boolean
  includeFinance?: boolean
  includeKitchen?: boolean
  includeSummary?: boolean
}

export async function invalidateOperationsWorkspace(
  queryClient: QueryClient,
  operationsQueryKey: readonly unknown[] = OPERATIONS_LIVE_COMPACT_QUERY_KEY,
  options?: InvalidateOperationsWorkspaceOptions,
) {
  const tasks = [
    queryClient.invalidateQueries({ queryKey: operationsQueryKey }),
  ]

  if (options?.includeKitchen !== false) {
    tasks.push(queryClient.invalidateQueries({ queryKey: OPERATIONS_KITCHEN_QUERY_KEY }))
  }

  if (options?.includeSummary !== false) {
    tasks.push(queryClient.invalidateQueries({ queryKey: OPERATIONS_SUMMARY_QUERY_KEY }))
  }

  if (options?.includeOrders) {
    tasks.push(queryClient.invalidateQueries({ queryKey: ['orders'] }))
  }

  if (options?.includeFinance) {
    tasks.push(queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] }))
  }

  await Promise.all(tasks)
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
