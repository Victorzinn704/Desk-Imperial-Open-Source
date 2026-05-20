import type { FinanceSummaryResponse } from '@contracts/contracts'
import { roundCurrency, roundPercent } from '../../common/utils/number-rounding.util'
import type { CurrencyCode, FinanceAggregationOptions, FinanceProductAnalyticsRecord } from './finance-analytics.types'
import { calculateGrowthPercent } from './finance-analytics.util'
import type { FinanceProductSummaryRow } from './finance-summary-product.mapper'

type MoneyValue = { toNumber(): number } | number | null

export type FinanceTotalsAggregate = {
  currency: CurrencyCode
  _count: { _all: number }
  _sum: {
    totalRevenue: MoneyValue
    totalCost: MoneyValue
    totalProfit: MoneyValue
  }
}

export type FinancePeriodAggregate = {
  currency: CurrencyCode
  _sum: {
    totalRevenue: MoneyValue
    totalProfit: MoneyValue
  }
}

type FinanceSummaryTotalsInput = {
  records: FinanceProductAnalyticsRecord[]
  products: FinanceProductSummaryRow[]
  allTimeAggregates: FinanceTotalsAggregate[]
  currentMonthAggregates: FinancePeriodAggregate[]
  previousMonthAggregates: FinancePeriodAggregate[]
  options: FinanceAggregationOptions
}

export function buildFinanceSummaryTotals(input: FinanceSummaryTotalsInput): FinanceSummaryResponse['totals'] {
  const allTime = summarizeAllTimeAggregates(input.allTimeAggregates, input.options)
  const currentMonth = summarizePeriodAggregates(input.currentMonthAggregates, input.options)
  const previousMonth = summarizePeriodAggregates(input.previousMonthAggregates, input.options)
  const inventory = summarizeInventory(input.records)

  return {
    ...inventory,
    ...allTime,
    completedOrders: allTime.completedOrdersCount,
    currentMonthRevenue: currentMonth.revenue,
    currentMonthProfit: currentMonth.profit,
    previousMonthRevenue: previousMonth.revenue,
    previousMonthProfit: previousMonth.profit,
    revenueGrowthPercent: calculateGrowthPercent(currentMonth.revenue, previousMonth.revenue),
    profitGrowthPercent: calculateGrowthPercent(currentMonth.profit, previousMonth.profit),
    averageMarginPercent: calculateAverageMargin(inventory),
    averageMarkupPercent: calculateAverageMarkup(inventory),
    lowStockItems: countLowStockProducts(input.products),
  }
}

function summarizeInventory(records: FinanceProductAnalyticsRecord[]) {
  const inventoryCostValue = roundCurrency(records.reduce((total, item) => total + item.inventoryCostValue, 0))
  const inventorySalesValue = roundCurrency(records.reduce((total, item) => total + item.inventorySalesValue, 0))
  const potentialProfit = roundCurrency(records.reduce((total, item) => total + item.potentialProfit, 0))

  return {
    activeProducts: records.length,
    inventoryUnits: records.reduce((total, item) => total + item.stock, 0),
    inventoryCostValue,
    inventorySalesValue,
    potentialProfit,
  }
}

function summarizeAllTimeAggregates(rows: FinanceTotalsAggregate[], options: FinanceAggregationOptions) {
  const totals = rows.reduce(
    (summary, row) => ({
      realizedRevenue: addConvertedAmount(summary.realizedRevenue, row._sum.totalRevenue, row.currency, options),
      realizedCost: addConvertedAmount(summary.realizedCost, row._sum.totalCost, row.currency, options),
      realizedProfit: addConvertedAmount(summary.realizedProfit, row._sum.totalProfit, row.currency, options),
      completedOrdersCount: summary.completedOrdersCount + row._count._all,
    }),
    { realizedRevenue: 0, realizedCost: 0, realizedProfit: 0, completedOrdersCount: 0 },
  )

  return roundFinanceTotals(totals)
}

function summarizePeriodAggregates(rows: FinancePeriodAggregate[], options: FinanceAggregationOptions) {
  return rows.reduce(
    (summary, row) => ({
      revenue: addConvertedAmount(summary.revenue, row._sum.totalRevenue, row.currency, options),
      profit: addConvertedAmount(summary.profit, row._sum.totalProfit, row.currency, options),
    }),
    { revenue: 0, profit: 0 },
  )
}

function countLowStockProducts(products: FinanceProductSummaryRow[]) {
  return products.filter((product) => product.lowStockThreshold != null && product.stock <= product.lowStockThreshold)
    .length
}

function calculateAverageMargin(inventory: ReturnType<typeof summarizeInventory>) {
  return inventory.inventorySalesValue > 0
    ? roundPercent((inventory.potentialProfit / inventory.inventorySalesValue) * 100)
    : 0
}

function calculateAverageMarkup(inventory: ReturnType<typeof summarizeInventory>) {
  return inventory.inventoryCostValue > 0
    ? roundPercent((inventory.potentialProfit / inventory.inventoryCostValue) * 100)
    : 0
}

function addConvertedAmount(
  currentValue: number,
  amount: MoneyValue,
  sourceCurrency: CurrencyCode,
  options: FinanceAggregationOptions,
) {
  return (
    currentValue +
    options.currencyService.convert({
      source: { amount: toNumber(amount), currency: sourceCurrency },
      targetCurrency: options.displayCurrency,
      snapshot: options.snapshot,
    })
  )
}

function roundFinanceTotals<T extends { realizedRevenue: number; realizedCost: number; realizedProfit: number }>(
  totals: T,
) {
  return {
    ...totals,
    realizedRevenue: roundCurrency(totals.realizedRevenue),
    realizedCost: roundCurrency(totals.realizedCost),
    realizedProfit: roundCurrency(totals.realizedProfit),
  }
}

function toNumber(value: MoneyValue) {
  if (value == null) {
    return 0
  }

  return typeof value === 'number' ? value : value.toNumber()
}
