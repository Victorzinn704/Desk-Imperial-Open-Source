import type { QueryClient } from '@tanstack/react-query'
import type { ComandaItemRecord, ComandaRecord, OperationsLiveResponse } from '@contracts/contracts'

export function getOperationsSnapshot(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
): OperationsLiveResponse | undefined {
  return queryClient.getQueryData<OperationsLiveResponse>(queryKey)
}

export function appendOptimisticComanda(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  comanda: ComandaRecord,
) {
  const snapshot = getOperationsSnapshot(queryClient, queryKey)
  if (!snapshot) {
    return undefined
  }

  queryClient.setQueryData<OperationsLiveResponse>(queryKey, {
    ...snapshot,
    unassigned: {
      ...snapshot.unassigned,
      comandas: [...snapshot.unassigned.comandas, comanda],
    },
  })

  return snapshot
}

export async function appendOptimisticComandaMutation(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  comanda: ComandaRecord,
) {
  await queryClient.cancelQueries({ queryKey })
  return appendOptimisticComanda(queryClient, queryKey, comanda)
}

export function patchOptimisticComanda(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  comandaId: string,
  patcher: (comanda: ComandaRecord) => ComandaRecord,
) {
  const snapshot = getOperationsSnapshot(queryClient, queryKey)
  if (!snapshot) {
    return undefined
  }

  const groups = [...snapshot.employees, snapshot.unassigned]
  for (const group of groups) {
    const comandaIdx = group.comandas.findIndex((comanda) => comanda.id === comandaId)
    if (comandaIdx === -1) {
      continue
    }

    const updatedComandas = [...group.comandas]
    updatedComandas[comandaIdx] = patcher(group.comandas[comandaIdx])

    if (group === snapshot.unassigned) {
      queryClient.setQueryData<OperationsLiveResponse>(queryKey, {
        ...snapshot,
        unassigned: { ...snapshot.unassigned, comandas: updatedComandas },
      })
    } else {
      const employeeIndex = snapshot.employees.findIndex((employee) => employee === group)
      const updatedEmployees = [...snapshot.employees]
      updatedEmployees[employeeIndex] = { ...group, comandas: updatedComandas }
      queryClient.setQueryData<OperationsLiveResponse>(queryKey, { ...snapshot, employees: updatedEmployees })
    }

    break
  }

  return snapshot
}

export function appendOptimisticComandaRecord(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  input: Parameters<typeof buildOptimisticComandaRecord>[0],
) {
  return appendOptimisticComanda(queryClient, queryKey, buildOptimisticComandaRecord(input))
}

export function appendOptimisticComandaItem(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  comandaId: string,
  input: Parameters<typeof buildOptimisticComandaItem>[0],
) {
  const item = buildOptimisticComandaItem(input)
  return patchOptimisticComanda(queryClient, queryKey, comandaId, (comanda) => ({
    ...comanda,
    items: [...comanda.items, item],
    subtotalAmount: comanda.subtotalAmount + item.totalAmount,
    totalAmount: comanda.totalAmount + item.totalAmount,
  }))
}

export function setOptimisticComandaStatus(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  comandaId: string,
  status: ComandaRecord['status'],
) {
  return patchOptimisticComanda(queryClient, queryKey, comandaId, (comanda) => ({
    ...comanda,
    status,
  }))
}

export async function patchOptimisticComandaMutation(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  comandaId: string,
  patcher: (comanda: ComandaRecord) => ComandaRecord,
) {
  await queryClient.cancelQueries({ queryKey })
  return patchOptimisticComanda(queryClient, queryKey, comandaId, patcher)
}

export function rollbackOperationsSnapshot(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  snapshot: OperationsLiveResponse | undefined,
) {
  if (!snapshot) {
    return
  }

  queryClient.setQueryData(queryKey, snapshot)
}

export function buildOptimisticComandaRecord(input: {
  tableLabel: string
  cashSessionId?: string | null
  customerName?: string | null
  customerDocument?: string | null
  participantCount?: number
  notes?: string | null
  items?: Array<{
    productId?: string | null
    productName?: string | null
    quantity: number
    unitPrice?: number
    notes?: string | null
  }>
}): ComandaRecord {
  const items = (input.items ?? []).map((item, index) => ({
    id: `opt-item-${index}-${Date.now()}`,
    productId: item.productId ?? null,
    productName: item.productName ?? 'Item',
    quantity: item.quantity,
    unitPrice: item.unitPrice ?? 0,
    totalAmount: item.quantity * (item.unitPrice ?? 0),
    notes: item.notes ?? null,
    kitchenStatus: null,
    kitchenQueuedAt: null,
    kitchenReadyAt: null,
  }))
  const subtotalAmount = items.reduce((sum, item) => sum + item.totalAmount, 0)

  return {
    id: `optimistic-${Date.now()}`,
    companyOwnerId: '',
    mesaId: null,
    status: 'OPEN',
    tableLabel: input.tableLabel,
    customerName: input.customerName ?? null,
    customerDocument: input.customerDocument ?? null,
    participantCount: input.participantCount ?? 1,
    notes: input.notes ?? null,
    cashSessionId: input.cashSessionId ?? null,
    currentEmployeeId: null,
    discountAmount: 0,
    serviceFeeAmount: 0,
    subtotalAmount,
    totalAmount: subtotalAmount,
    openedAt: new Date().toISOString(),
    closedAt: null,
    items,
  }
}

export function buildOptimisticComandaItem(input: {
  productId?: string | null
  productName?: string | null
  quantity: number
  unitPrice?: number
  notes?: string | null
}): ComandaItemRecord {
  return {
    id: `opt-item-${Date.now()}`,
    productId: input.productId ?? null,
    productName: input.productName ?? 'Item',
    quantity: input.quantity,
    unitPrice: input.unitPrice ?? 0,
    totalAmount: input.quantity * (input.unitPrice ?? 0),
    notes: input.notes ?? null,
    kitchenStatus: null,
    kitchenQueuedAt: null,
    kitchenReadyAt: null,
  }
}
