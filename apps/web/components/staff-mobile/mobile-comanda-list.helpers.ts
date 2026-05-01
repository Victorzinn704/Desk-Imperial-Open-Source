'use client'

import type { Comanda, ComandaStatus } from '@/components/pdv/pdv-types'
import type { MobileComandaListContentState, PaymentMethod, StatusConfig } from './mobile-comanda-list.types'

const STATUS_CONFIG: Record<Exclude<ComandaStatus, 'fechada' | 'cancelada'>, StatusConfig> = {
  aberta: {
    label: 'Aberta',
    chipColor: '#60a5fa',
    chipBg: 'rgba(96, 165, 250, 0.12)',
    nextStatus: 'em_preparo',
    nextLabel: 'Iniciar preparo',
    nextBg: 'rgba(251, 146, 60, 0.15)',
  },
  em_preparo: {
    label: 'Em Preparo',
    chipColor: '#fb923c',
    chipBg: 'rgba(251, 146, 60, 0.12)',
    nextStatus: 'pronta',
    nextLabel: 'Marcar pronta',
    nextBg: 'rgba(54, 245, 124, 0.12)',
  },
  pronta: {
    label: 'Pronta',
    chipColor: '#36f57c',
    chipBg: 'rgba(54, 245, 124, 0.12)',
    nextStatus: 'fechada',
    nextLabel: 'Fechar',
    nextBg: 'rgba(122, 136, 150, 0.12)',
  },
}

const FALLBACK_STATUS_CONFIG: Record<Extract<ComandaStatus, 'fechada' | 'cancelada'>, StatusConfig> = {
  cancelada: {
    label: 'Cancelada',
    chipColor: '#f87171',
    chipBg: 'rgba(248, 113, 113, 0.12)',
    nextStatus: null,
    nextLabel: null,
    nextBg: 'rgba(122, 136, 150, 0.12)',
  },
  fechada: {
    label: 'Fechada',
    chipColor: '#a3a3a3',
    chipBg: 'rgba(163, 163, 163, 0.12)',
    nextStatus: null,
    nextLabel: null,
    nextBg: 'rgba(122, 136, 150, 0.12)',
  },
}

export const PAYMENT_METHOD_OPTIONS: ReadonlyArray<{ label: string; value: PaymentMethod }> = [
  { label: 'Pix', value: 'PIX' },
  { label: 'Crédito', value: 'CREDIT' },
  { label: 'Débito', value: 'DEBIT' },
  { label: 'Dinheiro', value: 'CASH' },
]

export function resolveMobileComandaStatusConfig(status: ComandaStatus): StatusConfig {
  if (status === 'fechada' || status === 'cancelada') {
    return FALLBACK_STATUS_CONFIG[status]
  }
  return STATUS_CONFIG[status]
}

export function sortMobileComandas(comandas: Comanda[], focusedId?: string | null) {
  if (!focusedId) {
    return comandas
  }

  return [...comandas].sort((a, b) => {
    if (a.id === focusedId) {
      return -1
    }
    if (b.id === focusedId) {
      return 1
    }
    return b.abertaEm.getTime() - a.abertaEm.getTime()
  })
}

export function resolveMobileComandaListContentState({
  count,
  errorMessage,
  isLoading,
  isOffline,
}: Readonly<{
  count: number
  errorMessage: string | null
  isLoading: boolean
  isOffline: boolean
}>): MobileComandaListContentState {
  if (count > 0) {
    return 'items'
  }
  if (isLoading) {
    return 'loading'
  }
  if (errorMessage) {
    return 'error'
  }
  if (isOffline) {
    return 'offline'
  }
  return 'empty'
}

export function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value))
}

export function formatPaymentInput(amount: number) {
  return amount.toFixed(2).replace('.', ',')
}
