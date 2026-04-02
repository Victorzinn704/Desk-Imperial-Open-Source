import type { CurrencyCode, Product } from '@prisma/client'
import { roundCurrency, roundPercent } from '../../common/utils/number-rounding.util'
import type { CurrencyService, ExchangeRatesSnapshot } from '../currency/currency.service'

type ProductLike = Pick<
  Product,
  | 'id'
  | 'name'
  | 'brand'
  | 'category'
  | 'packagingClass'
  | 'measurementUnit'
  | 'measurementValue'
  | 'unitsPerPackage'
  | 'isCombo'
  | 'comboDescription'
  | 'description'
  | 'unitCost'
  | 'unitPrice'
  | 'currency'
  | 'stock'
  | 'lowStockThreshold'
  | 'requiresKitchen'
  | 'active'
  | 'createdAt'
  | 'updatedAt'
>

type ProductComboComponentLike = {
  componentProductId: string
  quantityPackages: number
  quantityUnits: number
  totalUnits: number
  componentProduct: {
    id: string
    name: string
    packagingClass: string
    measurementUnit: string
    measurementValue: { toNumber(): number } | number
    unitsPerPackage: number
    active: boolean
  }
}

type ProductWithComboLike = ProductLike & {
  comboComponents?: ProductComboComponentLike[]
}

export type ProductRecord = {
  id: string
  name: string
  brand: string | null
  category: string
  packagingClass: string
  measurementUnit: string
  measurementValue: number
  unitsPerPackage: number
  isCombo: boolean
  comboDescription: string | null
  comboItems: Array<{
    componentProductId: string
    componentProductName: string
    packagingClass: string
    measurementUnit: string
    measurementValue: number
    unitsPerPackage: number
    quantityPackages: number
    quantityUnits: number
    totalUnits: number
  }>
  stockPackages: number
  stockLooseUnits: number
  description: string | null
  currency: CurrencyCode
  displayCurrency: CurrencyCode
  unitCost: number
  unitPrice: number
  originalUnitCost: number
  originalUnitPrice: number
  stock: number
  lowStockThreshold: number | null
  isLowStock: boolean
  requiresKitchen: boolean
  active: boolean
  createdAt: string
  updatedAt: string
  inventoryCostValue: number
  inventorySalesValue: number
  potentialProfit: number
  originalInventoryCostValue: number
  originalInventorySalesValue: number
  originalPotentialProfit: number
  stockBaseUnits: number
  marginPercent: number
}

export type ProductsResponse = {
  displayCurrency: CurrencyCode
  ratesUpdatedAt: string | null
  ratesSource: 'live' | 'stale-cache' | 'fallback'
  ratesNotice: string | null
  items: ProductRecord[]
  totals: {
    totalProducts: number
    activeProducts: number
    inactiveProducts: number
    stockUnits: number
    stockPackages: number
    stockLooseUnits: number
    stockBaseUnits: number
    inventoryCostValue: number
    inventorySalesValue: number
    potentialProfit: number
    averageMarginPercent: number
    categories: string[]
  }
}

export function toProductRecord(
  product: ProductWithComboLike,
  options: {
    displayCurrency: CurrencyCode
    currencyService: CurrencyService
    snapshot: ExchangeRatesSnapshot
  },
): ProductRecord {
  const originalUnitCost = toNumber(product.unitCost)
  const originalUnitPrice = toNumber(product.unitPrice)
  const measurementValue = toNumber(product.measurementValue)
  const originalInventoryCostValue = roundCurrency(originalUnitCost * product.stock)
  const originalInventorySalesValue = roundCurrency(originalUnitPrice * product.stock)
  const originalPotentialProfit = roundCurrency(originalInventorySalesValue - originalInventoryCostValue)
  const stockBaseUnits = product.stock
  const stockPackages = product.unitsPerPackage > 1 ? Math.floor(product.stock / product.unitsPerPackage) : 0
  const stockLooseUnits = product.unitsPerPackage > 1 ? product.stock % product.unitsPerPackage : product.stock
  const isLowStock = product.lowStockThreshold != null && product.stock <= product.lowStockThreshold
  const comboItems = (product.comboComponents ?? []).map((component) => ({
    componentProductId: component.componentProductId,
    componentProductName: component.componentProduct.name,
    packagingClass: component.componentProduct.packagingClass,
    measurementUnit: component.componentProduct.measurementUnit,
    measurementValue: toNumber(component.componentProduct.measurementValue),
    unitsPerPackage: component.componentProduct.unitsPerPackage,
    quantityPackages: component.quantityPackages,
    quantityUnits: component.quantityUnits,
    totalUnits: component.totalUnits,
  }))

  const unitCost = options.currencyService.convert(
    originalUnitCost,
    product.currency,
    options.displayCurrency,
    options.snapshot,
  )
  const unitPrice = options.currencyService.convert(
    originalUnitPrice,
    product.currency,
    options.displayCurrency,
    options.snapshot,
  )
  const inventoryCostValue = options.currencyService.convert(
    originalInventoryCostValue,
    product.currency,
    options.displayCurrency,
    options.snapshot,
  )
  const inventorySalesValue = options.currencyService.convert(
    originalInventorySalesValue,
    product.currency,
    options.displayCurrency,
    options.snapshot,
  )
  const potentialProfit = roundCurrency(inventorySalesValue - inventoryCostValue)
  const marginPercent = inventorySalesValue > 0 ? roundPercent((potentialProfit / inventorySalesValue) * 100) : 0

  return {
    id: product.id,
    name: product.name,
    brand: product.brand,
    category: product.category,
    packagingClass: product.packagingClass,
    measurementUnit: product.measurementUnit,
    measurementValue,
    unitsPerPackage: product.unitsPerPackage,
    isCombo: product.isCombo,
    comboDescription: product.comboDescription,
    comboItems,
    stockPackages,
    stockLooseUnits,
    description: product.description,
    currency: product.currency,
    displayCurrency: options.displayCurrency,
    unitCost,
    unitPrice,
    originalUnitCost,
    originalUnitPrice,
    stock: product.stock,
    lowStockThreshold: product.lowStockThreshold,
    isLowStock,
    requiresKitchen: product.requiresKitchen,
    active: product.active,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    inventoryCostValue,
    inventorySalesValue,
    potentialProfit,
    originalInventoryCostValue,
    originalInventorySalesValue,
    originalPotentialProfit,
    stockBaseUnits,
    marginPercent,
  }
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
  const inventoryCostValue = roundCurrency(records.reduce((total, item) => total + item.inventoryCostValue, 0))
  const inventorySalesValue = roundCurrency(records.reduce((total, item) => total + item.inventorySalesValue, 0))
  const potentialProfit = roundCurrency(records.reduce((total, item) => total + item.potentialProfit, 0))

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
      stockUnits: records.reduce((total, item) => total + item.stock, 0),
      stockPackages: records.reduce((total, item) => total + item.stockPackages, 0),
      stockLooseUnits: records.reduce((total, item) => total + item.stockLooseUnits, 0),
      stockBaseUnits: records.reduce((total, item) => total + item.stockBaseUnits, 0),
      inventoryCostValue,
      inventorySalesValue,
      potentialProfit,
      averageMarginPercent: inventorySalesValue > 0 ? roundPercent((potentialProfit / inventorySalesValue) * 100) : 0,
      categories: [...new Set(records.map((item) => item.category))].sort((left, right) => left.localeCompare(right)),
    },
  }
}

function toNumber(value: { toNumber(): number } | number) {
  return typeof value === 'number' ? value : value.toNumber()
}
