import type { ComandaRecord, OperationsLiveResponse } from '@contracts/contracts'
import { calcSubtotal, type Comanda, type Garcom, isEndedComandaStatus, type Mesa } from './pdv-types'
import { normalizeTableLabel } from './normalize-table-label'

const GARCOM_CORES = ['#a78bfa', '#34d399', '#fb923c', '#f472b6', '#60a5fa', '#fbbf24', '#e879f9', '#2dd4bf']

export const DEFAULT_TABLE_LABELS = [...Array.from({ length: 12 }, (_, index) => String(index + 1)), 'VIP']

const pdvComandasCache = new WeakMap<OperationsLiveResponse, Comanda[]>()
const pdvMesasCache = new WeakMap<OperationsLiveResponse, Mesa[]>()
const pdvGarconsCache = new WeakMap<OperationsLiveResponse, Garcom[]>()
const employeeMapsCache = new WeakMap<
  OperationsLiveResponse,
  { empMap: Map<string, string>; comandaOwnerName: Map<string, string> }
>()

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

function buildEmployeeMaps(snapshot: OperationsLiveResponse | undefined) {
  if (snapshot) {
    const cached = employeeMapsCache.get(snapshot)
    if (cached) {
      return cached
    }
  }

  const empMap = new Map<string, string>()
  const comandaOwnerName = new Map<string, string>()

  if (!snapshot) {
    return { empMap, comandaOwnerName }
  }

  for (const emp of collectOperationGroups(snapshot)) {
    if (emp.employeeId) {
      empMap.set(emp.employeeId, emp.displayName)
    }
    if ((emp as Record<string, unknown>).userId) {
      empMap.set((emp as Record<string, unknown>).userId as string, emp.displayName)
    }
    for (const c of emp.comandas) {
      comandaOwnerName.set(c.id, emp.displayName)
    }
  }

  const maps = { empMap, comandaOwnerName }
  employeeMapsCache.set(snapshot, maps)
  return maps
}

function resolveGarcomNome(
  empMap: Map<string, string>,
  comandaOwnerName: Map<string, string>,
  gId: string | undefined,
  comanda?: { id: string },
) {
  const fromMap = gId ? empMap.get(gId) : undefined
  if (fromMap) {
    return fromMap
  }
  return comanda ? comandaOwnerName.get(comanda.id) : undefined
}

function buildMesasFromComandas(
  snapshot: OperationsLiveResponse | undefined,
  empMap: Map<string, string>,
  comandaOwnerName: Map<string, string>,
): Mesa[] {
  const activeRecords = collectComandas(snapshot).filter((comanda) => isOpenOperationsStatus(comanda.status))
  const labels = [...new Set([...DEFAULT_TABLE_LABELS, ...activeRecords.map((comanda) => comanda.tableLabel)])]
  return labels.map((label) => {
    const currentComanda = activeRecords.find((comanda) => comanda.tableLabel === label)
    const gId = currentComanda?.currentEmployeeId ?? undefined
    return {
      id: label,
      numero: label,
      capacidade: label === 'VIP' ? 10 : 4,
      status: currentComanda ? 'ocupada' : 'livre',
      comandaId: currentComanda?.id,
      garcomId: gId,
      garcomNome: resolveGarcomNome(empMap, comandaOwnerName, gId, currentComanda),
    }
  })
}

export function buildPdvMesas(snapshot: OperationsLiveResponse | undefined): Mesa[] {
  if (snapshot) {
    const cached = pdvMesasCache.get(snapshot)
    if (cached) {
      return cached
    }
  }

  const { empMap, comandaOwnerName } = buildEmployeeMaps(snapshot)

  if (!snapshot?.mesas?.length) {
    const mesas = buildMesasFromComandas(snapshot, empMap, comandaOwnerName)
    if (snapshot) {
      pdvMesasCache.set(snapshot, mesas)
    }
    return mesas
  }

  const activeComandas = collectComandas(snapshot).filter((c) => isOpenOperationsStatus(c.status))
  const comandaByTable = new Map<string, (typeof activeComandas)[0]>()
  for (const c of activeComandas) {
    if (c.tableLabel) {
      comandaByTable.set(normalizeTableLabel(c.tableLabel), c)
    }
  }

  const mesas = snapshot.mesas
    .filter((mesa) => mesa.active)
    .map((mesa) => {
      const matchedComanda = comandaByTable.get(normalizeTableLabel(mesa.label))
      const isOccupied = mesa.status === 'ocupada' || Boolean(matchedComanda)
      const gId = mesa.currentEmployeeId ?? matchedComanda?.currentEmployeeId ?? undefined
      return {
        id: mesa.id,
        numero: mesa.label,
        capacidade: mesa.capacity,
        status: (isOccupied ? 'ocupada' : mesa.status) as Mesa['status'],
        comandaId: mesa.comandaId ?? matchedComanda?.id ?? undefined,
        garcomId: gId,
        garcomNome: resolveGarcomNome(empMap, comandaOwnerName, gId, matchedComanda),
      }
    })

  pdvMesasCache.set(snapshot, mesas)
  return mesas
}

export function toOperationsStatus(status: Exclude<Comanda['status'], 'fechada' | 'cancelada'>) {
  switch (status) {
    case 'em_preparo':
      return 'IN_PREPARATION' as const
    case 'pronta':
      return 'READY' as const
    case 'aberta':
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

function collectComandas(snapshot: OperationsLiveResponse | undefined) {
  if (!snapshot) {
    return [] as ComandaRecord[]
  }

  return collectOperationGroups(snapshot).flatMap((group) => group.comandas)
}

function mapComandaStatus(status: ComandaRecord['status']): Comanda['status'] {
  switch (status) {
    case 'IN_PREPARATION':
      return 'em_preparo'
    case 'READY':
      return 'pronta'
    case 'CANCELLED':
      return 'cancelada'
    case 'CLOSED':
      return 'fechada'
    case 'OPEN':
    default:
      return 'aberta'
  }
}

function isOpenOperationsStatus(status: ComandaRecord['status']) {
  const mappedStatus = mapComandaStatus(status)
  return !isEndedComandaStatus(mappedStatus)
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
