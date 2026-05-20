import type { CurrencyCode } from '@prisma/client'
import { roundCurrency, roundPercent } from '../../common/utils/number-rounding.util'
import type { CurrencyService, ExchangeRatesSnapshot } from '../currency/currency.service'
import { buildProductRecord } from './products-record.mapper'
import type { ProductRecord, ProductRecordOptions, ProductsResponse, ProductWithComboLike } from './products.types'

export function toProductRecord(product: ProductWithComboLike, options: ProductRecordOptions): ProductRecord {
  return buildProductRecord(product, options)
}

export function buildProductsResponse(
  items: ProductWithComboLike[],
  options: {
    displayCurrency: CurrencyCode
    currencyService: CurrencyService
    snapshot: ExchangeRatesSnapshot
    ratesUpdatedAt: string | null
  },
): ProductsResponse {
  const records = items.map((item) => toProductRecord(item, options))
  const activeItems = records.filter((item) => item.active)
  const inventoryCostValue = sumRoundedMoney(records, 'inventoryCostValue')
  const inventorySalesValue = sumRoundedMoney(records, 'inventorySalesValue')
  const potentialProfit = sumRoundedMoney(records, 'potentialProfit')

  return {
    displayCurrency: options.displayCurrency,
    ratesUpdatedAt: options.ratesUpdatedAt,
    ratesSource: options.snapshot.source,
    ratesNotice: options.snapshot.notice,
    items: records,
    totals: {
      totalProducts: records.length,
      activeProducts: activeItems.length,
      inactiveProducts: records.length - activeItems.length,
      stockUnits: sumNumericField(records, 'stock'),
      stockPackages: sumNumericField(records, 'stockPackages'),
      stockLooseUnits: sumNumericField(records, 'stockLooseUnits'),
      stockBaseUnits: sumNumericField(records, 'stockBaseUnits'),
      inventoryCostValue,
      inventorySalesValue,
      potentialProfit,
      averageMarginPercent: buildAverageMarginPercent({ inventorySalesValue, potentialProfit }),
      categories: buildSortedCategories(records),
    },
  }
}

function sumRoundedMoney(records: ProductRecord[], key: keyof ProductRecord) {
  return roundCurrency(sumNumericField(records, key))
}

function sumNumericField(records: ProductRecord[], key: keyof ProductRecord) {
  return records.reduce((total, item) => total + Number(item[key]), 0)
}

function buildAverageMarginPercent(input: { inventorySalesValue: number; potentialProfit: number }) {
  return input.inventorySalesValue > 0 ? roundPercent((input.potentialProfit / input.inventorySalesValue) * 100) : 0
}

function buildSortedCategories(records: ProductRecord[]) {
  return [...new Set(records.map((item) => item.category))].sort((left, right) => left.localeCompare(right))
}
