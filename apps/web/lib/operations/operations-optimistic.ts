import type { QueryClient } from '@tanstack/react-query'
import type { ComandaRecord, OperationsLiveResponse } from '@contracts/contracts'
import { buildOptimisticComandaItem, generateOptimisticId } from './operations-optimistic-record'

export { buildOptimisticComandaItem, buildOptimisticComandaRecord } from './operations-optimistic-record'

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

  const targetEmployeeIndex =
    comanda.currentEmployeeId != null
      ? snapshot.employees.findIndex((employee) => employee.employeeId === comanda.currentEmployeeId)
      : -1

  const nextSnapshot: OperationsLiveResponse =
    targetEmployeeIndex === -1
      ? {
          ...snapshot,
          unassigned: {
            ...snapshot.unassigned,
            comandas: [...snapshot.unassigned.comandas, comanda],
          },
          mesas: patchMesaCollection(snapshot.mesas, comanda, 'OPEN'),
        }
      : {
          ...snapshot,
          employees: snapshot.employees.map((employee, index) =>
            index === targetEmployeeIndex
              ? {
                  ...employee,
                  comandas: [...employee.comandas, comanda],
                }
              : employee,
          ),
          mesas: patchMesaCollection(snapshot.mesas, comanda, 'OPEN'),
        }

  queryClient.setQueryData<OperationsLiveResponse>(queryKey, nextSnapshot)

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
    const updatedComanda = patcher(group.comandas[comandaIdx])
    updatedComandas[comandaIdx] = updatedComanda

    if (group === snapshot.unassigned) {
      queryClient.setQueryData<OperationsLiveResponse>(queryKey, {
        ...snapshot,
        unassigned: { ...snapshot.unassigned, comandas: updatedComandas },
        mesas: patchMesaCollection(snapshot.mesas, updatedComanda, updatedComanda.status),
      })
    } else {
      const employeeIndex = snapshot.employees.findIndex((employee) => employee === group)
      const updatedEmployees = [...snapshot.employees]
      updatedEmployees[employeeIndex] = { ...group, comandas: updatedComandas }
      queryClient.setQueryData<OperationsLiveResponse>(queryKey, {
        ...snapshot,
        employees: updatedEmployees,
        mesas: patchMesaCollection(snapshot.mesas, updatedComanda, updatedComanda.status),
      })
    }

    break
  }

  return snapshot
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
    closedAt: status === 'CLOSED' || status === 'CANCELLED' ? new Date().toISOString() : comanda.closedAt,
  }))
}

export function appendOptimisticComandaPayment(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  comandaId: string,
  input: {
    amount: number
    method: NonNullable<ComandaRecord['payments']>[number]['method']
  },
) {
  return patchOptimisticComanda(queryClient, queryKey, comandaId, (comanda) => {
    const paidAmount = Math.min(comanda.totalAmount, (comanda.paidAmount ?? 0) + input.amount)
    const remainingAmount = Math.max(0, comanda.totalAmount - paidAmount)
    const paymentStatus: ComandaRecord['paymentStatus'] = resolveOptimisticPaymentStatus(remainingAmount, paidAmount)

    return {
      ...comanda,
      paidAmount,
      remainingAmount,
      paymentStatus,
      payments: [
        ...(comanda.payments ?? []),
        {
          id: generateOptimisticId('opt-pay'),
          amount: input.amount,
          method: input.method,
          status: 'CONFIRMED',
          paidAt: new Date().toISOString(),
          note: null,
        },
      ],
    }
  })
}

function resolveOptimisticPaymentStatus(remainingAmount: number, paidAmount: number): ComandaRecord['paymentStatus'] {
  if (remainingAmount <= 0.009) {
    return 'PAID'
  }

  if (paidAmount > 0) {
    return 'PARTIAL'
  }

  return 'UNPAID'
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

function patchMesaCollection(
  mesas: OperationsLiveResponse['mesas'],
  comanda: Pick<ComandaRecord, 'id' | 'mesaId' | 'tableLabel' | 'currentEmployeeId'>,
  status: ComandaRecord['status'],
): OperationsLiveResponse['mesas'] {
  return mesas.map((mesa) => {
    const matchesMesaId = Boolean(comanda.mesaId) && mesa.id === comanda.mesaId
    const matchesLabel = normalizeMesaKey(mesa.label) === normalizeMesaKey(comanda.tableLabel)

    if (!(matchesMesaId || matchesLabel) && mesa.comandaId !== comanda.id) {
      return mesa
    }

    if (status === 'CLOSED' || status === 'CANCELLED') {
      const nextStatus: OperationsLiveResponse['mesas'][number]['status'] =
        mesa.reservedUntil && new Date(mesa.reservedUntil) > new Date() ? 'reservada' : 'livre'

      return {
        ...mesa,
        status: nextStatus,
        comandaId: null,
        currentEmployeeId: null,
      }
    }

    return {
      ...mesa,
      status: 'ocupada',
      comandaId: comanda.id,
      currentEmployeeId: comanda.currentEmployeeId ?? null,
    }
  })
}

function normalizeMesaKey(raw: string | null | undefined) {
  if (!raw) {
    return ''
  }

  const trimmed = raw.trim()
  const cleaned = trimmed
    .replace(/^(mesa|ms|m)\s*[-–—#nº.:]*\s*/i, '')
    .replace(/^[-–—#nº.:]+\s*/, '')
    .trim()

  if (/^\d+$/.test(cleaned)) {
    return String(Number(cleaned))
  }

  return cleaned.toUpperCase()
}
