import type { Comanda, Garcom, Mesa, MesaStatus } from '../pdv-types'

// ─── Tipos internos ────────────────────────────────────────────────────────────

export type SalaoView = 'salao' | 'equipe'
export type FilterStatus = 'todos' | MesaStatus | 'sem_garcom' | 'atencao'

// ─── Cores de status ───────────────────────────────────────────────────────────

export const STATUS_CONFIG = {
  livre: { label: 'Livre', color: '#36f57c', bg: 'rgba(54,245,124,0.07)', border: 'rgba(54,245,124,0.25)' },
  ocupada: { label: 'Ocupada', color: '#f87171', bg: 'rgba(248,113,113,0.07)', border: 'rgba(248,113,113,0.25)' },
  reservada: { label: 'Reservada', color: '#60a5fa', bg: 'rgba(96,165,250,0.07)', border: 'rgba(96,165,250,0.25)' },
} as const

export const GARCOM_CORES = ['#a78bfa', '#34d399', '#fb923c', '#f472b6', '#60a5fa', '#fbbf24', '#e879f9', '#2dd4bf']

// ─── Helpers ───────────────────────────────────────────────────────────────────

export function garcomCor(garcon: Garcom, all: Garcom[]) {
  return garcon.cor || GARCOM_CORES[all.findIndex((g) => g.id === garcon.id) % GARCOM_CORES.length]
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
  if (mesa.status !== 'ocupada' || !comanda) {return 0}
  const min = Math.floor((now - comanda.abertaEm.getTime()) / 60000)
  if (min >= 90) {return 3}
  if (min >= 60) {return 2}
  if (min >= 30) {return 1}
  return 0
}

export function urgencyBorderColor(level: 0 | 1 | 2 | 3): string {
  if (level === 3) {return 'rgba(248,113,113,0.65)'}
  if (level === 2) {return 'rgba(251,191,36,0.5)'}
  if (level === 1) {return 'rgba(251,191,36,0.28)'}
  return ''
}

export function urgencyShadow(level: 0 | 1 | 2 | 3): string | undefined {
  if (level === 3) {return '0 0 18px rgba(248,113,113,0.22)'}
  if (level === 2) {return '0 0 10px rgba(251,191,36,0.15)'}
  return undefined
}

export function resolveMesaComanda(mesa: Mesa, comandaById: ReadonlyMap<string, Comanda>) {
  return mesa.comandaId ? comandaById.get(mesa.comandaId) : undefined
}
