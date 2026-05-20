import type { QueryClient } from '@tanstack/react-query'
import type { ComandaRecord, OperationsLiveResponse } from '@contracts/contracts'
import type { openComanda } from '@/lib/api'
import {
  appendOptimisticComanda,
  buildOptimisticComandaRecord,
  patchOptimisticComanda,
  rollbackOperationsSnapshot,
} from '@/lib/operations'

const OPERATIONS_LIVE_QUERY_PREFIX = ['operations', 'live'] as const

type LiveSnapshotRollback = Array<readonly [readonly unknown[], OperationsLiveResponse | undefined]>

export async function appendOptimisticOpenComanda(
  queryClient: QueryClient,
  payload: Parameters<typeof openComanda>[0],
) {
  await queryClient.cancelQueries({ queryKey: OPERATIONS_LIVE_QUERY_PREFIX })
  const optimisticComanda = buildOptimisticComandaRecord({
    tableLabel: payload.tableLabel,
    mesaId: payload.mesaId ?? null,
    cashSessionId: payload.cashSessionId ?? null,
    currentEmployeeId: payload.employeeId ?? null,
    customerName: payload.customerName ?? null,
    customerDocument: payload.customerDocument ?? null,
    participantCount: payload.participantCount ?? 1,
    notes: payload.notes ?? null,
    discountAmount: payload.discountAmount,
    serviceFeeAmount: payload.serviceFeeAmount,
    items: payload.items,
  })

  const snapshots = snapshotLiveQueries(queryClient)
  appendComandaToLiveSnapshots(queryClient, snapshots, optimisticComanda)
  return { optimisticId: optimisticComanda.id, snapshots }
}

export function reconcileLiveComanda(queryClient: QueryClient, comanda: ComandaRecord, optimisticId?: string) {
  for (const [queryKey, snapshot] of snapshotLiveQueries(queryClient)) {
    if (!snapshot) {
      continue
    }

    reconcileLiveSnapshot(queryClient, queryKey, snapshot, comanda, optimisticId)
  }
}

export function rollbackLiveSnapshots(queryClient: QueryClient, snapshots?: LiveSnapshotRollback) {
  for (const [queryKey, snapshot] of snapshots ?? []) {
    rollbackOperationsSnapshot(queryClient, queryKey, snapshot)
  }
}

function appendComandaToLiveSnapshots(
  queryClient: QueryClient,
  snapshots: LiveSnapshotRollback,
  comanda: ComandaRecord,
) {
  for (const [queryKey, snapshot] of snapshots) {
    if (snapshot) {
      appendOptimisticComanda(queryClient, queryKey, comanda)
    }
  }
}

function reconcileLiveSnapshot(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  snapshot: OperationsLiveResponse,
  comanda: ComandaRecord,
  optimisticId?: string,
) {
  const hasComanda = hasLiveComanda(snapshot, comanda.id)
  const hasOptimisticComanda = optimisticId ? hasLiveComanda(snapshot, optimisticId) : false

  if (optimisticId && hasOptimisticComanda && hasComanda) {
    removeLiveComanda(queryClient, queryKey, optimisticId)
    patchOptimisticComanda(queryClient, queryKey, comanda.id, () => comanda)
    return
  }

  if (optimisticId && hasOptimisticComanda) {
    patchOptimisticComanda(queryClient, queryKey, optimisticId, () => comanda)
    return
  }

  if (hasComanda) {
    patchOptimisticComanda(queryClient, queryKey, comanda.id, () => comanda)
    return
  }

  appendOptimisticComanda(queryClient, queryKey, comanda)
}

function snapshotLiveQueries(queryClient: QueryClient): LiveSnapshotRollback {
  return queryClient.getQueriesData<OperationsLiveResponse>({ queryKey: OPERATIONS_LIVE_QUERY_PREFIX })
}

function hasLiveComanda(snapshot: OperationsLiveResponse, comandaId: string) {
  return (
    snapshot.unassigned.comandas.some((current) => current.id === comandaId) ||
    snapshot.employees.some((employee) => employee.comandas.some((current) => current.id === comandaId))
  )
}

function removeLiveComanda(queryClient: QueryClient, queryKey: readonly unknown[], comandaId: string) {
  const snapshot = queryClient.getQueryData<OperationsLiveResponse>(queryKey)
  if (!snapshot) {
    return
  }

  queryClient.setQueryData<OperationsLiveResponse>(queryKey, {
    ...snapshot,
    employees: snapshot.employees.map((employee) => ({
      ...employee,
      comandas: employee.comandas.filter((comanda) => comanda.id !== comandaId),
    })),
    unassigned: {
      ...snapshot.unassigned,
      comandas: snapshot.unassigned.comandas.filter((comanda) => comanda.id !== comandaId),
    },
  })
}
