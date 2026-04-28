'use client'

import { type DropResult } from '@hello-pangea/dnd'
import { useMemo, useState } from 'react'
import { type Comanda, type Mesa, type MesaStatus } from '../../pdv-types'
import type { FilterStatus } from '../constants'
import { matchesMesaFilter } from '../helpers'

type UseSalaoBoardDataInput = {
  allowStatusDragging: boolean
  comandas: Comanda[]
  filter: FilterStatus
  mesas: Mesa[]
  now: number
  onStatusChange: (mesaId: string, status: MesaStatus) => void
  resolveMesaComanda: (mesa: Mesa, comandaById: ReadonlyMap<string, Comanda>) => Comanda | undefined
}

// eslint-disable-next-line max-lines-per-function
export function useSalaoBoardData({
  allowStatusDragging,
  comandas,
  filter,
  mesas,
  now,
  onStatusChange,
  resolveMesaComanda,
}: Readonly<UseSalaoBoardDataInput>) {
  const [compactLivres, setCompactLivres] = useState(false)
  const comandaById = useMemo(() => new Map(comandas.map((comanda) => [comanda.id, comanda])), [comandas])
  const handleDragEnd = (result: DropResult) => {
    if (!allowStatusDragging) {
      return
    }

    const { draggableId, destination } = result
    if (!destination) {
      return
    }

    const newStatus = destination.droppableId as MesaStatus
    const mesa = mesas.find((item) => item.id === draggableId)
    if (!mesa || mesa.status === newStatus) {
      return
    }

    onStatusChange(draggableId, newStatus)
  }

  const filteredMesas = useMemo(() => {
    return mesas.filter((mesa) => matchesMesaFilter(mesa, resolveMesaComanda(mesa, comandaById), filter, now))
  }, [comandaById, filter, mesas, now, resolveMesaComanda])

  const livreMesas = filteredMesas.filter((mesa) => mesa.status === 'livre')
  const ocupMesas = filteredMesas.filter((mesa) => mesa.status === 'ocupada')
  const resMesas = filteredMesas.filter((mesa) => mesa.status === 'reservada')

  const zones = [
    {
      id: 'ocupada' as MesaStatus,
      label: 'Ocupada',
      color: '#f87171',
      border: 'rgba(248,113,113,0.2)',
      bg: 'rgba(248,113,113,0.03)',
      list: ocupMesas,
    },
    {
      id: 'reservada' as MesaStatus,
      label: 'Reservada',
      color: '#60a5fa',
      border: 'rgba(96,165,250,0.2)',
      bg: 'rgba(96,165,250,0.03)',
      list: resMesas,
    },
  ]

  return {
    comandaById,
    compactLivres,
    handleDragEnd,
    livreMesas,
    setCompactLivres,
    zones,
  }
}
