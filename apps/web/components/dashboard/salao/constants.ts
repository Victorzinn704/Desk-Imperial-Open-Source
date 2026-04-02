import type { MesaRecord } from '@contracts/contracts'
import { formatBRL } from '@/lib/currency'
import { OPERATIONS_LIVE_OPEN_ONLY_QUERY_KEY } from '@/lib/operations'

// ── Query Keys ────────────────────────────────────────────────────────────────

export const QUERY_KEY = ['mesas'] as const
export const LIVE_QUERY_KEY = OPERATIONS_LIVE_OPEN_ONLY_QUERY_KEY

// ── Canvas / Grid Layout ──────────────────────────────────────────────────────

export const CANVAS_H = 560
export const CARD_W = 112
export const CARD_H = 76
export const GRID_SPACING_X = 136
export const GRID_SPACING_Y = 100
export const GRID_COLS = 7
export const CANVAS_PADDING = 24

// ── Status Labels ─────────────────────────────────────────────────────────────

export const STATUS_LABEL: Record<string, { text: string; color: string; bg: string }> = {
  aberta: { text: 'Aberta', color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  em_preparo: { text: 'Em preparo', color: '#eab308', bg: 'rgba(234,179,8,0.15)' },
  pronta: { text: 'Pronta', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  fechada: { text: 'Paga', color: '#36f57c', bg: 'rgba(54,245,124,0.12)' },
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type View = 'operacional' | 'comandas' | 'configuracao' | 'planta'

export type CreateForm = {
  mode: 'single' | 'bulk'
  label: string
  capacity: string
  section: string
  bulkPrefix: string
  bulkFrom: string
  bulkTo: string
}

export type EditForm = {
  label: string
  capacity: string
  section: string
}

export type DragState = {
  mesaId: string
  startMouseX: number
  startMouseY: number
  origX: number
  origY: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export const fmtBRL = formatBRL

export function defaultCreateForm(): CreateForm {
  return {
    mode: 'single',
    label: '',
    capacity: '4',
    section: '',
    bulkPrefix: 'Mesa',
    bulkFrom: '1',
    bulkTo: '10',
  }
}

export function getAutoPosition(index: number): { x: number; y: number } {
  const col = index % GRID_COLS
  const row = Math.floor(index / GRID_COLS)
  return { x: CANVAS_PADDING + col * GRID_SPACING_X, y: CANVAS_PADDING + row * GRID_SPACING_Y }
}

export function clamp(value: number, min: number, maxValue: number): number {
  return Math.max(min, Math.min(maxValue, value))
}

export function getMesaPositionStatic(
  mesa: MesaRecord,
  autoIndex: number,
  dragOverrides: Record<string, { x: number; y: number }>,
): { x: number; y: number } {
  if (dragOverrides[mesa.id]) return dragOverrides[mesa.id]
  if (mesa.positionX !== null && mesa.positionY !== null) return { x: mesa.positionX, y: mesa.positionY }
  return getAutoPosition(autoIndex)
}
