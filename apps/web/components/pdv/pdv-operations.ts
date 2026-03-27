'use client'

import type { OperationsLiveResponse, ComandaRecord } from '@contracts/contracts'
import type { Mesa, Comanda, ComandaItem, Garcom } from './pdv-types'
import { normalizeTableLabel } from './normalize-table-label'

const GARCOM_CORES = ['#a78bfa', '#34d399', '#fb923c', '#f472b6', '#60a5fa', '#fbbf24', '#e879f9', '#2dd4bf']

export const DEFAULT_TABLE_LABELS = [...Array.from({ length: 12 }, (_, index) => String(index + 1)), 'VIP']

export function buildPdvComandas(snapshot: OperationsLiveResponse | undefined): Comanda[] {
  if (!snapshot) {
    return []
  }

  const groups = [...snapshot.employees, snapshot.unassigned]
  return groups
    .flatMap((group) => group.comandas.map(toPdvComanda))
    .sort((left, right) => right.abertaEm.getTime() - left.abertaEm.getTime())
}

export function toPdvComanda(comanda: ComandaRecord): Comanda {
  return {
    id: comanda.id,
    status: mapComandaStatus(comanda.status),
    mesa: comanda.tableLabel,
    clienteNome: comanda.customerName ?? undefined,
    clienteDocumento: comanda.customerDocument ?? undefined,
    itens: comanda.items.map((item) => ({
      produtoId: item.productId ?? `manual-${item.id}`,
      nome: item.productName,
      quantidade: item.quantity,
      precoUnitario: item.unitPrice,
      observacao: item.notes ?? undefined,
    })),
    desconto: toPercent(comanda.discountAmount, comanda.subtotalAmount),
    acrescimo: toPercent(comanda.serviceFeeAmount, comanda.subtotalAmount),
    abertaEm: new Date(comanda.openedAt),
  }
}

export function buildPdvGarcons(snapshot: OperationsLiveResponse | undefined): Garcom[] {
  if (!snapshot) {
    return []
  }

  return snapshot.employees
    .filter((employee) => employee.employeeId)
    .map((employee, index) => ({
      id: employee.employeeId!,
      nome: employee.displayName,
      cor: GARCOM_CORES[index % GARCOM_CORES.length],
    }))
}

export function buildPdvMesas(snapshot: OperationsLiveResponse | undefined): Mesa[] {
  // Build employee name map — index by ALL available IDs for maximum match
  const empMap = new Map<string, string>()
  // Also build comanda → employee name map from group ownership
  const comandaOwnerName = new Map<string, string>()

  if (snapshot) {
    for (const emp of snapshot.employees) {
      if (emp.employeeId) empMap.set(emp.employeeId, emp.displayName)
      // Also index by userId if different from employeeId
      if ((emp as Record<string, unknown>).userId) {
        empMap.set((emp as Record<string, unknown>).userId as string, emp.displayName)
      }
      // Map each comanda in this group to the employee name
      for (const c of emp.comandas) {
        comandaOwnerName.set(c.id, emp.displayName)
      }
    }
  }

  function resolveGarcomNome(gId: string | undefined, comanda?: { id: string }) {
    if (gId) {
      const fromMap = empMap.get(gId)
      if (fromMap) return fromMap
    }
    if (comanda) {
      const fromOwner = comandaOwnerName.get(comanda.id)
      if (fromOwner) return fromOwner
    }
    return undefined
  }

  if (!snapshot?.mesas?.length) {
    // fallback: derive from active comandas if mesas not yet seeded in DB
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
        garcomNome: resolveGarcomNome(gId, currentComanda),
      }
    })
  }

  // Build active comandas map by tableLabel for cross-reference
  const activeComandas = collectComandas(snapshot).filter((c) => isOpenOperationsStatus(c.status))
  const comandaByTable = new Map<string, typeof activeComandas[0]>()
  for (const c of activeComandas) {
    if (c.tableLabel) comandaByTable.set(c.tableLabel, c)
  }

  return snapshot.mesas
    .filter((mesa) => mesa.active)
    .map((mesa) => {
      // Cross-reference: if backend mesa status is 'livre' but there's an active comanda, override
      const matchedComanda = comandaByTable.get(mesa.label)
      const isOccupied = mesa.status === 'ocupada' || Boolean(matchedComanda)
      const gId = mesa.currentEmployeeId ?? matchedComanda?.currentEmployeeId ?? undefined
      return {
        id: mesa.id,
        numero: mesa.label,
        capacidade: mesa.capacity,
        status: (isOccupied ? 'ocupada' : mesa.status) as Mesa['status'],
        comandaId: mesa.comandaId ?? matchedComanda?.id ?? undefined,
        garcomId: gId,
        garcomNome: resolveGarcomNome(gId, matchedComanda),
      }
    })
}

export function toOperationsStatus(status: Exclude<Comanda['status'], 'fechada'>) {
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
  const subtotal = input.itens.reduce((sum, item) => sum + item.quantidade * item.precoUnitario, 0)
  return {
    discountAmount: roundMoney((subtotal * input.desconto) / 100),
    serviceFeeAmount: roundMoney((subtotal * input.acrescimo) / 100),
  }
}

function collectComandas(snapshot: OperationsLiveResponse | undefined) {
  if (!snapshot) {
    return [] as ComandaRecord[]
  }

  return [...snapshot.employees, snapshot.unassigned].flatMap((group) => group.comandas)
}

function mapComandaStatus(status: ComandaRecord['status']): Comanda['status'] {
  switch (status) {
    case 'IN_PREPARATION':
      return 'em_preparo'
    case 'READY':
      return 'pronta'
    case 'CLOSED':
    case 'CANCELLED':
      return 'fechada'
    case 'OPEN':
    default:
      return 'aberta'
  }
}

function isOpenOperationsStatus(status: ComandaRecord['status']) {
  return status === 'OPEN' || status === 'IN_PREPARATION' || status === 'READY'
}

function toPercent(amount: number, subtotal: number) {
  if (subtotal <= 0 || amount <= 0) {
    return 0
  }

  return roundMoney((amount / subtotal) * 100)
}

function roundMoney(value: number) {
  return Number(value.toFixed(2))
}
