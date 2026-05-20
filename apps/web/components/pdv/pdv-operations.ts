import type { ComandaRecord, OperationsLiveResponse } from '@contracts/contracts'
import { calcSubtotal, type Comanda, type Garcom } from './pdv-types'
import { mapComandaStatus } from './pdv-operations-status'

export { buildPdvMesas } from './pdv-operations-mesas'

const GARCOM_CORES = ['#a78bfa', '#34d399', '#fb923c', '#f472b6', '#60a5fa', '#fbbf24', '#e879f9', '#2dd4bf']

export const DEFAULT_TABLE_LABELS = [...Array.from({ length: 12 }, (_, index) => String(index + 1)), 'VIP']

const pdvComandasCache = new WeakMap<OperationsLiveResponse, Comanda[]>()
const pdvGarconsCache = new WeakMap<OperationsLiveResponse, Garcom[]>()

function hasEmployeeId<T extends { employeeId?: string | null }>(employee: T): employee is T & { employeeId: string } {
  return typeof employee.employeeId === 'string' && employee.employeeId.length > 0
}

function collectOperationGroups(snapshot: OperationsLiveResponse | undefined) {
  if (!snapshot) {
    return []
  }

  const employeeGroups = Array.isArray(snapshot.employees) ? snapshot.employees : []
  const unassignedGroups = snapshot.unassigned ? [snapshot.unassigned] : []

  return [...employeeGroups, ...unassignedGroups]
}

export function buildPdvComandas(snapshot: OperationsLiveResponse | undefined): Comanda[] {
  if (!snapshot) {
    return []
  }

  const cached = pdvComandasCache.get(snapshot)
  if (cached) {
    return cached
  }

  const comandas = collectOperationGroups(snapshot)
    .flatMap((group) =>
      group.comandas.map((c) => ({
        ...toPdvComanda(c),
        garcomId: group.employeeId ?? undefined,
        garcomNome: group.displayName ?? undefined,
      })),
    )
    .sort((left, right) => right.abertaEm.getTime() - left.abertaEm.getTime())

  pdvComandasCache.set(snapshot, comandas)
  return comandas
}

export function toPdvComanda(comanda: ComandaRecord): Comanda {
  return {
    id: comanda.id,
    status: mapComandaStatus(comanda.status),
    mesa: comanda.tableLabel,
    clienteNome: comanda.customerName ?? undefined,
    clienteDocumento: comanda.customerDocument ?? undefined,
    participantCount: comanda.participantCount,
    notes: comanda.notes ?? undefined,
    itens: comanda.items.map((item) => {
      const quantidade = Math.max(1, toFiniteNumber(item.quantity) ?? 1)
      return {
        produtoId: item.productId ?? `manual-${item.id}`,
        nome: item.productName,
        quantidade,
        precoUnitario: resolveItemUnitPrice(item, quantidade),
        observacao: item.notes ?? undefined,
      }
    }),
    desconto: toPercent(comanda.discountAmount, comanda.subtotalAmount),
    acrescimo: toPercent(comanda.serviceFeeAmount, comanda.subtotalAmount),
    abertaEm: new Date(comanda.openedAt),
    subtotalBackend: typeof comanda.subtotalAmount === 'number' ? comanda.subtotalAmount : undefined,
    totalBackend: typeof comanda.totalAmount === 'number' ? comanda.totalAmount : undefined,
    paidAmount: typeof comanda.paidAmount === 'number' ? comanda.paidAmount : undefined,
    remainingAmount: typeof comanda.remainingAmount === 'number' ? comanda.remainingAmount : undefined,
    paymentStatus: comanda.paymentStatus,
    payments: (comanda.payments ?? []).map((payment) => ({
      id: payment.id,
      method: payment.method,
      amount: payment.amount,
      note: payment.note ?? undefined,
      paidAt: new Date(payment.paidAt),
    })),
  }
}

export function buildPdvGarcons(snapshot: OperationsLiveResponse | undefined): Garcom[] {
  if (!snapshot) {
    return []
  }

  const cached = pdvGarconsCache.get(snapshot)
  if (cached) {
    return cached
  }

  const garcons = collectOperationGroups(snapshot)
    .filter(hasEmployeeId)
    .map((employee, index) => ({
      id: employee.employeeId,
      nome: employee.displayName,
      cor: GARCOM_CORES[index % GARCOM_CORES.length],
    }))

  pdvGarconsCache.set(snapshot, garcons)
  return garcons
}

export function toOperationsStatus(status: Exclude<Comanda['status'], 'fechada' | 'cancelada'>) {
  switch (status) {
    case 'em_preparo':
      return 'IN_PREPARATION' as const
    case 'pronta':
      return 'READY' as const
    default:
      return 'OPEN' as const
  }
}

export function toOperationAmounts(input: Pick<Comanda, 'itens' | 'desconto' | 'acrescimo'>) {
  const subtotal = calcSubtotal(input)
  return {
    discountAmount: roundMoney((subtotal * input.desconto) / 100),
    serviceFeeAmount: roundMoney((subtotal * input.acrescimo) / 100),
  }
}

function toPercent(amount: number, subtotal: number) {
  if (subtotal <= 0 || amount <= 0) {
    return 0
  }

  return roundMoney((amount / subtotal) * 100)
}

function resolveItemUnitPrice(item: ComandaRecord['items'][number], quantity: number) {
  const directPrice = toFiniteNumber(item.unitPrice)
  if (directPrice != null && directPrice >= 0) {
    return roundMoney(directPrice)
  }

  const totalAmount = toFiniteNumber(item.totalAmount)
  if (totalAmount != null && quantity > 0) {
    return roundMoney(totalAmount / quantity)
  }

  return 0
}

function toFiniteNumber(value: unknown) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function roundMoney(value: number) {
  return Number(value.toFixed(2))
}
