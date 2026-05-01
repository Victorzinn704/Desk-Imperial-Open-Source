import type { PedidosSummaryConfig, PedidosSummaryRow } from './pedidos-environment.types'

type SummaryFacts = NonNullable<PedidosSummaryConfig['primaryFacts']>

export function buildPedidosSummaryShape(params: {
  primaryAction: string
  primaryFacts: SummaryFacts
  primaryRows: PedidosSummaryRow[]
  primaryTitle: string
  secondaryAction: string
  secondaryRows: PedidosSummaryRow[]
  secondaryTitle: string
}): PedidosSummaryConfig {
  return {
    primaryAction: params.primaryAction,
    primaryFacts: params.primaryFacts,
    primaryRows: params.primaryRows,
    primaryTitle: params.primaryTitle,
    secondaryAction: params.secondaryAction,
    secondaryRows: params.secondaryRows,
    secondaryTitle: params.secondaryTitle,
  }
}
