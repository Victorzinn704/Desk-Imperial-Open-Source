'use client'

import { useMemo } from 'react'
import { type UseFormReturn, useWatch } from 'react-hook-form'
import type { OrderFormInputValues, OrderFormValues } from '@/lib/validation'
import type { CartItemValue, OrderFormProps } from './order-form.types'
import { buildEmployeeOptions, buildProductOptions, estimateCartTotals } from './order-form.utils'

function formatStockLabel(stock: number, unitsPerPackage: number) {
  return `${stock} und • ${unitsPerPackage} por pacote`
}

export function useOrderFormDerivedState(params: {
  activeEmployees: OrderFormProps['employees']
  currentItems: CartItemValue[]
  form: UseFormReturn<OrderFormInputValues, undefined, OrderFormValues>
  products: OrderFormProps['products']
  resolvedDraftProductId: string
  selectedDraftProduct: OrderFormProps['products'][number] | null
}) {
  const buyerType = useWatch({ control: params.form.control, name: 'buyerType' }) as OrderFormValues['buyerType']
  const orderCurrency = useWatch({ control: params.form.control, name: 'currency' }) as OrderFormInputValues['currency']
  const employeeOptions = useMemo(() => buildEmployeeOptions(params.activeEmployees), [params.activeEmployees])
  const productOptions = useMemo(() => buildProductOptions(params.products), [params.products])
  const itemsError =
    typeof params.form.formState.errors.items?.message === 'string'
      ? params.form.formState.errors.items.message
      : undefined
  const totalCartUnits = params.currentItems.reduce((total, item) => total + Number(item.quantity ?? 0), 0)
  const estimatedCart = useMemo(
    () => estimateCartTotals(params.products, params.currentItems),
    [params.currentItems, params.products],
  )
  const selectedStockLabel = params.selectedDraftProduct
    ? formatStockLabel(params.selectedDraftProduct.stock, params.selectedDraftProduct.unitsPerPackage)
    : 'Selecione um produto'

  return {
    buyerType,
    employeeOptions,
    estimatedCart,
    itemsError,
    orderCurrency,
    productOptions,
    resolvedDraftProductId: params.resolvedDraftProductId,
    selectedDraftProduct: params.selectedDraftProduct,
    selectedStockLabel,
    totalCartUnits,
  }
}
