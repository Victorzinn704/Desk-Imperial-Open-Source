import { formatCurrency } from '@/lib/currency'
import { formatOrderDate } from './pedidos-environment.helpers'
import { buildPedidosSummaryShape } from './pedidos-environment-summary-factory'
import type { PedidosCurrency, PedidosInsights, PedidosSummaryConfig } from './pedidos-environment.types'

// eslint-disable-next-line max-lines-per-function
export function buildHistoricoSummaryConfig({
  currency,
  insights,
}: Readonly<{
  currency: PedidosCurrency
  insights: PedidosInsights
}>): PedidosSummaryConfig {
  return buildPedidosSummaryShape({
    primaryAction: `${insights.activeDays} dias`,
    primaryFacts: [
      { label: 'visao', value: 'consolidado diario' },
      { label: 'canais', value: String(insights.uniqueChannels) },
      { label: 'operadores', value: String(insights.uniqueOperators) },
    ],
    primaryRows: [
      {
        label: 'dias ativos',
        value: String(insights.activeDays),
        note: 'datas com movimentacao registrada',
        tone: 'neutral',
      },
      {
        label: 'receita consolidada',
        value: formatCurrency(insights.completedRevenue, currency),
        note: 'valor confirmado no historico',
        tone: 'success',
      },
      {
        label: 'ticket medio',
        value: formatCurrency(insights.averageTicket, currency),
        note: 'media dos pedidos concluidos',
        tone: 'info',
      },
      {
        label: 'ultimo cancelamento',
        value: insights.lastCancelled ? formatOrderDate(insights.lastCancelled.createdAt) : 'sem cancelamento',
        note: 'ultima excecao relevante do periodo',
        tone: insights.lastCancelled ? 'warning' : 'neutral',
      },
    ],
    primaryTitle: 'Auditoria do periodo',
    secondaryAction: insights.topChannel?.channel ?? 'sem canal',
    secondaryRows: [
      {
        label: 'canal lider',
        value: insights.topChannel?.channel ?? 'sem leitura',
        note: 'origem dominante no consolidado',
        tone: 'info',
      },
      {
        label: 'operador lider',
        value: insights.topOperator?.name ?? 'sem leitura',
        note: 'quem mais puxou receita',
        tone: 'success',
      },
      {
        label: 'dia mais forte',
        value: insights.busiestDay?.label ?? 'sem leitura',
        note: 'janela com mais pedidos',
        tone: 'neutral',
      },
      {
        label: 'maior pedido',
        value: insights.biggest ? formatCurrency(insights.biggest.totalRevenue, currency) : 'R$ 0,00',
        note: 'pico do recorte auditado',
        tone: 'neutral',
      },
    ],
    secondaryTitle: 'Sinais de auditoria',
  })
}
