import type { PedidosCurrency, PedidosInsights, PedidosSummaryConfig, PedidosView } from './pedidos-environment.types'
import { buildDetalheSummaryConfig } from './pedidos-environment-summary-detail'
import { buildHistoricoSummaryConfig } from './pedidos-environment-summary-history'
import { buildKanbanSummaryConfig } from './pedidos-environment-summary-kanban'
import { buildTabelaSummaryConfig } from './pedidos-environment-summary-table'
import { buildTimelineSummaryConfig } from './pedidos-environment-summary-timeline'

type SummaryParams = Readonly<{
  currency: PedidosCurrency
  insights: PedidosInsights
}>

const summaryConfigByView: Record<PedidosView, (params: SummaryParams) => PedidosSummaryConfig> = {
  tabela: buildTabelaSummaryConfig,
  timeline: buildTimelineSummaryConfig,
  kanban: buildKanbanSummaryConfig,
  detalhe: buildDetalheSummaryConfig,
  historico: buildHistoricoSummaryConfig,
}

export function buildPedidosSummaryConfig(
  params: Readonly<{
    currency: PedidosCurrency
    insights: PedidosInsights
    view: PedidosView
  }>,
): PedidosSummaryConfig {
  return summaryConfigByView[params.view](params)
}
