'use client'

import type { FinanceSummaryResponse } from '@contracts/contracts'

export type OwnerFinanceViewProps = Readonly<{
  caixaEsperado: number
  categoryBreakdown?: FinanceSummaryResponse['categoryBreakdown']
  displayCurrency?: FinanceSummaryResponse['displayCurrency']
  errorMessage: string | null
  financeSummary?: FinanceSummaryResponse
  isOffline: boolean
  lucroRealizado: number
  onOpenCash: () => void
  onOpenFinanceiro: () => void
  ticketMedio: number
  todayOrderCount: number
  todayRevenue: number
}>

export type OwnerFinancePriority = Readonly<{
  background: string
  border: string
  color: string
  headline: string
  label: string
}>

export function buildFinancePriority({
  caixaEsperado,
  lucroRealizado,
  todayOrderCount,
  todayRevenue,
}: {
  caixaEsperado: number
  lucroRealizado: number
  todayOrderCount: number
  todayRevenue: number
}): OwnerFinancePriority {
  if (todayOrderCount === 0 && todayRevenue <= 0) {
    return {
      label: 'sem giro',
      headline: 'Ainda não houve conversão financeira no turno. O foco aqui é abrir caixa ou iniciar a venda.',
      color: '#fbbf24',
      border: 'rgba(251,191,36,0.22)',
      background: 'rgba(251,191,36,0.1)',
    }
  }

  if (caixaEsperado <= 0) {
    return {
      label: 'atenção',
      headline: 'Há movimento no turno, mas o caixa esperado ainda está sem leitura útil para conferência.',
      color: '#fb923c',
      border: 'rgba(251,146,60,0.22)',
      background: 'rgba(251,146,60,0.1)',
    }
  }

  if (lucroRealizado > 0) {
    return {
      label: 'saudável',
      headline: 'Receita, lucro e caixa já formam uma leitura consistente para o acompanhamento móvel do turno.',
      color: '#36f57c',
      border: 'rgba(54,245,124,0.22)',
      background: 'rgba(54,245,124,0.1)',
    }
  }

  return {
    label: 'monitorar',
    headline: 'O turno já tem movimento, mas ainda precisa de mais leitura antes do fechamento financeiro.',
    color: '#60a5fa',
    border: 'rgba(96,165,250,0.22)',
    background: 'rgba(96,165,250,0.1)',
  }
}

export function formatPercent(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return '0%'
  }

  return `${value.toFixed(1).replace('.', ',')}%`
}

export function buildFinanceMarginPercent(lucroRealizado: number, todayRevenue: number) {
  return todayRevenue > 0 ? (lucroRealizado / todayRevenue) * 100 : 0
}

export function buildFinanceStatusMessage({
  errorMessage,
  isOffline,
}: Pick<OwnerFinanceViewProps, 'errorMessage' | 'isOffline'>) {
  if (errorMessage) {
    return {
      border: 'border-[rgba(248,113,113,0.2)]',
      description: errorMessage,
      surface: 'bg-[rgba(248,113,113,0.08)]',
      tone: 'text-[#fca5a5]',
    }
  }

  if (isOffline) {
    return {
      border: 'border-[rgba(251,191,36,0.18)]',
      description: 'Você está offline. Os valores financeiros podem estar desatualizados até a reconexão.',
      surface: 'bg-[rgba(251,191,36,0.08)]',
      tone: 'text-[#fcd34d]',
    }
  }

  return null
}
