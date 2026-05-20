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
  const channels = new Map<string, { channel: string; orders: number; revenue: number; profit: number }>()

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
        convertChannelAmount({
          amount: toNumber(group._sum.totalRevenue),
          currency: group.currency as CurrencyCode,
          options,
        }),
    )
    current.profit = roundCurrency(
      current.profit +
        convertChannelAmount({
          amount: toNumber(group._sum.totalProfit),
          currency: group.currency as CurrencyCode,
          options,
        }),
    )
    channels.set(channelKey, current)
  }

  return [...channels.values()].sort((left, right) => right.revenue - left.revenue)
}

function convertChannelAmount({
  amount,
  currency,
  options,
}: {
  amount: number
  currency: CurrencyCode
  options: FinanceAggregationOptions
}) {
  return options.currencyService.convert({
    source: { amount, currency },
    targetCurrency: options.displayCurrency,
    snapshot: options.snapshot,
  })
}

function toNumber(value: { toNumber(): number } | number | null | undefined) {
  if (value == null) {
    return 0
  }
  return typeof value === 'number' ? value : value.toNumber()
}
