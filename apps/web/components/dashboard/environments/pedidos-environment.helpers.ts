import type { OrderRecord } from '@contracts/contracts'

export const KANBAN_COLUMN_PREVIEW_LIMIT = 6

export function formatOrderDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function formatOrderTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function formatOrderDayKey(value: string) {
  const date = new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function formatOrderDayLabel(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(value))
}

export function groupOrdersByDay(orders: OrderRecord[]) {
  return Array.from(
    [...orders]
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .reduce((map, order) => {
        const dayKey = formatOrderDayKey(order.createdAt)
        const current = map.get(dayKey) ?? {
          key: dayKey,
          label: formatOrderDayLabel(order.createdAt),
          orders: [] as OrderRecord[],
        }
        current.orders.push(order)
        map.set(dayKey, current)
        return map
      }, new Map<string, { key: string; label: string; orders: OrderRecord[] }>()),
  ).map(([, value]) => value)
}

export function topChannelEntry(orders: OrderRecord[]) {
  if (orders.length === 0) {
    return null
  }

  return Array.from(
    orders.reduce((map, order) => {
      const channel = order.channel ?? 'balcao'
      const current = map.get(channel) ?? { channel, count: 0 }
      current.count += 1
      map.set(channel, current)
      return map
    }, new Map<string, { channel: string; count: number }>()),
  )
    .map(([, value]) => value)
    .sort((left, right) => right.count - left.count)[0]
}

export function topOperatorEntry(orders: OrderRecord[]) {
  const operators = orders.filter((order) => order.sellerName)
  if (operators.length === 0) {
    return null
  }

  return Array.from(
    operators.reduce((map, order) => {
      const name = order.sellerName ?? 'sem operador'
      const current = map.get(name) ?? { name, revenue: 0 }
      current.revenue += order.totalRevenue
      map.set(name, current)
      return map
    }, new Map<string, { name: string; revenue: number }>()),
  )
    .map(([, value]) => value)
    .sort((left, right) => right.revenue - left.revenue)[0]
}

export function topChannelLabel(orders: OrderRecord[]) {
  if (orders.length === 0) {
    return 'sem canal líder'
  }

  const [channel] = Array.from(
    orders.reduce((map, order) => {
      const current = order.channel ?? 'balcao'
      map.set(current, (map.get(current) ?? 0) + 1)
      return map
    }, new Map<string, number>()),
  ).sort((left, right) => right[1] - left[1])[0]

  return `${channel} líder`
}

export function isSameDateKey(value: string, date: Date) {
  return formatOrderDayKey(value) === formatOrderDayKey(date.toISOString())
}
