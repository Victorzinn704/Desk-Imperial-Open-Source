import type { FieldArrayWithId, UseFieldArrayRemove } from 'react-hook-form'
import type { ProductRecord } from '@contracts/contracts'
import type { OrderFormInputValues } from '@/lib/validation'
import type { CartItemValue } from './order-form.types'

export type OrderCartSectionProps = {
  currentItems: CartItemValue[]
  draftQuantity: string
  draftUnitPrice: string
  fields: FieldArrayWithId<OrderFormInputValues, 'items', 'id'>[]
  isEmbedded: boolean
  itemsError?: string
  onAddItem: () => void
  onDraftProductChange: (value: string) => void
  onDraftQuantityChange: (value: string) => void
  onDraftUnitPriceChange: (value: string) => void
  onRemoveItem: UseFieldArrayRemove
  orderCurrency: OrderFormInputValues['currency']
  productOptions: Array<{ label: string; value: string }>
  products: ProductRecord[]
  resolvedDraftProductId: string
  selectedDraftProduct: ProductRecord | null
  selectedStockLabel: string
  summary: {
    itemsCount: number
    itemsTotal: number
    totalCartUnits: number
  }
}

export type CartLineItemProps = Readonly<{
  currentItem: CartItemValue | undefined
  field: FieldArrayWithId<OrderFormInputValues, 'items', 'id'>
  index: number
  isEmbedded: boolean
  onRemoveItem: UseFieldArrayRemove
  orderCurrency: OrderFormInputValues['currency']
  product: ProductRecord | undefined
}>
