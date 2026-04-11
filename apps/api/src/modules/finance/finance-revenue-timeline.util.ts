import { roundCurrency } from '../../common/utils/number-rounding.util'
import type { FinanceAggregationOptions } from './finance-analytics.util'

type CurrencyCode = 'BRL' | 'USD' | 'EUR'

export function buildRevenueTimeline(
  orders: Array<{
    createdAt: Date
    currency: string
    totalRevenue: { toNumber(): number } | number
    totalProfit: { toNumber(): number } | number
  }>,
  now: Date,
  options: FinanceAggregationOptions,
) {
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    month: 'short',
    year: '2-digit',
  })
  const buckets = Array.from({ length: 6 }, (_, index) => {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
    return {
      key: buildMonthKey(monthDate),
      label: formatter.format(monthDate).replace('.', ''),
      revenue: 0,
      profit: 0,
      orders: 0,
    }
  })
  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]))

  for (const order of orders) {
    const bucket = bucketMap.get(buildMonthKey(order.createdAt))
    if (!bucket) {
      continue
    }

    bucket.revenue = roundCurrency(
      bucket.revenue +
        options.currencyService.convert(
          toNumber(order.totalRevenue),
          order.currency as CurrencyCode,
          options.displayCurrency,
          options.snapshot,
        ),
    )
    bucket.profit = roundCurrency(
      bucket.profit +
        options.currencyService.convert(
          toNumber(order.totalProfit),
          order.currency as CurrencyCode,
          options.displayCurrency,
          options.snapshot,
        ),
    )
    bucket.orders += 1
  }

  return buckets.map((bucket) => ({
    label: bucket.label,
    revenue: bucket.revenue,
    profit: bucket.profit,
    orders: bucket.orders,
  }))
}

function buildMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function toNumber(value: { toNumber(): number } | number | null | undefined) {
  if (value == null) {
    return 0
  }
  return typeof value === 'number' ? value : value.toNumber()
}
