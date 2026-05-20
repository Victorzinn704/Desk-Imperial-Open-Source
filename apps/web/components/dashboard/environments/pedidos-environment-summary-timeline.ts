import { formatCurrency } from '@/lib/currency'
import { formatOrderTime } from './pedidos-environment.helpers'
import { buildPedidosSummaryShape } from './pedidos-environment-summary-factory'
import type { PedidosCurrency, PedidosInsights, PedidosSummaryConfig } from './pedidos-environment.types'

// eslint-disable-next-line max-lines-per-function
export function buildTimelineSummaryConfig({
  currency,
  insights,
}: Readonly<{
  currency: PedidosCurrency
  insights: PedidosInsights
}>): PedidosSummaryConfig {
  return buildPedidosSummaryShape({
    primaryAction: `${insights.activeDays} dias`,
    primaryFacts: [
      { label: 'visao', value: 'ritmo por dia' },
      { label: 'pico', value: insights.busiestDay?.label ?? 'sem leitura' },
      { label: 'ultimo evento', value: insights.latest ? formatOrderTime(insights.latest.createdAt) : 'sem pedido' },
    ],
    primaryRows: [
      {
        label: 'dias ativos',
        value: String(insights.activeDays),
        note: 'datas com pedidos registrados',
        tone: 'neutral',
      },
      {
        label: 'media por dia',
        value: insights.activeDays > 0 ? String(insights.averagePerDay) : '0',
        note: 'volume medio da rotina',
        tone: 'info',
      },
      {
        label: 'dia mais forte',
        value: insights.busiestDay?.label ?? 'sem leitura',
        note: 'bloco com maior concentracao de pedidos',
        tone: 'success',
      },
      {
        label: 'receita do recorte',
        value: formatCurrency(insights.completedRevenue, currency),
        note: 'valor confirmado no periodo',
        tone: 'neutral',
      },
    ],
    primaryTitle: 'Cadencia do periodo',
    secondaryAction: 'timeline',
    secondaryRows: [
      { label: 'hoje', value: String(insights.ordersToday), note: 'eventos encontrados no dia corrente', tone: 'info' },
      {
        label: 'canal lider',
        value: insights.topChannel?.channel ?? 'sem leitura',
        note: 'origem dominante da rotina',
        tone: 'neutral',
      },
      {
        label: 'operador lider',
        value: insights.topOperator?.name ?? 'sem leitura',
        note: 'quem mais puxou receita',
        tone: 'success',
      },
      {
        label: 'cancelados',
        value: String(insights.cancelledCount),
        note: 'quebras registradas no fluxo',
        tone: insights.cancelledCount > 0 ? 'warning' : 'neutral',
      },
    ],
    secondaryTitle: 'Ritmo operacional',
  })
}
