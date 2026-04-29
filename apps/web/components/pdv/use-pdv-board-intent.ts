'use client'

import { useEffect, useRef } from 'react'
import type { OperationsLiveResponse } from '@contracts/contracts'
import type { PdvMesaIntent } from './pdv-navigation-intent'
import { resolveSelectedMesa } from './pdv-board.helpers'
import type { Comanda, Mesa } from './pdv-types'

type UsePdvBoardIntentArgs = Readonly<{
  comandasById: ReadonlyMap<string, Comanda>
  mesaIntent: PdvMesaIntent | null
  mesas: readonly Mesa[]
  mesasById: ReadonlyMap<string, Mesa>
  onConsumeMesaIntent?: () => void
  operationsSnapshot?: OperationsLiveResponse
  setEditingComandaId: (value: string | null) => void
  setMesaPreSelected: (value: Mesa | null) => void
  setMesaPreSelectedLabel: (value: string | null) => void
  setShowNewModal: (value: boolean) => void
}>

// eslint-disable-next-line max-lines-per-function
export function usePdvBoardIntent({
  comandasById,
  mesaIntent,
  mesas,
  mesasById,
  onConsumeMesaIntent,
  operationsSnapshot,
  setEditingComandaId,
  setMesaPreSelected,
  setMesaPreSelectedLabel,
  setShowNewModal,
}: UsePdvBoardIntentArgs) {
  const lastHandledIntentRef = useRef<number | null>(null)

  useEffect(() => {
    if (!mesaIntent) {
      lastHandledIntentRef.current = null
      return
    }
    if (lastHandledIntentRef.current === mesaIntent.requestId) {
      return
    }

    const comandaFromIntent = mesaIntent.comandaId ? (comandasById.get(mesaIntent.comandaId) ?? null) : null
    const mesaFromIntent =
      mesasById.get(mesaIntent.mesaId) ?? resolveSelectedMesa([...mesas], mesaIntent.mesaLabel) ?? null

    if (mesaIntent.comandaId && !comandaFromIntent && !operationsSnapshot) {
      return
    }

    lastHandledIntentRef.current = mesaIntent.requestId
    const frame = window.requestAnimationFrame(() => {
      if (comandaFromIntent) {
        setShowNewModal(false)
        setMesaPreSelected(null)
        setMesaPreSelectedLabel(null)
        setEditingComandaId(comandaFromIntent.id)
        onConsumeMesaIntent?.()
        return
      }

      setEditingComandaId(null)
      setMesaPreSelected(mesaFromIntent)
      setMesaPreSelectedLabel(mesaFromIntent?.numero ?? mesaIntent.mesaLabel)
      setShowNewModal(true)
      onConsumeMesaIntent?.()
    })

    return () => window.cancelAnimationFrame(frame)
  }, [
    comandasById,
    mesaIntent,
    mesas,
    mesasById,
    onConsumeMesaIntent,
    operationsSnapshot,
    setEditingComandaId,
    setMesaPreSelected,
    setMesaPreSelectedLabel,
    setShowNewModal,
  ])
}
