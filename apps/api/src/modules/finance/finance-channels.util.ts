import { roundCurrency } from '../../common/utils/number-rounding.util'
import type { CurrencyCode, FinanceAggregationOptions } from './finance-analytics.types'

export function buildSalesByChannel(
  orders: Array<{
    channel: string | null
    currency: string
    _count: { _all: number }
    _sum: { totalRevenue: { toNumber(): number } | number | null; totalProfit: { toNumber(): number } | number | null }
  }>,
  options: FinanceAggregationOptions,
) {
  const channels = new Map<
    string,
    { channel: string; orders: number; revenue: number; profit: number }
  >()

  for (const group of orders) {
    const channelKey = group.channel?.trim() || 'Direto'
    const current = channels.get(channelKey) ?? {
      channel: channelKey,
      orders: 0,
      revenue: 0,
      profit: 0,
    }

    current.orders += group._count._all
    current.revenue = roundCurrency(
      current.revenue +
        options.currencyService.convert(
          toNumber(group._sum.totalRevenue),
          group.currency as CurrencyCode,
          options.displayCurrency,
          options.snapshot,
        ),
    )
    current.profit = roundCurrency(
      current.profit +
        options.currencyService.convert(
          toNumber(group._sum.totalProfit),
          group.currency as CurrencyCode,
          options.displayCurrency,
          options.snapshot,
        ),
    )
    channels.set(channelKey, current)
  }

  return [...channels.values()].sort((left, right) => right.revenue - left.revenue)
}

function toNumber(value: { toNumber(): number } | number | null | undefined) {
  if (value == null) {
    return 0
  }
  return typeof value === 'number' ? value : value.toNumber()
}
