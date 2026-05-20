import type { MesaRecord } from '@contracts/contracts'
import { CANVAS_H, CARD_H, CARD_W, clamp, type DragState, getAutoPosition } from '../constants'

export type MesaPosition = { x: number; y: number }
export type MesaDragOverrides = Record<string, MesaPosition>

type PointerLike = Pick<PointerEvent, 'clientX' | 'clientY' | 'pointerId'>
type DragStartPointer = Pick<PointerEvent, 'button' | 'isPrimary' | 'pointerType'>

export function resolveMesaPosition(mesa: MesaRecord, autoIndex: number, overrides: MesaDragOverrides): MesaPosition {
  const override = overrides[mesa.id]
  if (override) {
    return override
  }
  if (mesa.positionX !== null && mesa.positionY !== null) {
    return { x: mesa.positionX, y: mesa.positionY }
  }
  return getAutoPosition(autoIndex)
}

export function buildMesaDragState(pointer: PointerLike, mesaId: string, position: MesaPosition): DragState {
  return {
    mesaId,
    pointerId: pointer.pointerId,
    startMouseX: pointer.clientX,
    startMouseY: pointer.clientY,
    origX: position.x,
    origY: position.y,
  }
}

export function shouldStartMesaDrag(pointer: DragStartPointer) {
  if (!pointer.isPrimary) {
    return false
  }

  if (pointer.pointerType === 'touch') {
    return false
  }

  return pointer.button === 0
}

export function resolveActiveDrag(pointer: PointerLike, dragging: DragState | null) {
  return dragging?.pointerId === pointer.pointerId ? dragging : null
}

export function calculateDragPosition(pointer: PointerLike, dragging: DragState, canvasWidth: number): MesaPosition {
  return {
    x: clamp(dragging.origX + (pointer.clientX - dragging.startMouseX), 0, canvasWidth - CARD_W),
    y: clamp(dragging.origY + (pointer.clientY - dragging.startMouseY), 0, CANVAS_H - CARD_H),
  }
}

export function getCanvasWidth(canvasEl: HTMLDivElement | null) {
  return canvasEl?.offsetWidth ?? 800
}

export function resolveFinalDragPosition(
  dragPosition: MesaPosition | null,
  dragOverrides: MesaDragOverrides,
  mesaId: string,
) {
  return dragPosition ?? dragOverrides[mesaId] ?? null
}

export function withMesaOverride(overrides: MesaDragOverrides, mesaId: string, position: MesaPosition) {
  return { ...overrides, [mesaId]: { x: position.x, y: position.y } }
}
