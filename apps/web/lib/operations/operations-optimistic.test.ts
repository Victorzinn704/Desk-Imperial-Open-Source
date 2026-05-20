import { describe, expect, it } from 'vitest'
import {
  appendOptimisticComanda,
  appendOptimisticComandaPayment,
  buildOptimisticComandaRecord,
  setOptimisticComandaStatus,
} from './operations-optimistic'
import {
  buildFreeMesaSnapshot,
  buildOccupiedMesaSnapshot,
  buildPaymentSnapshot,
  createOperationsOptimisticQueryClient,
  OPERATIONS_OPTIMISTIC_TEST_QUERY_KEY,
  requireTestValue,
} from './operations-optimistic.test-fixtures'

describe('operations optimistic', () => {
  it('marca a mesa como ocupada ao abrir comanda otimisticamente', () => {
    const snapshot = buildFreeMesaSnapshot()
    const queryClient = createOperationsOptimisticQueryClient(snapshot)

    appendOptimisticComanda(
      queryClient,
      OPERATIONS_OPTIMISTIC_TEST_QUERY_KEY,
      buildOptimisticComandaRecord({
        tableLabel: '3',
        mesaId: 'mesa-3',
        currentEmployeeId: 'emp-1',
        items: [],
      }),
    )

    const next = requireTestValue(queryClient.getQueryData<typeof snapshot>(OPERATIONS_OPTIMISTIC_TEST_QUERY_KEY))
    expect(next.employees[0]?.comandas).toHaveLength(1)
    expect(next.mesas[0]).toEqual(
      expect.objectContaining({
        id: 'mesa-3',
        status: 'ocupada',
        currentEmployeeId: 'emp-1',
      }),
    )
  })

  it('calcula total otimista com desconto e acrescimo absolutos', () => {
    const comanda = buildOptimisticComandaRecord({
      tableLabel: 'Balcão',
      discountAmount: 5,
      serviceFeeAmount: 2,
      items: [{ productName: 'Pizza', quantity: 2, unitPrice: 20 }],
    })

    expect(comanda.subtotalAmount).toBe(40)
    expect(comanda.discountAmount).toBe(5)
    expect(comanda.serviceFeeAmount).toBe(2)
    expect(comanda.totalAmount).toBe(37)
  })

  it('libera a mesa quando a comanda é fechada otimisticamente', () => {
    const snapshot = buildOccupiedMesaSnapshot()
    const queryClient = createOperationsOptimisticQueryClient(snapshot)

    setOptimisticComandaStatus(queryClient, OPERATIONS_OPTIMISTIC_TEST_QUERY_KEY, 'comanda-1', 'CLOSED')

    const next = requireTestValue(queryClient.getQueryData<typeof snapshot>(OPERATIONS_OPTIMISTIC_TEST_QUERY_KEY))
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
    const snapshot = buildPaymentSnapshot({
      comandaId: 'comanda-2',
      paidAmount: 0,
      paymentStatus: 'UNPAID',
      remainingAmount: 100,
      totalAmount: 100,
    })
    const queryClient = createOperationsOptimisticQueryClient(snapshot)

    appendOptimisticComandaPayment(queryClient, OPERATIONS_OPTIMISTIC_TEST_QUERY_KEY, 'comanda-2', {
      amount: 40,
      method: 'CREDIT',
    })

    const next = requireTestValue(queryClient.getQueryData<typeof snapshot>(OPERATIONS_OPTIMISTIC_TEST_QUERY_KEY))
    expect(next.unassigned.comandas[0]).toEqual(
      expect.objectContaining({
        paidAmount: 40,
        remainingAmount: 60,
        paymentStatus: 'PARTIAL',
      }),
    )
  })

  it('fecha o saldo e marca a comanda como PAID quando o pagamento cobre o total', () => {
    const snapshot = buildPaymentSnapshot({
      comandaId: 'comanda-3',
      paidAmount: 10,
      paymentStatus: 'PARTIAL',
      remainingAmount: 40,
      totalAmount: 50,
    })
    const queryClient = createOperationsOptimisticQueryClient(snapshot)

    appendOptimisticComandaPayment(queryClient, OPERATIONS_OPTIMISTIC_TEST_QUERY_KEY, 'comanda-3', {
      amount: 50,
      method: 'CASH',
    })

    const next = requireTestValue(queryClient.getQueryData<typeof snapshot>(OPERATIONS_OPTIMISTIC_TEST_QUERY_KEY))
    expect(next.unassigned.comandas[0]).toEqual(
      expect.objectContaining({
        paidAmount: 50,
        remainingAmount: 0,
        paymentStatus: 'PAID',
      }),
    )
  })
})
