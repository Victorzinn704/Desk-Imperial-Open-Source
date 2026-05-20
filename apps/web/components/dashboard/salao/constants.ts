import { formatBRL } from '@/lib/currency'

// ── Query Keys ────────────────────────────────────────────────────────────────

export const QUERY_KEY = ['mesas'] as const
export const LIVE_QUERY_KEY = ['operations', 'live', 'compact'] as const

// ── Canvas / Grid Layout ──────────────────────────────────────────────────────

export const CANVAS_H = 560
export const CARD_W = 112
export const CARD_H = 76
export const GRID_SPACING_X = 136
export const GRID_SPACING_Y = 100
export const GRID_COLS = 7
export const CANVAS_PADDING = 24

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
  pointerId: number
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
