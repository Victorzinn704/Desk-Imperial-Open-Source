import { roundCurrency } from '../../common/utils/number-rounding.util'
import type { CurrencyService } from '../currency/currency.service'

type CurrencyCode = 'BRL' | 'USD' | 'EUR'
type CurrencySnapshot = Awaited<ReturnType<CurrencyService['getSnapshot']>>

type NumericLike = { toNumber(): number } | number

export type ComboComponentInventoryLike = {
  componentProductId: string
  totalUnits: number
  componentProduct: {
    id: string
    name: string
    stock: number
    unitCost: NumericLike
    currency: CurrencyCode
  }
}

export type ComboAwareInventoryProductLike = {
  id: string
  name: string
  stock: number
  unitCost: NumericLike
  currency: CurrencyCode
  isCombo?: boolean
  comboComponents?: ComboComponentInventoryLike[]
}

export type ProductQuantityInput = {
  productId: string
  quantity: number
}

export function buildProductConsumptionMap(
  items: ProductQuantityInput[],
  productsById: Map<string, ComboAwareInventoryProductLike>,
) {
  const requestedStockByProduct = new Map<string, number>()

  for (const item of items) {
    const product = productsById.get(item.productId)
    if (!product) {
      continue
    }

    const comboComponents = product.isCombo ? (product.comboComponents ?? []) : []
    if (comboComponents.length > 0) {
      for (const component of comboComponents) {
        requestedStockByProduct.set(
          component.componentProductId,
          (requestedStockByProduct.get(component.componentProductId) ?? 0) + component.totalUnits * item.quantity,
        )
      }
      continue
    }

    requestedStockByProduct.set(product.id, (requestedStockByProduct.get(product.id) ?? 0) + item.quantity)
  }

  return requestedStockByProduct
}

export function calculateEffectiveUnitCost(
  product: ComboAwareInventoryProductLike,
  options: {
    currencyService: CurrencyService
    displayCurrency: CurrencyCode
    snapshot: CurrencySnapshot
  },
) {
  const comboComponents = product.isCombo ? (product.comboComponents ?? []) : []
  if (comboComponents.length === 0) {
    return roundCurrency(
      options.currencyService.convert(
        toNumber(product.unitCost),
        product.currency,
        options.displayCurrency,
        options.snapshot,
      ),
    )
  }

  return roundCurrency(
    comboComponents.reduce(
      (total, component) =>
        total +
        options.currencyService.convert(
          toNumber(component.componentProduct.unitCost) * component.totalUnits,
          component.componentProduct.currency,
          options.displayCurrency,
          options.snapshot,
        ),
      0,
    ),
  )
}

export function calculateRawEffectiveUnitCost(product: ComboAwareInventoryProductLike) {
  const comboComponents = product.isCombo ? (product.comboComponents ?? []) : []
  if (comboComponents.length === 0) {
    return roundCurrency(toNumber(product.unitCost))
  }

  return roundCurrency(
    comboComponents.reduce(
      (total, component) => total + toNumber(component.componentProduct.unitCost) * component.totalUnits,
      0,
    ),
  )
}

export function buildInventoryProductsById(products: ComboAwareInventoryProductLike[]) {
  const inventoryProductsById = new Map<
    string,
    {
      name: string
      stock: number
    }
  >()

  for (const product of products) {
    inventoryProductsById.set(product.id, {
      name: product.name,
      stock: product.stock,
    })

    for (const component of product.comboComponents ?? []) {
      inventoryProductsById.set(component.componentProduct.id, {
        name: component.componentProduct.name,
        stock: component.componentProduct.stock,
      })
    }
  }

  return inventoryProductsById
}

function toNumber(value: NumericLike) {
  return typeof value === 'number' ? value : value.toNumber()
}
