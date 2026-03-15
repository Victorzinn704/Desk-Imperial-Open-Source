import type { Product } from '@prisma/client'

type ProductLike = Pick<Product, 'id' | 'name' | 'category' | 'description' | 'unitCost' | 'unitPrice' | 'stock' | 'active' | 'createdAt' | 'updatedAt'>

export type ProductRecord = {
  id: string
  name: string
  category: string
  description: string | null
  unitCost: number
  unitPrice: number
  stock: number
  active: boolean
  createdAt: string
  updatedAt: string
  inventoryCostValue: number
  inventorySalesValue: number
  potentialProfit: number
  marginPercent: number
}

export type ProductsResponse = {
  items: ProductRecord[]
  totals: {
    totalProducts: number
    activeProducts: number
    inactiveProducts: number
    stockUnits: number
    inventoryCostValue: number
    inventorySalesValue: number
    potentialProfit: number
    averageMarginPercent: number
    categories: string[]
  }
}

export function toProductRecord(product: ProductLike): ProductRecord {
  const unitCost = toNumber(product.unitCost)
  const unitPrice = toNumber(product.unitPrice)
  const inventoryCostValue = roundCurrency(unitCost * product.stock)
  const inventorySalesValue = roundCurrency(unitPrice * product.stock)
  const potentialProfit = roundCurrency(inventorySalesValue - inventoryCostValue)
  const marginPercent = inventorySalesValue > 0 ? roundPercent((potentialProfit / inventorySalesValue) * 100) : 0

  return {
    id: product.id,
    name: product.name,
    category: product.category,
    description: product.description,
    unitCost,
    unitPrice,
    stock: product.stock,
    active: product.active,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    inventoryCostValue,
    inventorySalesValue,
    potentialProfit,
    marginPercent,
  }
}

export function buildProductsResponse(items: ProductLike[]): ProductsResponse {
  const records = items.map(toProductRecord)
  const activeItems = records.filter((item) => item.active)
  const inventoryCostValue = roundCurrency(records.reduce((total, item) => total + item.inventoryCostValue, 0))
  const inventorySalesValue = roundCurrency(records.reduce((total, item) => total + item.inventorySalesValue, 0))
  const potentialProfit = roundCurrency(records.reduce((total, item) => total + item.potentialProfit, 0))

  return {
    items: records,
    totals: {
      totalProducts: records.length,
      activeProducts: activeItems.length,
      inactiveProducts: records.length - activeItems.length,
      stockUnits: records.reduce((total, item) => total + item.stock, 0),
      inventoryCostValue,
      inventorySalesValue,
      potentialProfit,
      averageMarginPercent: inventorySalesValue > 0 ? roundPercent((potentialProfit / inventorySalesValue) * 100) : 0,
      categories: [...new Set(records.map((item) => item.category))].sort((left, right) => left.localeCompare(right)),
    },
  }
}

export function roundCurrency(value: number) {
  return Math.round(value * 100) / 100
}

export function roundPercent(value: number) {
  return Math.round(value * 100) / 100
}

function toNumber(value: { toNumber(): number } | number) {
  return typeof value === 'number' ? value : value.toNumber()
}
