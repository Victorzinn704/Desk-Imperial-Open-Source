'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { buildSalaoStats } from './helpers'
import { type Comanda, type Mesa } from '../pdv-types'
import type { FilterStatus, SalaoView } from './constants'
import { useUrgencyTick } from './hooks/use-urgency-tick'

type UseSalaoUnificadoControllerInput = {
  comandas: Comanda[]
  mesas: Mesa[]
  onAssignGarcom: (mesaId: string, garcomId: string | undefined) => void
}

export function useSalaoUnificadoController({
  comandas,
  mesas,
  onAssignGarcom,
}: Readonly<UseSalaoUnificadoControllerInput>) {
  const [filter, setFilter] = useState<FilterStatus>('todos')
  const [view, setView] = useState<SalaoView>('salao')
  const [assigningGarcomId, setAssigning] = useState<string | null>(null)
  const now = useUrgencyTick(60_000)
  const comandaById = useMemo(() => new Map(comandas.map((comanda) => [comanda.id, comanda])), [comandas])
  const stats = useMemo(() => buildSalaoStats(mesas, comandaById, now), [comandaById, mesas, now])
  const handleAssign = useCallback(
    (mesaId: string, garcomId: string | undefined) => {
      onAssignGarcom(mesaId, garcomId)
    },
    [onAssignGarcom],
  )

  useEffect(() => {
    if (!assigningGarcomId) {
      return
    }

    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAssigning(null)
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [assigningGarcomId])

  return {
    assigningGarcomId,
    filter,
    handleAssign,
    now,
    setAssigning,
    setFilter,
    setView,
    stats,
    view,
  }
}
