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
    const paymentStatus: ComandaRecord['paymentStatus'] =
      remainingAmount <= 0.009 ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'UNPAID'

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

let optimisticIdCounter = 0

function generateOptimisticId(prefix: string) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`
  }

  optimisticIdCounter += 1
  return `${prefix}-${Date.now().toString(36)}-${optimisticIdCounter.toString(36).padStart(4, '0')}`
}

export function buildOptimisticComandaRecord(input: {
  tableLabel: string
  mesaId?: string | null
  cashSessionId?: string | null
  currentEmployeeId?: string | null
  companyOwnerId?: string
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
  const items = (input.items ?? []).map((item) => {
    const unitPrice = resolveOptimisticUnitPrice(item.unitPrice, item.quantity)
    return {
      id: generateOptimisticId('opt-item'),
      productId: item.productId ?? null,
      productName: item.productName ?? 'Item',
      quantity: item.quantity,
      unitPrice,
      totalAmount: item.quantity * unitPrice,
      notes: item.notes ?? null,
      kitchenStatus: null,
      kitchenQueuedAt: null,
      kitchenReadyAt: null,
    }
  })
  const subtotalAmount = items.reduce((sum, item) => sum + item.totalAmount, 0)

  return {
    id: generateOptimisticId('optimistic'),
    companyOwnerId: input.companyOwnerId ?? '',
    mesaId: input.mesaId ?? null,
    status: 'OPEN',
    tableLabel: input.tableLabel,
    customerName: input.customerName ?? null,
    customerDocument: input.customerDocument ?? null,
    participantCount: input.participantCount ?? 1,
    notes: input.notes ?? null,
    cashSessionId: input.cashSessionId ?? null,
    currentEmployeeId: input.currentEmployeeId ?? null,
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
  const unitPrice = resolveOptimisticUnitPrice(input.unitPrice, input.quantity)
  return {
    id: generateOptimisticId('opt-item'),
    productId: input.productId ?? null,
    productName: input.productName ?? 'Item',
    quantity: input.quantity,
    unitPrice,
    totalAmount: input.quantity * unitPrice,
    notes: input.notes ?? null,
    kitchenStatus: null,
    kitchenQueuedAt: null,
    kitchenReadyAt: null,
  }
}

function resolveOptimisticUnitPrice(unitPrice: number | undefined, quantity: number) {
  if (typeof unitPrice === 'number' && Number.isFinite(unitPrice) && unitPrice >= 0) {
    return unitPrice
  }

  if (quantity <= 0) {
    return 0
  }

  return 0
}

function patchMesaCollection(
  mesas: OperationsLiveResponse['mesas'],
  comanda: Pick<ComandaRecord, 'id' | 'mesaId' | 'tableLabel' | 'currentEmployeeId'>,
  status: ComandaRecord['status'],
): OperationsLiveResponse['mesas'] {
  return mesas.map((mesa) => {
    const matchesMesaId = Boolean(comanda.mesaId) && mesa.id === comanda.mesaId
    const matchesLabel = normalizeMesaKey(mesa.label) === normalizeMesaKey(comanda.tableLabel)

    if (!matchesMesaId && !matchesLabel && mesa.comandaId !== comanda.id) {
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
