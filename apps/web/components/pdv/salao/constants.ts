import type { Mesa, Comanda, Garcom, MesaStatus } from '../pdv-types'
import { STATUS_COLORS, GARCOM_COLORS } from '@/lib/design-tokens'
export { STATUS_COLORS, GARCOM_COLORS, getStatusColor, type StatusKey } from '@/lib/design-tokens'

export const STATUS_CONFIG: Record<MesaStatus, { label: string; color: string; bg: string; border: string }> = {
  livre: {
    label: 'Livre',
    color: STATUS_COLORS.livre.solid,
    bg: STATUS_COLORS.livre.bg,
    border: STATUS_COLORS.livre.border,
  },
  ocupada: {
    label: 'Ocupada',
    color: STATUS_COLORS.ocupada.solid,
    bg: STATUS_COLORS.ocupada.bg,
    border: STATUS_COLORS.ocupada.border,
  },
  reservada: {
    label: 'Reservada',
    color: STATUS_COLORS.reservada.solid,
    bg: STATUS_COLORS.reservada.bg,
    border: STATUS_COLORS.reservada.border,
  },
}

export const GARCOM_CORES = GARCOM_COLORS

// ─── Tipos internos ────────────────────────────────────────────────────────────

export type SalaoView = 'salao' | 'equipe'
export type FilterStatus = 'todos' | MesaStatus | 'sem_garcom' | 'atencao'

// ─── Helpers ───────────────────────────────────────────────────────────────────

export function garcomCor(garcon: Garcom, all: Garcom[]) {
  return garcon.cor || GARCOM_COLORS[all.findIndex((g) => g.id === garcon.id) % GARCOM_COLORS.length]
}

export function initials(nome: string) {
  return nome
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

/** 0=normal · 1=30-59min amber · 2=60-89min amber+glow · 3=90+ red pulsing */
export function urgencyLevel(mesa: Mesa, comanda: Comanda | undefined, now: number): 0 | 1 | 2 | 3 {
  if (mesa.status !== 'ocupada' || !comanda) return 0
  const min = Math.floor((now - comanda.abertaEm.getTime()) / 60000)
  if (min >= 90) return 3
  if (min >= 60) return 2
  if (min >= 30) return 1
  return 0
}

export function urgencyBorderColor(level: 0 | 1 | 2 | 3): string {
  if (level === 3) return 'rgba(248,113,113,0.65)'
  if (level === 2) return 'rgba(251,191,36,0.5)'
  if (level === 1) return 'rgba(251,191,36,0.28)'
  return ''
}

export function urgencyShadow(level: 0 | 1 | 2 | 3): string | undefined {
  if (level === 3) return '0 0 18px rgba(248,113,113,0.22)'
  if (level === 2) return '0 0 10px rgba(251,191,36,0.15)'
  return undefined
}

export function resolveMesaComanda(mesa: Mesa, comandaById: ReadonlyMap<string, Comanda>) {
  return mesa.comandaId ? comandaById.get(mesa.comandaId) : undefined
}
