import type { CurrencyCode, Product } from '@prisma/client'
import type { CurrencyService, ExchangeRatesSnapshot } from '../currency/currency.service'

type ProductLike = Pick<
  Product,
  | 'id'
  | 'name'
  | 'barcode'
  | 'brand'
  | 'category'
  | 'packagingClass'
  | 'measurementUnit'
  | 'measurementValue'
  | 'unitsPerPackage'
  | 'isCombo'
  | 'comboDescription'
  | 'description'
  | 'quantityLabel'
  | 'servingSize'
  | 'imageUrl'
  | 'catalogSource'
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

export type ProductWithComboLike = ProductLike & {
  comboComponents?: ProductComboComponentLike[]
}

export type ProductRecordOptions = {
  displayCurrency: CurrencyCode
  currencyService: CurrencyService
  snapshot: ExchangeRatesSnapshot
}

export type ProductRecord = {
  id: string
  name: string
  barcode: string | null
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
  quantityLabel: string | null
  servingSize: string | null
  imageUrl: string | null
  catalogSource: string | null
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
