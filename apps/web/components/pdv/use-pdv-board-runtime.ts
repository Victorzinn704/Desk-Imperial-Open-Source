'use client'

import { useDeferredValue, useMemo } from 'react'
import type { OperationsLiveResponse } from '@contracts/contracts'
import { useLowPerformanceMode } from '@/hooks/use-performance'
import { buildComandasByStatus, buildPdvSectionCopy } from './pdv-board.helpers'
import { buildPdvComandas, buildPdvMesas } from './pdv-operations'

export function usePdvBoardRuntime(
  operations: OperationsLiveResponse | undefined,
  variant: 'grid' | 'comandas' | 'cobranca',
) {
  const isLowPerformance = useLowPerformanceMode()
  const deferredOperations = useDeferredValue(operations)
  const operationsSnapshot = isLowPerformance ? deferredOperations : operations
  const comandas = useMemo(() => buildPdvComandas(operationsSnapshot), [operationsSnapshot])
  const mesas = useMemo(() => buildPdvMesas(operationsSnapshot), [operationsSnapshot])
  const comandasById = useMemo(() => new Map(comandas.map((comanda) => [comanda.id, comanda])), [comandas])
  const mesasById = useMemo(() => new Map(mesas.map((mesa) => [mesa.id, mesa])), [mesas])
  const comandasByStatus = useMemo(() => buildComandasByStatus(comandas), [comandas])
  const sectionCopy = useMemo(() => buildPdvSectionCopy(variant), [variant])

  return {
    comandasById,
    comandasByStatus,
    mesas,
    mesasById,
    operationsSnapshot,
    sectionCopy,
  }
}
