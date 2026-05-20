import type { QueryClient } from '@tanstack/react-query'
import type { ComandaRecord } from '@contracts/contracts'
import { OPERATIONS_KITCHEN_QUERY_KEY } from './operations-query'
import { patchKitchenFromComandaEvent } from './operations-realtime-kitchen.patchers'
import type { OperationsKitchenSnapshot } from './operations-realtime-types'

export function syncKitchenSnapshotFromComanda(queryClient: QueryClient, comanda: ComandaRecord) {
  const snapshot = queryClient.getQueryData<OperationsKitchenSnapshot>(OPERATIONS_KITCHEN_QUERY_KEY)
  if (!snapshot) {
    return false
  }

  const nextSnapshot = patchKitchenFromComandaEvent(snapshot, {
    comanda,
    comandaId: comanda.id,
    currentEmployeeId: comanda.currentEmployeeId,
    replaceKitchenItems: true,
    status: comanda.status,
    tableLabel: comanda.tableLabel,
  })

  if (!nextSnapshot) {
    return false
  }

  queryClient.setQueryData(OPERATIONS_KITCHEN_QUERY_KEY, nextSnapshot)
  return true
}
