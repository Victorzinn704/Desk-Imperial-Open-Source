import type { OrderRecord } from '@contracts/contracts'
import { formatCurrency } from '@/lib/currency'
import { formatOrderReference } from '@/lib/order-reference'
import { formatOrderDate } from './pedidos-environment.helpers'
import type { PedidosInsights } from './pedidos-environment.types'

export function buildDetalheSnapshot(currency: OrderRecord['displayCurrency'], insights: PedidosInsights) {
  const latest = insights.latest
  const identity = buildDetalheIdentity(latest)
  const financial = buildDetalheFinancials(currency, latest)

  return {
    ...financial,
    ...identity,
    status: resolveDetalheStatus(latest),
    lastCancelled: resolveLastCancelledSummary(insights.lastCancelled),
  }
}

function buildDetalheIdentity(order: PedidosInsights['latest']) {
  return {
    channel: order?.channel ?? 'balcao',
    city: order?.buyerCity ?? 'sem cidade',
    createdAt: order ? formatOrderDate(order.createdAt) : 'sem pedido',
    customer: order?.customerName ?? 'nao informado',
    district: order?.buyerDistrict ?? 'sem localizacao',
    items: String(order?.totalItems ?? 0),
    operator: order?.sellerName ?? 'sem operador',
  }
}

function buildDetalheFinancials(currency: OrderRecord['displayCurrency'], order: PedidosInsights['latest']) {
  return {
    profit: order ? formatCurrency(order.totalProfit, currency) : 'R$ 0,00',
    reference: order ? formatOrderReference(order.id) : 'sem pedido',
    revenue: order ? formatCurrency(order.totalRevenue, currency) : 'R$ 0,00',
  }
}

function resolveDetalheStatus(order: PedidosInsights['latest']) {
  if (!order) {
    return { tone: 'neutral' as const, value: 'sem leitura' }
  }

  if (order.status === 'CANCELLED') {
    return { tone: 'warning' as const, value: 'cancelado' }
  }

  return { tone: 'success' as const, value: 'concluido' }
}

function resolveLastCancelledSummary(order: PedidosInsights['lastCancelled']) {
  if (!order) {
    return { tone: 'neutral' as const, value: 'sem cancelamento' }
  }

  return { tone: 'warning' as const, value: formatOrderDate(order.createdAt) }
}
