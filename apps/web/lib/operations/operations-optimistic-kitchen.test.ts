import { QueryClient } from '@tanstack/react-query'
import type { OperationsKitchenResponse } from '@contracts/contracts'
import { describe, expect, it } from 'vitest'
import { buildComanda } from '@/test/operations-fixtures'
import { syncKitchenSnapshotFromComanda } from './operations-optimistic-kitchen'
import { OPERATIONS_KITCHEN_QUERY_KEY } from './operations-query'

function createQueryClient(kitchen?: OperationsKitchenResponse) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  if (kitchen) {
    queryClient.setQueryData(OPERATIONS_KITCHEN_QUERY_KEY, kitchen)
  }
  return queryClient
}

function buildKitchenSnapshot(overrides: Partial<OperationsKitchenResponse> = {}): OperationsKitchenResponse {
  return {
    businessDate: overrides.businessDate ?? '2026-05-19',
    companyOwnerId: overrides.companyOwnerId ?? 'owner-1',
    items: overrides.items ?? [],
    statusCounts: overrides.statusCounts ?? { queued: 0, inPreparation: 0, ready: 0 },
  }
}

describe('syncKitchenSnapshotFromComanda', () => {
  it('insere itens de cozinha retornados pela API sem esperar websocket', () => {
    const queryClient = createQueryClient(buildKitchenSnapshot())
    const comanda = buildComanda({
      id: 'comanda-1',
      currentEmployeeId: 'emp-1',
      tableLabel: '7',
      items: [
        {
          id: 'item-1',
          kitchenQueuedAt: '2026-05-19T12:00:00.000Z',
          kitchenStatus: 'QUEUED',
          productName: 'X-burger',
          quantity: 2,
        },
      ],
    })

    const patched = syncKitchenSnapshotFromComanda(queryClient, comanda)
    const kitchen = queryClient.getQueryData<OperationsKitchenResponse>(OPERATIONS_KITCHEN_QUERY_KEY)

    expect(patched).toBe(true)
    expect(kitchen?.items).toHaveLength(1)
    expect(kitchen?.items[0]).toEqual(
      expect.objectContaining({
        comandaId: 'comanda-1',
        itemId: 'item-1',
        kitchenStatus: 'QUEUED',
        mesaLabel: '7',
        productName: 'X-burger',
      }),
    )
    expect(kitchen?.statusCounts.queued).toBe(1)
  })

  it('substitui a fila da comanda para remover itens que deixaram de ir para cozinha', () => {
    const existingKitchen = buildKitchenSnapshot({
      items: [
        {
          comandaId: 'comanda-1',
          employeeId: null,
          employeeName: 'Operação',
          itemId: 'old-item',
          kitchenQueuedAt: '2026-05-19T11:00:00.000Z',
          kitchenReadyAt: null,
          kitchenStatus: 'QUEUED',
          mesaLabel: '7',
          notes: null,
          productName: 'Antigo',
          quantity: 1,
        },
      ],
      statusCounts: { queued: 1, inPreparation: 0, ready: 0 },
    })
    const queryClient = createQueryClient(existingKitchen)
    const comanda = buildComanda({ id: 'comanda-1', tableLabel: '7', items: [] })

    syncKitchenSnapshotFromComanda(queryClient, comanda)

    expect(queryClient.getQueryData<OperationsKitchenResponse>(OPERATIONS_KITCHEN_QUERY_KEY)?.items).toEqual([])
  })

  it('nao cria cache novo quando a tela de cozinha ainda nao carregou', () => {
    const queryClient = createQueryClient()
    const comanda = buildComanda({
      items: [{ id: 'item-1', kitchenStatus: 'QUEUED', productName: 'Pizza' }],
    })

    expect(syncKitchenSnapshotFromComanda(queryClient, comanda)).toBe(false)
    expect(queryClient.getQueryData(OPERATIONS_KITCHEN_QUERY_KEY)).toBeUndefined()
  })
})
