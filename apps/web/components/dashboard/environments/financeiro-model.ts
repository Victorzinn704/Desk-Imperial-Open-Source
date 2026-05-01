import type { DashboardTabId } from '@/components/dashboard/dashboard-navigation'

export type FinanceiroView = 'movimentacao' | 'fluxo' | 'dre' | 'contas'
export type FinanceiroSurface = 'legacy' | 'lab'

export const financeiroViewCopy: Record<FinanceiroView, { eyebrow: string; title: string; description: string }> = {
  movimentacao: {
    eyebrow: 'Visao financeira',
    title: 'Movimentacao do periodo',
    description: 'Receita, custo, lucro e margem.',
  },
  fluxo: {
    eyebrow: 'Fluxo de caixa',
    title: 'Entrada e saida por periodo',
    description: 'Ritmo de entrada e saída.',
  },
  dre: {
    eyebrow: 'DRE gerencial',
    title: 'Resultado do negocio',
    description: 'Receita, custo e resultado.',
  },
  contas: {
    eyebrow: 'Contas operacionais',
    title: 'Receber e acompanhamento',
    description: 'Recebido, cancelado e origem.',
  },
}

export function resolveFinanceView(activeTab: DashboardTabId | null): FinanceiroView {
  if (activeTab === 'fluxo' || activeTab === 'dre' || activeTab === 'contas') {
    return activeTab
  }

  return 'movimentacao'
}

export function formatPercent(value: number) {
  return `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: Math.abs(value) < 10 ? 1 : 0,
    maximumFractionDigits: 1,
  }).format(value)}%`
}

export function viewLabel(view: FinanceiroView) {
  switch (view) {
    case 'fluxo':
      return 'fluxo'
    case 'dre':
      return 'dre'
    case 'contas':
      return 'contas'
    default:
      return 'movimentação'
  }
}
