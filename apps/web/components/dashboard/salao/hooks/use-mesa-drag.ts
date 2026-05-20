import { useCallback, useState } from 'react'
import type { MesaRecord } from '@contracts/contracts'
import type { DragState } from '../constants'
import {
  buildMesaDragState,
  type MesaDragOverrides,
  type MesaPosition,
  resolveMesaPosition,
  shouldStartMesaDrag,
} from './use-mesa-drag.model'
import { useLatestRef, useMesaDragEvents } from './use-mesa-drag-events'

interface UseMesaDragOptions {
  onPositionSave: (id: string, x: number, y: number) => void
  canvasRef: React.RefObject<HTMLDivElement | null>
}

export function useMesaDrag({ onPositionSave, canvasRef }: UseMesaDragOptions) {
  const [dragging, setDragging] = useState<DragState | null>(null)
  const [dragOverrides, setDragOverrides] = useState<MesaDragOverrides>({})
  const [dragPosition, setDragPosition] = useState<(MesaPosition & { mesaId: string }) | null>(null)
  const dragOverridesRef = useLatestRef(dragOverrides)
  const dragPositionRef = useLatestRef(dragPosition)

  const getMesaPosition = useCallback(
    (mesa: MesaRecord, autoIndex: number): { x: number; y: number } => {
      return resolveMesaPosition(mesa, autoIndex, dragOverrides)
    },
    [dragOverrides],
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, mesa: MesaRecord, autoIndex: number) => {
      if (!shouldStartMesaDrag(e)) {
        return
      }

      e.preventDefault()
      if ('setPointerCapture' in e.currentTarget) {
        e.currentTarget.setPointerCapture(e.pointerId)
      }
      const pos = getMesaPosition(mesa, autoIndex)
      setDragging(buildMesaDragState(e, mesa.id, pos))
      setDragPosition({ mesaId: mesa.id, x: pos.x, y: pos.y })
    },
    [getMesaPosition],
  )

  useMesaDragEvents({
    canvasRef,
    dragOverridesRef,
    dragging,
    dragPositionRef,
    onPositionSave,
    setDragging,
    setDragOverrides,
    setDragPosition,
  })

  return {
    dragging,
    dragPosition,
    dragOverrides,
    getMesaPosition,
    handlePointerDown,
  }
}
