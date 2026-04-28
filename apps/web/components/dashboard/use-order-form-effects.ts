'use client'

import { useEffect } from 'react'
import type { UseFormReset, UseFormSetValue } from 'react-hook-form'
import type { OrderFormInputValues } from '@/lib/validation'
import type { OrderFormProps } from './order-form.types'

export function useOrderFormEffects(params: {
  channelPreset?: string
  currentItemsLength: number
  initialFormValues: OrderFormInputValues
  reset: UseFormReset<OrderFormInputValues>
  selectedDraftProduct: OrderFormProps['products'][number] | null
  setValue: UseFormSetValue<OrderFormInputValues>
}) {
  const { channelPreset, currentItemsLength, initialFormValues, reset, selectedDraftProduct, setValue } = params

  useEffect(() => {
    reset(initialFormValues)
  }, [initialFormValues, reset])

  useEffect(() => {
    if (selectedDraftProduct && currentItemsLength === 0) {
      setValue('currency', selectedDraftProduct.currency, { shouldDirty: false, shouldValidate: true })
    }
  }, [currentItemsLength, selectedDraftProduct, setValue])

  useEffect(() => {
    if (channelPreset) {
      setValue('channel', channelPreset, { shouldDirty: true, shouldValidate: true })
    }
  }, [channelPreset, setValue])
}
