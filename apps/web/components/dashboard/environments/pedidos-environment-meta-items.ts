import type { OrderRecord } from '@contracts/contracts'
import { formatCurrency } from '@/lib/currency'
import { formatOrderDate } from './pedidos-environment.helpers'
import type { PedidosInsights, PedidosMetaItem, PedidosView } from './pedidos-environment.types'

type HeaderStatsParams = Readonly<{
  currency: OrderRecord['displayCurrency']
  insights: PedidosInsights
}>

const metaItemsByView: Record<PedidosView, (params: HeaderStatsParams) => PedidosMetaItem[]> = {
  tabela: buildTabelaMetaItems,
  timeline: buildTimelineMetaItems,
  kanban: buildKanbanMetaItems,
  detalhe: buildDetalheMetaItems,
  historico: buildHistoricoMetaItems,
}

export function buildPedidosMetaItems(
  params: Readonly<{
    currency: OrderRecord['displayCurrency']
    insights: PedidosInsights
    view: PedidosView
  }>,
): PedidosMetaItem[] {
  return metaItemsByView[params.view](params)
}

function buildTabelaMetaItems({ currency, insights }: HeaderStatsParams): PedidosMetaItem[] {
  return [
    { label: 'receita', value: formatCurrency(insights.completedRevenue, currency), tone: 'success' },
    { label: 'canal lider', value: insights.topChannel?.channel ?? 'sem leitura', tone: 'info' },
    {
      label: 'ultimo registro',
      value: insights.latest ? formatOrderDate(insights.latest.createdAt) : 'sem pedidos',
      tone: 'neutral',
    },
  ]
}

function buildTimelineMetaItems({ insights }: HeaderStatsParams): PedidosMetaItem[] {
  return [
    { label: 'dias ativos', value: String(insights.activeDays), tone: 'neutral' },
    { label: 'hoje', value: String(insights.ordersToday), tone: 'info' },
    { label: 'dia forte', value: insights.busiestDay?.label ?? 'sem leitura', tone: 'success' },
  ]
}

function buildKanbanMetaItems({ insights }: HeaderStatsParams): PedidosMetaItem[] {
  return [
    { label: 'concluidos', value: String(insights.completedCount), tone: 'success' },
    {
      label: 'cancelados',
      value: String(insights.cancelledCount),
      tone: insights.cancelledCount > 0 ? 'warning' : 'neutral',
    },
    { label: 'taxa', value: insights.cancelRate, tone: 'info' },
  ]
}

function buildDetalheMetaItems({ currency, insights }: HeaderStatsParams): PedidosMetaItem[] {
  return [
    { label: 'cliente', value: insights.latest?.customerName ?? 'nao informado', tone: 'neutral' },
    { label: 'canal', value: insights.latest?.channel ?? 'balcao', tone: 'info' },
    {
      label: 'valor',
      value: insights.latest ? formatCurrency(insights.latest.totalRevenue, currency) : 'R$ 0,00',
      tone: 'success',
    },
  ]
}

function buildHistoricoMetaItems({ insights }: HeaderStatsParams): PedidosMetaItem[] {
  return [
    { label: 'operadores', value: String(insights.uniqueOperators), tone: 'info' },
    { label: 'canais', value: String(insights.uniqueChannels), tone: 'neutral' },
    {
      label: 'ultimo cancelamento',
      value: insights.lastCancelled ? formatOrderDate(insights.lastCancelled.createdAt) : 'sem cancelamento',
      tone: insights.lastCancelled ? 'warning' : 'neutral',
    },
  ]
}
