import type { ProductRecord } from '@contracts/contracts'
import type { EmployeeRecord } from '@/lib/api'
import type { OrderFormInputValues, OrderFormValues } from '@/lib/validation'

export type OrderFormProps = {
  employees: EmployeeRecord[]
  products: ProductRecord[]
  onSubmit: (payload: { values: OrderFormValues }) => void
  loading?: boolean
  userRole: 'OWNER' | 'STAFF'
  initialValues?: Partial<OrderFormInputValues>
  channelPreset?: string
  appearance?: 'default' | 'embedded'
  submitLabel?: string
}

export type CartItemValue = {
  productId: string
  quantity: number
  unitPrice?: number
}

export type DraftComposerState = {
  productId: string
  quantity: string
  unitPrice: string
}
