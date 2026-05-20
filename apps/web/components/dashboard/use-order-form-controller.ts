'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { useAdminPin } from '@/components/admin-pin/use-admin-pin'
import { type OrderFormInputValues, type OrderFormValues, orderSchema } from '@/lib/validation'
import type { CartItemValue, OrderFormProps } from './order-form.types'
import { buildOrderDefaults, resolveDraftProductId } from './order-form.utils'
import { useCurrentItems } from './use-order-form-current-items'
import { useOrderFormDerivedState } from './use-order-form-derived-state'
import { useDraftComposer } from './use-order-form-draft-composer'
import { useOrderFormEffects } from './use-order-form-effects'
import { useOrderFormHandlers } from './use-order-form-handlers'

export function useOrderFormController(props: Readonly<OrderFormProps>) {
  const state = useOrderFormState(props)
  const derived = useOrderFormDerivedState({
    activeEmployees: state.activeEmployees,
    currentItems: state.currentItems,
    form: state.form,
    products: props.products,
    resolvedDraftProductId: state.resolvedDraftProductId,
    selectedDraftProduct: state.selectedDraftProduct,
  })
  const handlers = useOrderFormHandlers({
    activeEmployeesLength: state.activeEmployees.length,
    currentItems: state.currentItems,
    draftComposer: state.draftComposer,
    fieldsApi: state.fieldsApi,
    form: state.form,
    isStaffUser: props.userRole === 'STAFF',
    onSubmit: props.onSubmit,
    pin: state.pin,
    products: props.products,
    resetValues: state.initialFormValues,
    resolvedDraftProductId: state.resolvedDraftProductId,
  })

  return buildControllerPayload({ ...state, derived, handlers, props })
}

function useOrderFormState(props: Readonly<OrderFormProps>) {
  const initialFormValues = useMemo(
    () => buildOrderDefaults(props.products, props.initialValues),
    [props.initialValues, props.products],
  )
  const draftComposer = useDraftComposer(props.products, initialFormValues)
  const pin = useAdminPin()
  const form = useForm<OrderFormInputValues, undefined, OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: initialFormValues,
  })
  const fieldsApi = useFieldArray({ control: form.control, name: 'items' })
  const currentItems = useCurrentItems(form.control)
  const activeEmployees = useMemo(() => props.employees.filter((employee) => employee.active), [props.employees])
  const resolvedDraftProductId = resolveDraftProductId(props.products, draftComposer.composer.productId)
  const selectedDraftProduct = props.products.find((product) => product.id === resolvedDraftProductId) ?? null

  useOrderFormEffects({
    channelPreset: props.channelPreset,
    currentItemsLength: currentItems.length,
    initialFormValues,
    reset: form.reset,
    selectedDraftProduct,
    setValue: form.setValue,
  })

  return {
    activeEmployees,
    currentItems,
    draftComposer,
    fieldsApi,
    form,
    initialFormValues,
    pin,
    resolvedDraftProductId,
    selectedDraftProduct,
  }
}

function buildControllerPayload(params: {
  activeEmployees: OrderFormProps['employees']
  currentItems: CartItemValue[]
  derived: ReturnType<typeof useOrderFormDerivedState>
  draftComposer: ReturnType<typeof useDraftComposer>
  fieldsApi: ReturnType<typeof useFieldArray<OrderFormInputValues, 'items'>>
  form: ReturnType<typeof useForm<OrderFormInputValues, undefined, OrderFormValues>>
  handlers: ReturnType<typeof useOrderFormHandlers>
  pin: ReturnType<typeof useAdminPin>
  props: Readonly<OrderFormProps>
}) {
  return {
    activeEmployees: params.activeEmployees,
    currentItems: params.currentItems,
    draftProductId: params.draftComposer.composer.productId,
    draftQuantity: params.draftComposer.composer.quantity,
    draftUnitPrice: params.draftComposer.composer.unitPrice,
    errors: params.form.formState.errors,
    fields: params.fieldsApi.fields,
    isEmbedded: params.props.appearance === 'embedded',
    isStaffUser: params.props.userRole === 'STAFF',
    loading: params.props.loading,
    pinDialogDescription: params.pin.pinDialogDescription,
    pinDialogOpen: params.pin.pinDialogOpen,
    pinDialogTitle: params.pin.pinDialogTitle,
    register: params.form.register,
    removeItem: params.fieldsApi.remove,
    submitLabel: params.props.submitLabel ?? 'Registrar pedido',
    updateDraftComposer: params.draftComposer.update,
    ...params.derived,
    ...params.handlers,
  }
}
