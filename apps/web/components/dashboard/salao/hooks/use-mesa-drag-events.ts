import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import type { DragState } from '../constants'
import {
  calculateDragPosition,
  getCanvasWidth,
  type MesaDragOverrides,
  type MesaPosition,
  resolveActiveDrag,
  resolveFinalDragPosition,
  withMesaOverride,
} from './use-mesa-drag.model'

type DragPositionState = (MesaPosition & { mesaId: string }) | null

interface UseMesaDragEventsOptions {
  canvasRef: React.RefObject<HTMLDivElement | null>
  dragOverridesRef: React.RefObject<MesaDragOverrides>
  dragging: DragState | null
  dragPositionRef: React.RefObject<DragPositionState>
  onPositionSave: (id: string, x: number, y: number) => void
  setDragging: (dragging: DragState | null) => void
  setDragOverrides: React.Dispatch<React.SetStateAction<MesaDragOverrides>>
  setDragPosition: (position: DragPositionState) => void
}

export function useLatestRef<T>(value: T) {
  const ref = useRef(value)
  useLayoutEffect(() => {
    ref.current = value
  }, [value])
  return ref
}

export function useMesaDragEvents(options: UseMesaDragEventsOptions) {
  const pendingPositionRef = useRef<MesaPosition | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const handlePointerMove = usePointerMoveHandler(options, pendingPositionRef, animationFrameRef)
  const handlePointerUp = usePointerUpHandler(options, pendingPositionRef, animationFrameRef)

  useEffect(() => {
    if (!options.dragging) {
      return
    }
    globalThis.addEventListener('pointermove', handlePointerMove, { passive: true })
    globalThis.addEventListener('pointerup', handlePointerUp)
    globalThis.addEventListener('pointercancel', handlePointerUp)
    return () => {
      globalThis.removeEventListener('pointermove', handlePointerMove)
      globalThis.removeEventListener('pointerup', handlePointerUp)
      globalThis.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [options.dragging, handlePointerMove, handlePointerUp])
}

function usePointerMoveHandler(
  options: UseMesaDragEventsOptions,
  pendingPositionRef: React.MutableRefObject<MesaPosition | null>,
  animationFrameRef: React.MutableRefObject<number | null>,
) {
  return useCallback(
    (event: PointerEvent) => {
      const activeDrag = resolveActiveDrag(event, options.dragging)
      if (!activeDrag) {
        return
      }

      pendingPositionRef.current = calculateDragPosition(event, activeDrag, getCanvasWidth(options.canvasRef.current))
      if (animationFrameRef.current != null) {
        return
      }

      animationFrameRef.current = globalThis.requestAnimationFrame(() => {
        const nextPosition = pendingPositionRef.current
        animationFrameRef.current = null
        if (nextPosition) {
          options.setDragPosition({ mesaId: activeDrag.mesaId, x: nextPosition.x, y: nextPosition.y })
        }
      })
    },
    [animationFrameRef, options, pendingPositionRef],
  )
}

function usePointerUpHandler(
  options: UseMesaDragEventsOptions,
  pendingPositionRef: React.MutableRefObject<MesaPosition | null>,
  animationFrameRef: React.MutableRefObject<number | null>,
) {
  return useCallback(
    (event: PointerEvent) => {
      const activeDrag = resolveActiveDrag(event, options.dragging)
      if (!activeDrag) {
        return
      }

      saveFinalMesaPosition(options, activeDrag)
      clearScheduledDragFrame(animationFrameRef)
      pendingPositionRef.current = null
      options.setDragPosition(null)
      options.setDragging(null)
    },
    [animationFrameRef, options, pendingPositionRef],
  )
}

function saveFinalMesaPosition(options: UseMesaDragEventsOptions, dragging: DragState) {
  const position = resolveFinalDragPosition(
    options.dragPositionRef.current,
    options.dragOverridesRef.current,
    dragging.mesaId,
  )
  if (!position) {
    return
  }

  options.setDragOverrides((prev) => withMesaOverride(prev, dragging.mesaId, position))
  options.onPositionSave(dragging.mesaId, Math.round(position.x), Math.round(position.y))
}

function clearScheduledDragFrame(animationFrameRef: React.MutableRefObject<number | null>) {
  if (animationFrameRef.current == null) {
    return
  }

  cancelAnimationFrame(animationFrameRef.current)
  animationFrameRef.current = null
}
