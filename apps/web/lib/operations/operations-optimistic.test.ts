import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { buildComanda, buildMesaRecord, buildOperationsSnapshot } from '@/test/operations-fixtures'
import {
  appendOptimisticComanda,
  buildOptimisticComandaRecord,
  setOptimisticComandaStatus,
} from './operations-optimistic'

const QUERY_KEY = ['operations', 'live', 'compact'] as const

function createQueryClient(snapshot = buildOperationsSnapshot()) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  queryClient.setQueryData(QUERY_KEY, snapshot)
  return queryClient
}

describe('operations optimistic', () => {
  it('marca a mesa como ocupada ao abrir comanda otimisticamente', () => {
    const snapshot = buildOperationsSnapshot({
      employees: [
        {
          employeeId: 'emp-1',
          displayName: 'Marina',
          comandas: [],
        },
      ],
      mesas: [
        buildMesaRecord({
          id: 'mesa-3',
          label: 'Mesa 3',
          status: 'livre',
          comandaId: null,
          currentEmployeeId: null,
        }),
      ],
    })
    const queryClient = createQueryClient(snapshot)

    appendOptimisticComanda(
      queryClient,
      QUERY_KEY,
      buildOptimisticComandaRecord({
        tableLabel: '3',
        mesaId: 'mesa-3',
        currentEmployeeId: 'emp-1',
        items: [],
      }),
    )

    const next = queryClient.getQueryData<typeof snapshot>(QUERY_KEY)!
    expect(next.employees[0]?.comandas).toHaveLength(1)
    expect(next.mesas[0]).toEqual(
      expect.objectContaining({
        id: 'mesa-3',
        status: 'ocupada',
        currentEmployeeId: 'emp-1',
      }),
    )
  })

  it('libera a mesa quando a comanda é fechada otimisticamente', () => {
    const snapshot = buildOperationsSnapshot({
      employees: [
        {
          employeeId: 'emp-1',
          displayName: 'Marina',
          comandas: [
            buildComanda({
              id: 'comanda-1',
              mesaId: 'mesa-2',
              currentEmployeeId: 'emp-1',
              tableLabel: '2',
              status: 'OPEN',
            }),
          ],
        },
      ],
      mesas: [
        buildMesaRecord({
          id: 'mesa-2',
          label: 'Mesa 2',
          status: 'ocupada',
          comandaId: 'comanda-1',
          currentEmployeeId: 'emp-1',
        }),
      ],
    })
    const queryClient = createQueryClient(snapshot)

    setOptimisticComandaStatus(queryClient, QUERY_KEY, 'comanda-1', 'CLOSED')

    const next = queryClient.getQueryData<typeof snapshot>(QUERY_KEY)!
    expect(next.mesas[0]).toEqual(
      expect.objectContaining({
        id: 'mesa-2',
        status: 'livre',
        comandaId: null,
        currentEmployeeId: null,
      }),
    )
  })
})
