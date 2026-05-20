import { buildDetalheSnapshot } from './pedidos-environment-detail'
import { buildPedidosSummaryShape } from './pedidos-environment-summary-factory'
import type { PedidosCurrency, PedidosInsights, PedidosSummaryConfig } from './pedidos-environment.types'

export function buildDetalheSummaryConfig({
  currency,
  insights,
}: Readonly<{
  currency: PedidosCurrency
  insights: PedidosInsights
}>): PedidosSummaryConfig {
  const detail = buildDetalheSnapshot(currency, insights)

  return buildPedidosSummaryShape({
    primaryAction: detail.reference,
    primaryFacts: [
      { label: 'cliente', value: detail.customer },
      { label: 'canal', value: detail.channel },
      { label: 'operador', value: detail.operator },
    ],
    primaryRows: [
      { label: 'valor', value: detail.revenue, note: 'receita do pedido selecionado', tone: 'success' },
      { label: 'lucro', value: detail.profit, note: 'resultado do pedido em foco', tone: 'neutral' },
      { label: 'itens', value: detail.items, note: 'volume da comanda detalhada', tone: 'info' },
      { label: 'status', value: detail.status.value, note: 'situacao atual do registro', tone: detail.status.tone },
    ],
    primaryTitle: 'Pedido em foco',
    secondaryAction: 'detalhe',
    secondaryRows: [
      { label: 'horario', value: detail.createdAt, note: 'momento do registro em foco', tone: 'neutral' },
      { label: 'bairro', value: detail.district, note: 'origem geografica do cliente', tone: 'info' },
      { label: 'cidade', value: detail.city, note: 'cidade associada ao pedido', tone: 'neutral' },
      {
        label: 'ultimo cancelado',
        value: detail.lastCancelled.value,
        note: 'ultima excecao no periodo',
        tone: detail.lastCancelled.tone,
      },
    ],
    secondaryTitle: 'Contexto do pedido',
  })
}
