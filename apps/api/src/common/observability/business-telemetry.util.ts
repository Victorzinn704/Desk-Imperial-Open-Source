import { type Attributes, metrics } from '@opentelemetry/api'

const meter = metrics.getMeter('desk-imperial-api')

const financeSummaryDuration = meter.createHistogram('desk.finance.summary.duration', {
  description: 'Tempo de montagem do resumo financeiro executivo',
  unit: 'ms',
})

const financeActiveProducts = meter.createHistogram('desk.finance.summary.active_products', {
  description: 'Quantidade de produtos ativos retornados no resumo financeiro',
  unit: '{product}',
})

const financeTimelinePoints = meter.createHistogram('desk.finance.summary.timeline_points', {
  description: 'Quantidade de pontos da timeline financeira',
  unit: '{point}',
})

const financeSalesMapRegions = meter.createHistogram('desk.finance.summary.sales_map_regions', {
  description: 'Quantidade de regiões geográficas retornadas no mapa de vendas',
  unit: '{region}',
})

const operationsLiveDuration = meter.createHistogram('desk.operations.live.duration', {
  description: 'Tempo de montagem do snapshot operacional ao vivo',
  unit: 'ms',
})

const operationsLiveEmployees = meter.createHistogram('desk.operations.live.employees', {
  description: 'Quantidade de colaboradores retornados no snapshot operacional',
  unit: '{employee}',
})

const operationsLiveComandas = meter.createHistogram('desk.operations.live.comandas', {
  description: 'Quantidade de comandas retornadas no snapshot operacional',
  unit: '{comanda}',
})

const operationsLiveMesas = meter.createHistogram('desk.operations.live.mesas', {
  description: 'Quantidade de mesas retornadas no snapshot operacional',
  unit: '{mesa}',
})

const operationsKitchenDuration = meter.createHistogram('desk.operations.kitchen.duration', {
  description: 'Tempo de montagem da visão de cozinha',
  unit: 'ms',
})

const operationsKitchenItems = meter.createHistogram('desk.operations.kitchen.items', {
  description: 'Quantidade de itens retornados na visão de cozinha',
  unit: '{item}',
})

export function recordFinanceSummaryTelemetry(
  durationMs: number,
  shape: {
    activeProducts: number
    timelinePoints: number
    salesMapRegions: number
  },
  attributes: Attributes,
) {
  financeSummaryDuration.record(durationMs, attributes)
  financeActiveProducts.record(shape.activeProducts, attributes)
  financeTimelinePoints.record(shape.timelinePoints, attributes)
  financeSalesMapRegions.record(shape.salesMapRegions, attributes)
}

export function recordOperationsLiveTelemetry(
  durationMs: number,
  shape: {
    employees: number
    comandas: number
    mesas: number
  },
  attributes: Attributes,
) {
  operationsLiveDuration.record(durationMs, attributes)
  operationsLiveEmployees.record(shape.employees, attributes)
  operationsLiveComandas.record(shape.comandas, attributes)
  operationsLiveMesas.record(shape.mesas, attributes)
}

export function recordOperationsKitchenTelemetry(
  durationMs: number,
  shape: {
    items: number
  },
  attributes: Attributes,
) {
  operationsKitchenDuration.record(durationMs, attributes)
  operationsKitchenItems.record(shape.items, attributes)
}
