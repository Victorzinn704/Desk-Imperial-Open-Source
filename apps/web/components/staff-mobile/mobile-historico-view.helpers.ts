import type { OperationPerformerStanding } from '@/lib/operations'
import { formatBRL as formatCurrency } from '@/lib/currency'
import type { Comanda } from '@/components/pdv/pdv-types'

export const MOBILE_HISTORICO_STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  aberta: { bg: 'rgba(248,113,113,0.12)', color: '#f87171', label: 'Em aberto' },
  em_preparo: { bg: 'rgba(234,179,8,0.15)', color: '#eab308', label: 'Em preparo' },
  pronta: { bg: 'rgba(96,165,250,0.12)', color: '#60a5fa', label: 'Pronta' },
  fechada: { bg: 'rgba(54,245,124,0.12)', color: '#36f57c', label: 'Paga' },
}

export function sortHistoricoComandas(comandas: Comanda[]) {
  return [...comandas].sort((a, b) => b.abertaEm.getTime() - a.abertaEm.getTime())
}

export function buildRankingHeadline(ranking: OperationPerformerStanding | undefined) {
  if (!ranking?.position || ranking.totalPerformers === 0) {
    return null
  }

  if (ranking.position === 1) {
    return {
      title: 'Você está liderando o turno.',
      description:
        ranking.performerValue > 0
          ? `Sua venda atual já soma ${formatCurrency(ranking.performerValue)} no recorte.`
          : 'Você está no topo, mas ainda sem valor consolidado relevante.',
    }
  }

  return {
    title: `Você está em ${ranking.position}º de ${ranking.totalPerformers}.`,
    description:
      ranking.deltaToLeader > 0 && ranking.leaderName
        ? `Faltam ${formatCurrency(ranking.deltaToLeader)} para alcançar ${ranking.leaderName}.`
        : 'O ranking do turno ainda está muito próximo.',
  }
}

export function slugifyHistoricoCard(value: string) {
  return value.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')
}
