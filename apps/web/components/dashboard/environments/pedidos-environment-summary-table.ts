import { formatCurrency } from '@/lib/currency'
import { formatOrderDate } from './pedidos-environment.helpers'
import { buildPedidosSummaryShape } from './pedidos-environment-summary-factory'
import type { PedidosCurrency, PedidosInsights, PedidosSummaryConfig } from './pedidos-environment.types'

// eslint-disable-next-line max-lines-per-function
export function buildTabelaSummaryConfig({
  currency,
  insights,
}: Readonly<{
  currency: PedidosCurrency
  insights: PedidosInsights
}>): PedidosSummaryConfig {
  return buildPedidosSummaryShape({
    primaryAction: `${insights.sortedOrders.length} linhas`,
    primaryFacts: [
      { label: 'visao', value: 'tabela operacional' },
      { label: 'canal lider', value: insights.topChannel?.channel ?? 'sem leitura' },
      { label: 'operador lider', value: insights.topOperator?.name ?? 'sem leitura' },
    ],
    primaryRows: [
      {
        label: 'receita do recorte',
        value: formatCurrency(insights.completedRevenue, currency),
        note: 'valor confirmado nos pedidos concluidos',
        tone: 'success',
      },
      {
        label: 'ticket medio',
        value: formatCurrency(insights.averageTicket, currency),
        note: 'media por pedido concluido',
        tone: 'info',
      },
      {
        label: 'itens vendidos',
        value: String(insights.totalItems),
        note: 'volume total movimentado',
        tone: 'neutral',
      },
      {
        label: 'maior pedido',
        value: insights.biggest ? formatCurrency(insights.biggest.totalRevenue, currency) : 'R$ 0,00',
        note: 'pico do recorte consultado',
        tone: 'neutral',
      },
    ],
    primaryTitle: 'Leitura da consulta',
    secondaryAction: `${insights.uniqueChannels} canais`,
    secondaryRows: [
      {
        label: 'dias ativos',
        value: String(insights.activeDays),
        note: 'datas com pedidos na tabela',
        tone: 'neutral',
      },
      {
        label: 'ultimo registro',
        value: insights.latest ? formatOrderDate(insights.latest.createdAt) : 'sem pedido',
        note: 'pedido mais recente carregado',
        tone: 'info',
      },
      {
        label: 'cancelados',
        value: String(insights.cancelledCount),
        note: 'quebras visiveis na leitura',
        tone: insights.cancelledCount > 0 ? 'warning' : 'neutral',
      },
      {
        label: 'lucro do recorte',
        value: formatCurrency(insights.completedProfit, currency),
        note: 'resultado acumulado dos concluidos',
        tone: 'success',
      },
    ],
    secondaryTitle: 'Cobertura da consulta',
  })
}
