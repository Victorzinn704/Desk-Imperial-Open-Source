'use client'

import { useCallback } from 'react'
import type { UseFormHandleSubmit, UseFormSetValue } from 'react-hook-form'
import type { ProductRecord } from '@contracts/contracts'
import { customMeasurementOption } from '@/lib/product-packaging'
import type { ProductFormInputValues, ProductFormValues } from '@/lib/validation'
import { applyPackagingPreset } from './product-form.model'

type UseProductFormActionsParams = Readonly<{
  handleSubmit: UseFormHandleSubmit<ProductFormInputValues, ProductFormValues>
  onSubmit: (values: ProductFormValues) => void
  packagingClassValue: string
  product: ProductRecord | null
  resetFormToDefaults: () => void
  setMeasurementMode: (mode: string) => void
  setSelectedPreset: (preset: string) => void
  setValue: UseFormSetValue<ProductFormInputValues>
}>

export function useProductFormActions({
  handleSubmit,
  onSubmit,
  packagingClassValue,
  product,
  resetFormToDefaults,
  setMeasurementMode,
  setSelectedPreset,
  setValue,
}: UseProductFormActionsParams) {
  const handlePresetChange = useCallback(
    (presetKey: string) => {
      setSelectedPreset(presetKey)
      applyPackagingPreset(presetKey, packagingClassValue, setValue, setMeasurementMode)
    },
    [packagingClassValue, setMeasurementMode, setSelectedPreset, setValue],
  )
  const handleMeasurementModeChange = useCallback(
    (nextValue: string) => {
      setMeasurementMode(nextValue)
      setValue('measurementUnit', nextValue === customMeasurementOption ? '' : nextValue, {
        shouldDirty: true,
        shouldValidate: true,
      })
    },
    [setMeasurementMode, setValue],
  )
  const submitForm = handleSubmit((values) => {
    onSubmit(values)
    if (!product) {
      resetFormToDefaults()
    }
  })

  return { handleMeasurementModeChange, handlePresetChange, submitForm }
}
