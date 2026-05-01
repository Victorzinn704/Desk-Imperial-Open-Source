import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { buildComanda, buildMesaRecord, buildOperationsSnapshot } from '@/test/operations-fixtures'
import {
  appendOptimisticComanda,
  appendOptimisticComandaPayment,
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

  it('adiciona pagamento parcial e preserva status PARTIAL', () => {
    const snapshot = buildOperationsSnapshot({
      unassigned: {
        employeeId: null,
        displayName: 'Sem garçom',
        comandas: [
          buildComanda({
            id: 'comanda-2',
            mesaId: null,
            currentEmployeeId: null,
            tableLabel: 'Balcão',
            totalAmount: 100,
            paidAmount: 0,
            remainingAmount: 100,
            paymentStatus: 'UNPAID',
          }),
        ],
      },
    })
    const queryClient = createQueryClient(snapshot)

    appendOptimisticComandaPayment(queryClient, QUERY_KEY, 'comanda-2', { amount: 40, method: 'CREDIT' })

    const next = queryClient.getQueryData<typeof snapshot>(QUERY_KEY)!
    expect(next.unassigned.comandas[0]).toEqual(
      expect.objectContaining({
        paidAmount: 40,
        remainingAmount: 60,
        paymentStatus: 'PARTIAL',
      }),
    )
  })

  it('fecha o saldo e marca a comanda como PAID quando o pagamento cobre o total', () => {
    const snapshot = buildOperationsSnapshot({
      unassigned: {
        employeeId: null,
        displayName: 'Sem garçom',
        comandas: [
          buildComanda({
            id: 'comanda-3',
            mesaId: null,
            currentEmployeeId: null,
            tableLabel: 'Balcão',
            totalAmount: 50,
            paidAmount: 10,
            remainingAmount: 40,
            paymentStatus: 'PARTIAL',
          }),
        ],
      },
    })
    const queryClient = createQueryClient(snapshot)

    appendOptimisticComandaPayment(queryClient, QUERY_KEY, 'comanda-3', { amount: 50, method: 'CASH' })

    const next = queryClient.getQueryData<typeof snapshot>(QUERY_KEY)!
    expect(next.unassigned.comandas[0]).toEqual(
      expect.objectContaining({
        paidAmount: 50,
        remainingAmount: 0,
        paymentStatus: 'PAID',
      }),
    )
  })
})
