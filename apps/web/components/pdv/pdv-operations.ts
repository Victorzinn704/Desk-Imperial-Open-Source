'use client'

import type { ComandaRecord, OperationsLiveResponse } from '@contracts/contracts'
import type { Comanda, Garcom, Mesa } from './pdv-types'

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

export function buildPdvMesas(snapshot: OperationsLiveResponse | undefined, defaultLabels = DEFAULT_TABLE_LABELS): Mesa[] {
  const activeRecords = collectComandas(snapshot).filter((comanda) => isOpenOperationsStatus(comanda.status))
  const labels = [...new Set([...defaultLabels, ...activeRecords.map((comanda) => comanda.tableLabel)])]
  const responsibleByComanda = new Map(activeRecords.map((comanda) => [comanda.id, comanda.currentEmployeeId ?? undefined]))

  return labels.map((label) => {
    const currentComanda = activeRecords.find((comanda) => comanda.tableLabel === label)

    return {
      id: label,
      numero: label,
      capacidade: label === 'VIP' ? 10 : 4,
      status: currentComanda ? 'ocupada' : 'livre',
      comandaId: currentComanda?.id,
      garcomId: currentComanda ? responsibleByComanda.get(currentComanda.id) : undefined,
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
