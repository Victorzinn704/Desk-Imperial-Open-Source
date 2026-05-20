import { roundCurrency } from '../../common/utils/number-rounding.util'
import type { CurrencyCode, FinanceAggregationOptions } from './finance-analytics.types'

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
  const buckets = buildTimelineBuckets(now)
  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]))

  for (const order of orders) {
    appendOrderToTimelineBucket({ order, bucketMap, options })
  }

  return buckets.map(({ label, revenue, profit, orders }) => ({ label, revenue, profit, orders }))
}

function buildTimelineBuckets(now: Date) {
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    month: 'short',
    year: '2-digit',
  })
  return Array.from({ length: 6 }, (_, index) => {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
    return {
      key: buildMonthKey(monthDate),
      label: formatter.format(monthDate).replace('.', ''),
      revenue: 0,
      profit: 0,
      orders: 0,
    }
  })
}

function appendOrderToTimelineBucket({
  order,
  bucketMap,
  options,
}: {
  order: Parameters<typeof buildRevenueTimeline>[0][number]
  bucketMap: Map<string, ReturnType<typeof buildTimelineBuckets>[number]>
  options: FinanceAggregationOptions
}) {
  const bucket = bucketMap.get(buildMonthKey(order.createdAt))
  if (!bucket) {
    return
  }

  bucket.revenue = addConvertedBucketAmount({
    currentValue: bucket.revenue,
    amount: toNumber(order.totalRevenue),
    currency: order.currency as CurrencyCode,
    options,
  })
  bucket.profit = addConvertedBucketAmount({
    currentValue: bucket.profit,
    amount: toNumber(order.totalProfit),
    currency: order.currency as CurrencyCode,
    options,
  })
  bucket.orders += 1
}

function addConvertedBucketAmount({
  amount,
  currency,
  currentValue,
  options,
}: {
  amount: number
  currency: CurrencyCode
  currentValue: number
  options: FinanceAggregationOptions
}) {
  return roundCurrency(currentValue + convertTimelineAmount({ amount, currency, options }))
}

function buildMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function convertTimelineAmount({
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
