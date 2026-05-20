import { QueryClient } from '@tanstack/react-query'
import { buildComanda, buildMesaRecord, buildOperationsSnapshot } from '@/test/operations-fixtures'

export const OPERATIONS_OPTIMISTIC_TEST_QUERY_KEY = ['operations', 'live', 'compact'] as const

export function createOperationsOptimisticQueryClient(snapshot = buildOperationsSnapshot()) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  queryClient.setQueryData(OPERATIONS_OPTIMISTIC_TEST_QUERY_KEY, snapshot)
  return queryClient
}

export function requireTestValue<T>(value: T | undefined): T {
  if (value === undefined) {
    throw new Error('Expected test value to be defined')
  }

  return value
}

export function buildFreeMesaSnapshot() {
  return buildOperationsSnapshot({
    employees: [{ employeeId: 'emp-1', displayName: 'Marina', comandas: [] }],
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
}

export function buildOccupiedMesaSnapshot() {
  return buildOperationsSnapshot({
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
}

export function buildPaymentSnapshot(input: {
  comandaId: string
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID'
}) {
  return buildOperationsSnapshot({
    unassigned: {
      employeeId: null,
      displayName: 'Sem garçom',
      comandas: [
        buildComanda({
          id: input.comandaId,
          mesaId: null,
          currentEmployeeId: null,
          tableLabel: 'Balcão',
          totalAmount: input.totalAmount,
          paidAmount: input.paidAmount,
          remainingAmount: input.remainingAmount,
          paymentStatus: input.paymentStatus,
        }),
      ],
    },
  })
}
