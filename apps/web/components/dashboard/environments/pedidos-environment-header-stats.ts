import type { OrderRecord } from '@contracts/contracts'
import { formatCurrency } from '@/lib/currency'
import { formatOrderDate, formatOrderTime } from './pedidos-environment.helpers'
import type { PedidosHeaderStat, PedidosInsights, PedidosView } from './pedidos-environment.types'

type HeaderStatsParams = Readonly<{
  currency: OrderRecord['displayCurrency']
  insights: PedidosInsights
}>

const headerStatsByView: Record<PedidosView, (params: HeaderStatsParams) => PedidosHeaderStat[]> = {
  tabela: buildTabelaHeaderStats,
  timeline: buildTimelineHeaderStats,
  kanban: buildKanbanHeaderStats,
  detalhe: buildDetalheHeaderStats,
  historico: buildHistoricoHeaderStats,
}

export function buildPedidosHeaderStats(
  params: Readonly<{
    currency: OrderRecord['displayCurrency']
    insights: PedidosInsights
    view: PedidosView
  }>,
): PedidosHeaderStat[] {
  return headerStatsByView[params.view](params)
}

function buildTabelaHeaderStats({ currency, insights }: HeaderStatsParams): PedidosHeaderStat[] {
  return [
    { label: 'registros', value: String(insights.sortedOrders.length), description: 'linhas carregadas na tabela' },
    {
      label: 'receita',
      value: formatCurrency(insights.completedRevenue, currency),
      description: 'valor confirmado no recorte',
    },
    { label: 'canais', value: String(insights.uniqueChannels), description: 'origens presentes na consulta' },
    {
      label: 'ticket medio',
      value: formatCurrency(insights.averageTicket, currency),
      description: 'media dos pedidos concluidos',
    },
  ]
}

function buildTimelineHeaderStats({ insights }: HeaderStatsParams): PedidosHeaderStat[] {
  return [
    { label: 'hoje', value: String(insights.ordersToday), description: 'eventos no dia corrente' },
    { label: 'dias ativos', value: String(insights.activeDays), description: 'datas com pedidos no recorte' },
    {
      label: 'media por dia',
      value: insights.activeDays > 0 ? String(insights.averagePerDay) : '0',
      description: 'cadencia media de registros',
    },
    {
      label: 'ultimo registro',
      value: insights.latest ? formatOrderTime(insights.latest.createdAt) : 'sem registro',
      description: 'horario mais recente do recorte',
    },
  ]
}

function buildKanbanHeaderStats({ currency, insights }: HeaderStatsParams): PedidosHeaderStat[] {
  return [
    { label: 'concluidos', value: String(insights.completedCount), description: 'pedidos liquidados no quadro' },
    { label: 'cancelados', value: String(insights.cancelledCount), description: 'falhas ou desistencias no recorte' },
    { label: 'taxa de cancelamento', value: insights.cancelRate, description: 'pressao de perda sobre o total' },
    {
      label: 'maior pedido',
      value: insights.biggest ? formatCurrency(insights.biggest.totalRevenue, currency) : 'R$ 0,00',
      description: 'ticket maximo registrado',
    },
  ]
}

function buildDetalheHeaderStats({ currency, insights }: HeaderStatsParams): PedidosHeaderStat[] {
  return [
    {
      label: 'cliente',
      value: insights.latest?.customerName ?? 'nao informado',
      description: 'nome que abre o ultimo pedido',
    },
    { label: 'itens', value: String(insights.latest?.totalItems ?? 0), description: 'volume da comanda selecionada' },
    {
      label: 'valor',
      value: insights.latest ? formatCurrency(insights.latest.totalRevenue, currency) : 'R$ 0,00',
      description: 'receita do pedido em foco',
    },
    { label: 'canal', value: insights.latest?.channel ?? 'balcao', description: 'origem da venda atual' },
  ]
}

function buildHistoricoHeaderStats({ insights }: HeaderStatsParams): PedidosHeaderStat[] {
  return [
    { label: 'dias ativos', value: String(insights.activeDays), description: 'janelas com movimentacao registrada' },
    { label: 'operadores', value: String(insights.uniqueOperators), description: 'pessoas aparecendo no historico' },
    { label: 'canais', value: String(insights.uniqueChannels), description: 'origens comerciais encontradas' },
    {
      label: 'ultimo cancelamento',
      value: insights.lastCancelled ? formatOrderDate(insights.lastCancelled.createdAt) : 'sem cancelamento',
      description: 'ultima excecao relevante',
    },
  ]
}
