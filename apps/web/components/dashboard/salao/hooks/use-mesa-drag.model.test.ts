import { describe, expect, it } from 'vitest'
import type { MesaRecord } from '@contracts/contracts'
import {
  buildMesaDragState,
  calculateDragPosition,
  resolveFinalDragPosition,
  resolveMesaPosition,
  shouldStartMesaDrag,
  withMesaOverride,
} from './use-mesa-drag.model'

function mesaRecord(overrides: Partial<MesaRecord> = {}): MesaRecord {
  return {
    id: 'mesa-1',
    label: 'Mesa 1',
    capacity: 4,
    section: null,
    positionX: null,
    positionY: null,
    active: true,
    reservedUntil: null,
    status: 'livre',
    comandaId: null,
    currentEmployeeId: null,
    ...overrides,
  }
}

describe('use mesa drag model', () => {
  it('prioritizes temporary drag override before saved and automatic positions', () => {
    expect(
      resolveMesaPosition(mesaRecord({ positionX: 30, positionY: 40 }), 0, { 'mesa-1': { x: 10, y: 20 } }),
    ).toEqual({
      x: 10,
      y: 20,
    })
    expect(resolveMesaPosition(mesaRecord({ positionX: 30, positionY: 40 }), 0, {})).toEqual({ x: 30, y: 40 })
    expect(resolveMesaPosition(mesaRecord(), 0, {})).toEqual({ x: 24, y: 24 })
  })

  it('calculates clamped pointer movement from drag origin', () => {
    const dragging = buildMesaDragState({ clientX: 100, clientY: 120, pointerId: 7 }, 'mesa-1', { x: 40, y: 60 })

    expect(calculateDragPosition({ clientX: 950, clientY: 900, pointerId: 7 }, dragging, 320)).toEqual({
      x: 208,
      y: 484,
    })
  })

  it('keeps Android touch free for tap and scroll instead of starting drag', () => {
    expect(shouldStartMesaDrag({ button: 0, isPrimary: true, pointerType: 'touch' })).toBe(false)
    expect(shouldStartMesaDrag({ button: 0, isPrimary: true, pointerType: 'mouse' })).toBe(true)
    expect(shouldStartMesaDrag({ button: 2, isPrimary: true, pointerType: 'mouse' })).toBe(false)
  })

  it('resolves final position and stores override without mutating previous state', () => {
    const previous = { 'mesa-1': { x: 1, y: 2 } }

    expect(resolveFinalDragPosition(null, previous, 'mesa-1')).toEqual({ x: 1, y: 2 })
    expect(withMesaOverride(previous, 'mesa-1', { x: 8, y: 9 })).toEqual({ 'mesa-1': { x: 8, y: 9 } })
    expect(previous).toEqual({ 'mesa-1': { x: 1, y: 2 } })
  })
})
