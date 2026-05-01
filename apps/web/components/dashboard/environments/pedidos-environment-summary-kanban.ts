import { formatCurrency } from '@/lib/currency'
import { formatOrderDate } from './pedidos-environment.helpers'
import { buildPedidosSummaryShape } from './pedidos-environment-summary-factory'
import type { PedidosCurrency, PedidosInsights, PedidosSummaryConfig } from './pedidos-environment.types'

// eslint-disable-next-line max-lines-per-function
export function buildKanbanSummaryConfig({
  currency,
  insights,
}: Readonly<{
  currency: PedidosCurrency
  insights: PedidosInsights
}>): PedidosSummaryConfig {
  return buildPedidosSummaryShape({
    primaryAction: `${insights.sortedOrders.length} pedidos`,
    primaryFacts: [
      { label: 'visao', value: 'quadro comercial' },
      { label: 'perda', value: insights.cancelRate },
      { label: 'ultimo', value: insights.latest ? formatOrderDate(insights.latest.createdAt) : 'sem pedido' },
    ],
    primaryRows: [
      {
        label: 'concluidos',
        value: String(insights.completedCount),
        note: 'pedidos liquidados no recorte',
        tone: 'success',
      },
      {
        label: 'cancelados',
        value: String(insights.cancelledCount),
        note: 'pedidos perdidos no quadro',
        tone: insights.cancelledCount > 0 ? 'warning' : 'neutral',
      },
      { label: 'taxa de cancelamento', value: insights.cancelRate, note: 'peso da perda sobre o total', tone: 'info' },
      {
        label: 'ticket medio',
        value: formatCurrency(insights.averageTicket, currency),
        note: 'media dos pedidos concluidos',
        tone: 'neutral',
      },
    ],
    primaryTitle: 'Pressao por status',
    secondaryAction: insights.topChannel?.channel ?? 'sem canal',
    secondaryRows: [
      {
        label: 'maior pedido',
        value: insights.biggest ? formatCurrency(insights.biggest.totalRevenue, currency) : 'R$ 0,00',
        note: 'pico comercial do recorte',
        tone: 'success',
      },
      {
        label: 'canal lider',
        value: insights.topChannel?.channel ?? 'sem leitura',
        note: 'origem dominante do quadro',
        tone: 'info',
      },
      {
        label: 'operador lider',
        value: insights.topOperator?.name ?? 'sem leitura',
        note: 'responsavel pela maior puxada',
        tone: 'neutral',
      },
      {
        label: 'itens vendidos',
        value: String(insights.totalItems),
        note: 'volume total ja girado no periodo',
        tone: 'neutral',
      },
    ],
    secondaryTitle: 'Fila comercial',
  })
}
