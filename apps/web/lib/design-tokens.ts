/**
 * Desk Imperial — Design Tokens
 * Single source of truth for status colors, role palettes, and surface tokens.
 * All components MUST import from here instead of defining inline colors.
 */

export const STATUS_COLORS = {
  livre: {
    solid: '#36f57c',
    bg: 'rgba(54, 245, 124, 0.07)',
    border: 'rgba(54, 245, 124, 0.25)',
    softBg: 'rgba(54, 245, 124, 0.03)',
  },
  ocupada: {
    solid: '#f87171',
    bg: 'rgba(248, 113, 113, 0.07)',
    border: 'rgba(248, 113, 113, 0.25)',
    softBg: 'rgba(248, 113, 113, 0.03)',
  },
  reservada: {
    solid: '#60a5fa',
    bg: 'rgba(96, 165, 250, 0.07)',
    border: 'rgba(96, 165, 250, 0.25)',
    softBg: 'rgba(96, 165, 250, 0.03)',
  },
  emPreparo: {
    solid: '#fb923c',
    bg: 'rgba(251, 146, 60, 0.07)',
    border: 'rgba(251, 146, 60, 0.25)',
    softBg: 'rgba(251, 146, 60, 0.03)',
  },
  fechada: {
    solid: '#7a8896',
    bg: 'rgba(122, 136, 150, 0.06)',
    border: 'rgba(122, 136, 150, 0.16)',
    softBg: 'rgba(122, 136, 150, 0.03)',
  },
} as const

export type StatusKey = keyof typeof STATUS_COLORS

export const GARCOM_COLORS = [
  '#a78bfa',
  '#34d399',
  '#fb923c',
  '#f472b6',
  '#60a5fa',
  '#fbbf24',
  '#e879f9',
  '#2dd4bf',
] as const

/**
 * Utility: get status color config safely
 */
export function getStatusColor(status: string) {
  const key = status.toLowerCase() as StatusKey
  return STATUS_COLORS[key] ?? STATUS_COLORS.fechada
}
