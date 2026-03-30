import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { MesaRecord } from '@contracts/contracts'
import { CANVAS_H, CARD_H, CARD_W, clamp, getAutoPosition, type DragState } from '../constants'

interface UseMesaDragOptions {
  onPositionSave: (id: string, x: number, y: number) => void
  canvasRef: React.RefObject<HTMLDivElement | null>
}

export function useMesaDrag({ onPositionSave, canvasRef }: UseMesaDragOptions) {
  const [dragging, setDragging] = useState<DragState | null>(null)
  const [dragOverrides, setDragOverrides] = useState<Record<string, { x: number; y: number }>>({})
  const dragOverridesRef = useRef(dragOverrides)

  useLayoutEffect(() => {
    dragOverridesRef.current = dragOverrides
  })

  const getMesaPosition = useCallback(
    (mesa: MesaRecord, autoIndex: number): { x: number; y: number } => {
      if (dragOverrides[mesa.id]) return dragOverrides[mesa.id]
      if (mesa.positionX !== null && mesa.positionY !== null) return { x: mesa.positionX, y: mesa.positionY }
      return getAutoPosition(autoIndex)
    },
    [dragOverrides],
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, mesa: MesaRecord, autoIndex: number) => {
      e.preventDefault()
      const pos = getMesaPosition(mesa, autoIndex)
      setDragging({
        mesaId: mesa.id,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        origX: pos.x,
        origY: pos.y,
      })
    },
    [getMesaPosition],
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging) return
      const canvasEl = canvasRef.current
      const canvasW = canvasEl ? canvasEl.offsetWidth : 800
      const newX = clamp(dragging.origX + (e.clientX - dragging.startMouseX), 0, canvasW - CARD_W)
      const newY = clamp(dragging.origY + (e.clientY - dragging.startMouseY), 0, CANVAS_H - CARD_H)
      setDragOverrides((prev) => ({ ...prev, [dragging.mesaId]: { x: newX, y: newY } }))
    },
    [dragging, canvasRef],
  )

  const handleMouseUp = useCallback(() => {
    if (!dragging) return
    const pos = dragOverridesRef.current[dragging.mesaId]
    if (pos) {
      onPositionSave(dragging.mesaId, Math.round(pos.x), Math.round(pos.y))
    }
    setDragging(null)
  }, [dragging, onPositionSave])

  useEffect(() => {
    if (!dragging) return
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragging, handleMouseMove, handleMouseUp])

  return {
    dragging,
    dragOverrides,
    getMesaPosition,
    handleMouseDown,
  }
}
