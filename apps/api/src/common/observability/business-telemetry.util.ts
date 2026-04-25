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

const operationsRealtimePublishDuration = meter.createHistogram('desk.operations.realtime.publish.duration', {
  description: 'Tempo para publicar um evento operacional no barramento local e no namespace Socket.IO',
  unit: 'ms',
})

const operationsRealtimeEvents = meter.createCounter('desk.operations.realtime.events', {
  description: 'Eventos operacionais publicados por tipo e resultado',
  unit: '{event}',
})

const operationsRealtimeSocketConnections = meter.createCounter('desk.operations.realtime.socket.connections', {
  description: 'Tentativas de conexão Socket.IO operacional por resultado',
  unit: '{connection}',
})

const operationsRealtimeActiveSockets = meter.createUpDownCounter('desk.operations.realtime.socket.active', {
  description: 'Sockets operacionais ativos por workspace',
  unit: '{socket}',
})

const operationsRealtimeRedisAdapterTransitions = meter.createCounter(
  'desk.operations.realtime.redis_adapter.transitions',
  {
    description: 'Mudanças de estado do adapter Redis do Socket.IO operacional',
    unit: '{transition}',
  },
)

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

export function recordOperationsRealtimePublishTelemetry(durationMs: number, attributes: Attributes) {
  operationsRealtimePublishDuration.record(durationMs, attributes)
  operationsRealtimeEvents.add(1, attributes)
}

export function recordOperationsRealtimeSocketConnected(attributes: Attributes) {
  operationsRealtimeSocketConnections.add(1, { ...attributes, 'desk.operations.realtime.connection_result': 'accepted' })
  operationsRealtimeActiveSockets.add(1, attributes)
}

export function recordOperationsRealtimeSocketRejected(reason: string, attributes: Attributes) {
  operationsRealtimeSocketConnections.add(1, {
    ...attributes,
    'desk.operations.realtime.connection_result': 'rejected',
    'desk.operations.realtime.rejection_reason': reason,
  })
}

export function recordOperationsRealtimeSocketDisconnected(attributes: Attributes) {
  operationsRealtimeActiveSockets.add(-1, attributes)
}

export function recordOperationsRealtimeRedisAdapterState(enabled: boolean, reason: string) {
  operationsRealtimeRedisAdapterTransitions.add(1, {
    'desk.operations.realtime.redis_adapter_enabled': enabled,
    'desk.operations.realtime.redis_adapter_reason': reason,
  })
}
