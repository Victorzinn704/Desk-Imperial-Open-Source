'use client'

import { useMemo } from 'react'
import type { OrderRecord } from '@contracts/contracts'
import { type Comanda, isEndedComandaStatus } from '@/components/pdv/pdv-types'
import { buildPdvComandas, buildPdvMesas } from '@/components/pdv/pdv-operations'
import { buildPerformerKpis, buildPerformerStanding } from '@/lib/operations'
import type { useStaffMobileShellQueries } from './use-staff-mobile-shell-queries'
import type { StaffMobileCurrentUser } from './staff-mobile-shell-types'

function orderToHistoricComanda(order: OrderRecord): Comanda {
  const subtotal = order.items.reduce((sum, item) => sum + item.lineRevenue, 0)
  const total = order.totalRevenue

  return {
    abertaEm: new Date(order.createdAt),
    acrescimo: 0,
    clienteDocumento: order.buyerDocument ?? undefined,
    clienteNome: order.customerName ?? undefined,
    desconto: 0,
    garcomId: order.employeeId ?? undefined,
    garcomNome: order.sellerName ?? order.sellerCode ?? undefined,
    id: order.comandaId ?? order.id,
    itens: order.items.map((item) => ({
      nome: item.productName,
      precoUnitario: item.unitPrice,
      produtoId: item.productId ?? item.id,
      quantidade: item.quantity,
    })),
    mesa: order.channel ?? 'Venda',
    status: order.status === 'CANCELLED' ? 'cancelada' : 'fechada',
    subtotalBackend: subtotal > 0 ? subtotal : total,
    totalBackend: total,
  }
}

export function useStaffMetrics(
  currentUser: StaffMobileCurrentUser,
  operationsQuery: ReturnType<typeof useStaffMobileShellQueries>['operationsQuery'],
  kitchenQuery: ReturnType<typeof useStaffMobileShellQueries>['kitchenQuery'],
  ordersHistoryQuery: ReturnType<typeof useStaffMobileShellQueries>['ordersHistoryQuery'],
) {
  const currentEmployeeId = currentUser?.employeeId ?? null
  const mesas = useMemo(() => buildPdvMesas(operationsQuery.data), [operationsQuery.data])
  const comandas = useMemo(() => buildPdvComandas(operationsQuery.data), [operationsQuery.data])
  const comandasById = useMemo(() => new Map(comandas.map((comanda) => [comanda.id, comanda])), [comandas])
  const activeComandas = useMemo(() => comandas.filter((comanda) => !isEndedComandaStatus(comanda.status)), [comandas])

  const historicoComandas = useMemo(() => {
    if (!currentEmployeeId) {
      return []
    }

    const orders = ordersHistoryQuery.data?.items ?? []
    if (orders.length > 0) {
      return orders.filter((order) => order.employeeId === currentEmployeeId).map(orderToHistoricComanda)
    }

    return comandas.filter((comanda) => comanda.garcomId === currentEmployeeId && isEndedComandaStatus(comanda.status))
  }, [comandas, currentEmployeeId, ordersHistoryQuery.data?.items])

  const displayName = currentUser?.fullName ?? currentUser?.name ?? 'Funcionário'
  const performerKpis = useMemo(
    () => buildPerformerKpis(operationsQuery.data, currentEmployeeId),
    [currentEmployeeId, operationsQuery.data],
  )
  const performerStanding = useMemo(
    () => buildPerformerStanding(operationsQuery.data, currentEmployeeId),
    [currentEmployeeId, operationsQuery.data],
  )
  const kitchenBadge = useMemo(
    () => (kitchenQuery.data?.statusCounts.queued ?? 0) + (kitchenQuery.data?.statusCounts.inPreparation ?? 0),
    [kitchenQuery.data],
  )

  return {
    activeComandas,
    comandas,
    comandasById,
    displayName,
    historicoComandas,
    kitchenBadge,
    mesas,
    performerKpis,
    performerStanding,
  }
}
