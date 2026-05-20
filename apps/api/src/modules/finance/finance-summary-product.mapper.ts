import { roundCurrency, roundPercent } from '../../common/utils/number-rounding.util'
import { resolveProductCatalogMetadata } from '../products/products-catalog.util'
import type { CurrencyService } from '../currency/currency.service'
import type { FinanceProductAnalyticsRecord } from './finance-analytics.types'

export const financeProductSelect = {
  id: true,
  name: true,
  brand: true,
  category: true,
  barcode: true,
  packagingClass: true,
  measurementUnit: true,
  measurementValue: true,
  quantityLabel: true,
  imageUrl: true,
  catalogSource: true,
  isCombo: true,
  unitCost: true,
  unitPrice: true,
  currency: true,
  stock: true,
  lowStockThreshold: true,
} as const

export type FinanceProductSummaryRow = {
  id: string
  name: string
  brand: string | null
  category: string
  barcode: string | null
  packagingClass: string
  measurementUnit: string
  measurementValue: { toNumber(): number } | number
  quantityLabel: string | null
  imageUrl: string | null
  catalogSource: string | null
  isCombo: boolean
  unitCost: { toNumber(): number } | number
  unitPrice: { toNumber(): number } | number
  currency: FinanceProductAnalyticsRecord['currency']
  stock: number
  lowStockThreshold: number | null
}

type FinanceProductMapperOptions = {
  displayCurrency: FinanceProductAnalyticsRecord['displayCurrency']
  currencyService: CurrencyService
  snapshot: Awaited<ReturnType<CurrencyService['getSnapshot']>>
}

export function toFinanceProductAnalyticsRecord(
  product: FinanceProductSummaryRow,
  options: FinanceProductMapperOptions,
): FinanceProductAnalyticsRecord {
  const catalogMetadata = resolveFinanceProductCatalog(product)
  const inventory = calculateProductInventoryValues(product, options)

  return {
    id: product.id,
    name: product.name,
    brand: catalogMetadata.brand,
    category: product.category,
    barcode: product.barcode,
    packagingClass: product.packagingClass,
    quantityLabel: catalogMetadata.quantityLabel,
    imageUrl: catalogMetadata.imageUrl,
    catalogSource: catalogMetadata.catalogSource,
    isCombo: product.isCombo,
    stock: product.stock,
    currency: product.currency,
    displayCurrency: options.displayCurrency,
    ...inventory,
  }
}

function resolveFinanceProductCatalog(product: FinanceProductSummaryRow) {
  return resolveProductCatalogMetadata({
    name: product.name,
    brand: product.brand,
    measurementUnit: product.measurementUnit,
    measurementValue: product.measurementValue,
    quantityLabel: product.quantityLabel,
    imageUrl: product.imageUrl,
    catalogSource: product.catalogSource,
  })
}

function calculateProductInventoryValues(product: FinanceProductSummaryRow, options: FinanceProductMapperOptions) {
  const originalInventoryCostValue = roundCurrency(toNumber(product.unitCost) * product.stock)
  const originalInventorySalesValue = roundCurrency(toNumber(product.unitPrice) * product.stock)
  const inventoryCostValue = convertProductAmount(originalInventoryCostValue, product, options)
  const inventorySalesValue = convertProductAmount(originalInventorySalesValue, product, options)
  const potentialProfit = roundCurrency(inventorySalesValue - inventoryCostValue)

  return {
    originalInventorySalesValue,
    originalPotentialProfit: roundCurrency(originalInventorySalesValue - originalInventoryCostValue),
    inventoryCostValue,
    inventorySalesValue,
    potentialProfit,
    marginPercent: inventorySalesValue > 0 ? roundPercent((potentialProfit / inventorySalesValue) * 100) : 0,
  }
}

function convertProductAmount(amount: number, product: FinanceProductSummaryRow, options: FinanceProductMapperOptions) {
  return options.currencyService.convert({
    source: { amount, currency: product.currency },
    targetCurrency: options.displayCurrency,
    snapshot: options.snapshot,
  })
}

function toNumber(value: { toNumber(): number } | number) {
  return typeof value === 'number' ? value : value.toNumber()
}
