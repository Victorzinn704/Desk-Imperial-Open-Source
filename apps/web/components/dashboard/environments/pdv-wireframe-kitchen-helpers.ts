import type { OperationsKitchenItemRecord, OperationsKitchenResponse } from '@contracts/contracts'
import { calcTotal, type Comanda } from '@/components/pdv/pdv-types'
import type { KitchenTicket } from './pdv-wireframe-environment.types'
import { formatComandaCode } from './pdv-wireframe-comanda-helpers'

export function buildKitchenTickets(
  response: OperationsKitchenResponse | undefined,
  comandas: Comanda[],
): KitchenTicket[] {
  const comandaLookup = new Map(comandas.map((comanda) => [comanda.id, comanda]))
  const groups = buildKitchenTicketGroups(response)

  return [...groups.values()]
    .map((group) => {
      const relatedComanda = comandaLookup.get(group.comandaId)
      return {
        id: group.comandaId,
        code: formatComandaCode(group.comandaId),
        mesaLabel: group.mesaLabel,
        employeeName: group.employeeName,
        elapsedMinutes: resolveKitchenElapsedMinutes(group.items),
        items: group.items,
        status: resolveKitchenTicketStatus(group.items),
        sortTotal: relatedComanda ? calcTotal(relatedComanda) : 0,
      }
    })
    .sort((left, right) => right.elapsedMinutes - left.elapsedMinutes || right.sortTotal - left.sortTotal)
}

function buildKitchenTicketGroups(response: OperationsKitchenResponse | undefined) {
  const groups = new Map<
    string,
    { comandaId: string; mesaLabel: string; employeeName: string; items: OperationsKitchenItemRecord[] }
  >()

  for (const item of response?.items ?? []) {
    const existing = groups.get(item.comandaId)
    if (existing) {
      existing.items.push(item)
      continue
    }

    groups.set(item.comandaId, {
      comandaId: item.comandaId,
      mesaLabel: item.mesaLabel,
      employeeName: item.employeeName,
      items: [item],
    })
  }

  return groups
}

function resolveKitchenElapsedMinutes(items: OperationsKitchenItemRecord[]) {
  const queuedAt = items
    .map((item) => item.kitchenQueuedAt)
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => left.localeCompare(right))[0]

  return queuedAt ? Math.max(0, Math.floor((Date.now() - new Date(queuedAt).getTime()) / 60000)) : 0
}

function resolveKitchenTicketStatus(items: OperationsKitchenItemRecord[]): KitchenTicket['status'] {
  const statuses = items.map((item) => item.kitchenStatus)
  if (statuses.every((currentStatus) => currentStatus === 'READY')) {
    return 'ready'
  }
  if (statuses.some((currentStatus) => currentStatus === 'IN_PREPARATION')) {
    return 'in_preparation'
  }
  return 'queued'
}
