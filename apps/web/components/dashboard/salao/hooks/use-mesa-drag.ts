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
  const [dragPosition, setDragPosition] = useState<{ mesaId: string; x: number; y: number } | null>(null)
  const dragOverridesRef = useRef(dragOverrides)
  const dragPositionRef = useRef(dragPosition)
  const pendingPositionRef = useRef<{ x: number; y: number } | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  useLayoutEffect(() => {
    dragOverridesRef.current = dragOverrides
  })

  useLayoutEffect(() => {
    dragPositionRef.current = dragPosition
  }, [dragPosition])

  const getMesaPosition = useCallback(
    (mesa: MesaRecord, autoIndex: number): { x: number; y: number } => {
      if (dragOverrides[mesa.id]) return dragOverrides[mesa.id]
      if (mesa.positionX !== null && mesa.positionY !== null) return { x: mesa.positionX, y: mesa.positionY }
      return getAutoPosition(autoIndex)
    },
    [dragOverrides],
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, mesa: MesaRecord, autoIndex: number) => {
      e.preventDefault()
      if ('setPointerCapture' in e.currentTarget) {
        e.currentTarget.setPointerCapture(e.pointerId)
      }
      const pos = getMesaPosition(mesa, autoIndex)
      setDragging({
        mesaId: mesa.id,
        pointerId: e.pointerId,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        origX: pos.x,
        origY: pos.y,
      })
      setDragPosition({ mesaId: mesa.id, x: pos.x, y: pos.y })
    },
    [getMesaPosition],
  )

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!dragging) return
      if (e.pointerId !== dragging.pointerId) return

      const canvasEl = canvasRef.current
      const canvasW = canvasEl ? canvasEl.offsetWidth : 800
      const newX = clamp(dragging.origX + (e.clientX - dragging.startMouseX), 0, canvasW - CARD_W)
      const newY = clamp(dragging.origY + (e.clientY - dragging.startMouseY), 0, CANVAS_H - CARD_H)
      pendingPositionRef.current = { x: newX, y: newY }
      if (animationFrameRef.current != null) {
        return
      }

      animationFrameRef.current = window.requestAnimationFrame(() => {
        const nextPosition = pendingPositionRef.current
        animationFrameRef.current = null
        if (!nextPosition) {
          return
        }
        setDragPosition({ mesaId: dragging.mesaId, x: nextPosition.x, y: nextPosition.y })
      })
    },
    [dragging, canvasRef],
  )

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      if (!dragging) return
      if (e.pointerId !== dragging.pointerId) return

      const pos = dragPositionRef.current
        ? { x: dragPositionRef.current.x, y: dragPositionRef.current.y }
        : dragOverridesRef.current[dragging.mesaId]
      if (pos) {
        setDragOverrides((prev) => ({ ...prev, [dragging.mesaId]: { x: pos.x, y: pos.y } }))
        onPositionSave(dragging.mesaId, Math.round(pos.x), Math.round(pos.y))
      }
      if (animationFrameRef.current != null) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      pendingPositionRef.current = null
      setDragPosition(null)
      setDragging(null)
    },
    [dragging, onPositionSave],
  )

  useEffect(() => {
    if (!dragging) return
    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [dragging, handlePointerMove, handlePointerUp])

  return {
    dragging,
    dragPosition,
    dragOverrides,
    getMesaPosition,
    handlePointerDown,
  }
}
