import type { Order, OrderItem } from '@prisma/client'

export type OrderRecord = {
  id: string
  customerName: string | null
  channel: string | null
  notes: string | null
  status: 'COMPLETED' | 'CANCELLED'
  totalRevenue: number
  totalCost: number
  totalProfit: number
  totalItems: number
  createdAt: string
  updatedAt: string
  cancelledAt: string | null
  items: Array<{
    id: string
    productId: string
    productName: string
    category: string
    quantity: number
    unitPrice: number
    unitCost: number
    lineRevenue: number
    lineCost: number
    lineProfit: number
  }>
}

type OrderWithItems = Order & {
  items: OrderItem[]
}

export function toOrderRecord(order: OrderWithItems): OrderRecord {
  return {
    id: order.id,
    customerName: order.customerName,
    channel: order.channel,
    notes: order.notes,
    status: order.status,
    totalRevenue: toNumber(order.totalRevenue),
    totalCost: toNumber(order.totalCost),
    totalProfit: toNumber(order.totalProfit),
    totalItems: order.totalItems,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    cancelledAt: order.cancelledAt?.toISOString() ?? null,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      category: item.category,
      quantity: item.quantity,
      unitPrice: toNumber(item.unitPrice),
      unitCost: toNumber(item.unitCost),
      lineRevenue: toNumber(item.lineRevenue),
      lineCost: toNumber(item.lineCost),
      lineProfit: toNumber(item.lineProfit),
    })),
  }
}

export function roundCurrency(value: number) {
  return Math.round(value * 100) / 100
}

function toNumber(value: { toNumber(): number } | number) {
  return typeof value === 'number' ? value : value.toNumber()
}
