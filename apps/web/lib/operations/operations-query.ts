import type { QueryClient } from '@tanstack/react-query'
import type { ComandaRecord, OperationsLiveResponse } from '@contracts/contracts'

export const OPERATIONS_LIVE_COMPACT_QUERY_KEY = ['operations', 'live', 'compact'] as const

export async function invalidateOperationsWorkspace(
  queryClient: QueryClient,
  operationsQueryKey: readonly unknown[] = OPERATIONS_LIVE_COMPACT_QUERY_KEY,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: operationsQueryKey }),
    queryClient.invalidateQueries({ queryKey: ['orders'] }),
    queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] }),
  ])
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
