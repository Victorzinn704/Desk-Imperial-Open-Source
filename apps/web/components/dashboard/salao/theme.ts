import type { CSSProperties } from 'react'

export type SalaoTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'

const TONE_STYLE_MAP: Record<SalaoTone, CSSProperties> = {
  neutral: {
    color: 'var(--text-soft)',
    backgroundColor: 'color-mix(in srgb, var(--surface-soft) 76%, transparent)',
    borderColor: 'var(--border)',
  },
  accent: {
    color: 'var(--accent)',
    backgroundColor: 'color-mix(in srgb, var(--accent) 10%, var(--surface))',
    borderColor: 'color-mix(in srgb, var(--accent) 28%, var(--border))',
  },
  success: {
    color: 'var(--success)',
    backgroundColor: 'color-mix(in srgb, var(--success) 10%, var(--surface))',
    borderColor: 'color-mix(in srgb, var(--success) 28%, var(--border))',
  },
  warning: {
    color: 'var(--warning)',
    backgroundColor: 'color-mix(in srgb, var(--warning) 10%, var(--surface))',
    borderColor: 'color-mix(in srgb, var(--warning) 30%, var(--border))',
  },
  danger: {
    color: 'var(--danger)',
    backgroundColor: 'color-mix(in srgb, var(--danger) 10%, var(--surface))',
    borderColor: 'color-mix(in srgb, var(--danger) 30%, var(--border))',
  },
}

export const MESA_STATUS_META = {
  livre: { label: 'Livre', tone: 'success' },
  ocupada: { label: 'Ocupada', tone: 'danger' },
  reservada: { label: 'Reservada', tone: 'warning' },
} as const satisfies Record<string, { label: string; tone: SalaoTone }>

export const COMANDA_STATUS_META = {
  aberta: { text: 'Aberta', tone: 'accent' },
  em_preparo: { text: 'Em preparo', tone: 'warning' },
  pronta: { text: 'Pronta', tone: 'accent' },
  fechada: { text: 'Paga', tone: 'success' },
} as const satisfies Record<string, { text: string; tone: SalaoTone }>

export function getSalaoToneStyle(tone: SalaoTone): CSSProperties {
  return TONE_STYLE_MAP[tone]
}

export function getMesaStatusMeta(status: string) {
  return MESA_STATUS_META[status as keyof typeof MESA_STATUS_META] ?? { label: status, tone: 'neutral' as const }
}

export function getComandaStatusMeta(status: string) {
  return (
    COMANDA_STATUS_META[status as keyof typeof COMANDA_STATUS_META] ?? {
      text: status,
      tone: 'neutral' as const,
    }
  )
}

export function getUrgencyTone(urgency: 0 | 1 | 2 | 3): SalaoTone {
  if (urgency >= 3) {
    return 'danger'
  }

  if (urgency === 2) {
    return 'warning'
  }

  if (urgency === 1) {
    return 'accent'
  }

  return 'neutral'
}
