import type { OrderRecord } from '@contracts/contracts'
import type { LabStatusTone } from '@/components/design-lab/lab-primitives'

export type PedidosView = 'tabela' | 'timeline' | 'kanban' | 'detalhe' | 'historico'
export type PedidosSurface = 'legacy' | 'lab'
export type PedidosCurrency = OrderRecord['displayCurrency']

export type PedidosViewCopy = {
  eyebrow: string
  title: string
  description: string
}

export type PedidosInsights = {
  sortedOrders: OrderRecord[]
  groups: Array<{ key: string; label: string; orders: OrderRecord[] }>
  latest: OrderRecord | null
  biggest: OrderRecord | null
  topChannel: { channel: string; count: number } | null
  topOperator: { name: string; revenue: number } | null
  busiestDay: { key: string; label: string; orders: OrderRecord[] } | null
  completedCount: number
  cancelledCount: number
  completedRevenue: number
  completedProfit: number
  totalItems: number
  uniqueChannels: number
  uniqueOperators: number
  activeDays: number
  averagePerDay: number
  ordersToday: number
  averageTicket: number
  cancelRate: string
  lastCancelled: OrderRecord | null
}

export type PedidosHeaderStat = {
  label: string
  value: string
  description: string
}

export type PedidosSummaryRow = {
  label: string
  value: string
  note?: string
  tone?: LabStatusTone
}

export type PedidosSummaryConfig = {
  primaryTitle: string
  primaryAction: string
  primaryFacts?: Array<{ label: string; value: string }>
  primaryRows: PedidosSummaryRow[]
  secondaryTitle: string
  secondaryAction: string
  secondaryRows: PedidosSummaryRow[]
}

export type LockedPedidosPreview = {
  primaryTitle: string
  primaryFacts?: Array<{ label: string; value: string }>
  stats: PedidosHeaderStat[]
  primaryRows: PedidosSummaryRow[]
  secondaryTitle: string
  secondaryRows: PedidosSummaryRow[]
}

export type PedidosMetaItem = {
  label: string
  value: string
  tone: LabStatusTone
}
