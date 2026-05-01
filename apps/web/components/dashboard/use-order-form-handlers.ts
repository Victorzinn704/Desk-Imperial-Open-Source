'use client'

import type { UseFieldArrayReturn, UseFormReturn } from 'react-hook-form'
import type { useAdminPin } from '@/components/admin-pin/use-admin-pin'
import type { OrderFormInputValues, OrderFormValues } from '@/lib/validation'
import type { CartItemValue, DraftComposerState, OrderFormProps } from './order-form.types'
import { resolveDraftItemAddition } from './order-form.utils'
import type { useDraftComposer } from './use-order-form-draft-composer'

function addDraftItem(params: {
  append: UseFieldArrayReturn<OrderFormInputValues, 'items'>['append']
  clearErrors: UseFormReturn<OrderFormInputValues>['clearErrors']
  currentItems: CartItemValue[]
  draftProductId: string
  draftQuantity: string
  draftUnitPrice: string
  products: OrderFormProps['products']
  setError: UseFormReturn<OrderFormInputValues>['setError']
  update: UseFieldArrayReturn<OrderFormInputValues, 'items'>['update']
  updateDraftComposer: (patch: Partial<DraftComposerState>) => void
}) {
  const resolution = resolveDraftItemAddition(
    params.products,
    params.currentItems,
    params.draftProductId,
    params.draftQuantity,
    params.draftUnitPrice,
  )

  if ('error' in resolution) {
    params.setError('items', { type: 'manual', message: resolution.error })
    return
  }

  if (resolution.existingIndex >= 0) {
    const existingItem = params.currentItems[resolution.existingIndex]
    params.update(resolution.existingIndex, {
      productId: existingItem.productId,
      quantity: Number(existingItem.quantity) + resolution.quantity,
      unitPrice: resolution.normalizedUnitPrice ?? existingItem.unitPrice,
    })
  } else {
    params.append({
      productId: resolution.product.id,
      quantity: resolution.quantity,
      unitPrice: resolution.normalizedUnitPrice,
    })
  }

  params.clearErrors('items')
  params.updateDraftComposer({ quantity: '1', unitPrice: '' })
}

function submitOrderForm(params: {
  activeEmployeesLength: number
  clearSellerEmployeeError: () => void
  isStaffUser: boolean
  onSubmit: OrderFormProps['onSubmit']
  pin: ReturnType<typeof useAdminPin>
  reset: UseFormReturn<OrderFormInputValues>['reset']
  resetDraftComposer: () => void
  resetValues: OrderFormInputValues
  setSellerEmployeeError: (message: string) => void
  values: OrderFormValues
}) {
  if (!params.isStaffUser && params.activeEmployeesLength > 0 && !params.values.sellerEmployeeId) {
    params.setSellerEmployeeError('Selecione o vendedor responsável por esta venda.')
    return
  }

  params.clearSellerEmployeeError()
  const submit = () => {
    params.onSubmit({ values: params.values })
    params.reset(params.resetValues)
    params.resetDraftComposer()
  }

  if (params.values.items.some((item) => item.unitPrice != null)) {
    params.pin.requirePin(submit, {
      title: 'Validação de desconto',
      description: 'Digite o PIN do dono para confirmar preco manual ou desconto nesta venda.',
    })
    return
  }

  submit()
}

export function useOrderFormHandlers(params: {
  activeEmployeesLength: number
  currentItems: CartItemValue[]
  draftComposer: ReturnType<typeof useDraftComposer>
  fieldsApi: UseFieldArrayReturn<OrderFormInputValues, 'items'>
  form: UseFormReturn<OrderFormInputValues, undefined, OrderFormValues>
  isStaffUser: boolean
  onSubmit: OrderFormProps['onSubmit']
  pin: ReturnType<typeof useAdminPin>
  products: OrderFormProps['products']
  resetValues: OrderFormInputValues
  resolvedDraftProductId: string
}) {
  const handleAddItem = () =>
    addDraftItem({
      append: params.fieldsApi.append,
      clearErrors: params.form.clearErrors,
      currentItems: params.currentItems,
      draftProductId: params.resolvedDraftProductId,
      draftQuantity: params.draftComposer.composer.quantity,
      draftUnitPrice: params.draftComposer.composer.unitPrice,
      products: params.products,
      setError: params.form.setError,
      update: params.fieldsApi.update,
      updateDraftComposer: params.draftComposer.update,
    })
  const handleFormSubmit = params.form.handleSubmit((values) =>
    submitOrderForm({
      activeEmployeesLength: params.activeEmployeesLength,
      clearSellerEmployeeError: () => params.form.clearErrors('sellerEmployeeId'),
      isStaffUser: params.isStaffUser,
      onSubmit: params.onSubmit,
      pin: params.pin,
      reset: params.form.reset,
      resetDraftComposer: params.draftComposer.reset,
      resetValues: params.resetValues,
      setSellerEmployeeError: (message) => params.form.setError('sellerEmployeeId', { type: 'manual', message }),
      values,
    }),
  )

  return {
    handleAddItem,
    handleFormSubmit,
    handlePinCancel: params.pin.handlePinCancel,
    handlePinConfirm: params.pin.handlePinConfirm,
  }
}
