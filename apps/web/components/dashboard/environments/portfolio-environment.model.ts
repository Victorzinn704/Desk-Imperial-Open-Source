import { MapPin, Store, Truck } from 'lucide-react'
import type { ProductRecord } from '@contracts/contracts'
import type { LabStatusTone } from '@/components/design-lab/lab-primitives'
import { ApiError } from '@/lib/api'
import { normalizeTextForSearch } from '@/lib/normalize-text-for-search'
import type { OrderFormInputValues, ProductFormValues } from '@/lib/validation'

export type ProductMutationError = ApiError | null
export type SaleMode = 'delivery' | 'balcao' | 'mesa'
export type PortfolioSurfaceState =
  | { kind: 'product'; product: ProductRecord | null }
  | { kind: 'sale'; product: ProductRecord | null; mode: SaleMode }
  | null

export const saleModeMeta: Record<
  SaleMode,
  {
    label: string
    channel: string
    icon: typeof Truck
    tone: LabStatusTone
  }
> = {
  delivery: {
    label: 'Delivery',
    channel: 'Delivery',
    icon: Truck,
    tone: 'info',
  },
  balcao: {
    label: 'Balcão',
    channel: 'Balcão',
    icon: Store,
    tone: 'success',
  },
  mesa: {
    label: 'Mesa',
    channel: 'Mesa',
    icon: MapPin,
    tone: 'warning',
  },
}

export function buildProductPayload(values: ProductFormValues, existingProduct?: ProductRecord | null) {
  return {
    name: values.name,
    barcode: values.barcode ?? (existingProduct?.barcode ? null : undefined),
    brand: values.brand,
    category: values.category,
    packagingClass: values.packagingClass,
    measurementUnit: values.measurementUnit,
    measurementValue: values.measurementValue,
    unitsPerPackage: values.unitsPerPackage,
    isCombo: values.isCombo,
    comboDescription: values.comboDescription,
    comboItems: values.comboItems,
    description: values.description,
    unitCost: values.unitCost,
    unitPrice: values.unitPrice,
    currency: values.currency,
    stock: values.stock,
    requiresKitchen: values.requiresKitchen ?? false,
    lowStockThreshold: values.lowStockThreshold ?? null,
  }
}

export function resolveProductMutationError(errors: unknown[]): ProductMutationError {
  return errors.find((error): error is ApiError => error instanceof ApiError) ?? null
}

export function filterProducts(products: ProductRecord[], searchQuery: string) {
  const normalizedSearch = normalizeTextForSearch(searchQuery.trim())
  if (!normalizedSearch) {
    return products
  }

  return products.filter((product) =>
    [product.name, product.barcode ?? '', product.brand ?? '', product.category, product.packagingClass].some(
      (value) => {
        const normalizedValue = normalizeTextForSearch(value)
        return normalizedValue.includes(normalizedSearch) || normalizedValue.startsWith(normalizedSearch)
      },
    ),
  )
}

export function confirmProductDeletion(productName: string | undefined) {
  if (globalThis.window == null) {
    return true
  }

  return globalThis.window.confirm(
    `Excluir "${productName ?? 'este produto'}" em definitivo?\n\nEssa acao remove o item do portfolio ativo e preserva apenas o historico de vendas consolidado.`,
  )
}

export function calcAvgMargin(products: ProductRecord[]): string {
  const active = products.filter((product) => product.active && product.unitPrice > 0)
  if (active.length === 0) {
    return '0%'
  }

  const avg =
    active.reduce((sum, product) => sum + ((product.unitPrice - product.unitCost) / product.unitPrice) * 100, 0) /
    active.length

  return `${avg.toFixed(0)}%`
}

export function buildSaleInitialValues(
  product: ProductRecord | null,
  currency: string,
  mode: SaleMode,
): Partial<OrderFormInputValues> {
  const resolvedCurrency: OrderFormInputValues['currency'] =
    product?.currency === 'USD' || product?.currency === 'EUR' || product?.currency === 'BRL'
      ? product.currency
      : currency === 'USD' || currency === 'EUR'
        ? currency
        : 'BRL'

  return {
    items: product
      ? [
          {
            productId: product.id,
            quantity: 1,
            unitPrice: undefined,
          },
        ]
      : [],
    buyerType: 'PERSON',
    buyerCountry: 'Brasil',
    buyerDistrict: '',
    buyerCity: '',
    buyerState: '',
    currency: resolvedCurrency,
    channel: saleModeMeta[mode].channel,
    notes: mode === 'delivery' ? 'Entrega com rastreio por localização.' : '',
  }
}

export function productsTotalsValue(products: ProductRecord[], currency: string) {
  if (products.length === 0) {
    return 0
  }

  return products.reduce((sum, product) => {
    if (product.displayCurrency !== currency) {
      return sum + product.inventorySalesValue
    }

    return sum + product.inventorySalesValue
  }, 0)
}
