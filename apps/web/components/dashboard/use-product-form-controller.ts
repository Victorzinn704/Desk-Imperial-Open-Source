'use client'

import type { ProductRecord } from '@contracts/contracts'
import { customMeasurementOption, manualPackagingOption } from '@/lib/product-packaging'
import type { ProductFormValues } from '@/lib/validation'
import { extractComboRootError } from './product-form.model'
import { useProductFormActions } from './use-product-form-actions'
import { useProductFormBase } from './use-product-form-base'
import { useProductFormOptions } from './use-product-form-options'
import { useProductFormEffects } from './use-product-form-sync'
import { useProductFormValues } from './use-product-form-values'

type UseProductFormControllerParams = Readonly<{
  availableProducts: ProductRecord[]
  onSubmit: (values: ProductFormValues) => void
  product: ProductRecord | null
}>

export function useProductFormController({ availableProducts, onSubmit, product }: UseProductFormControllerParams) {
  const form = useProductFormBase()
  const watchedValues = useProductFormValues(form.control)
  const formOptions = useProductFormOptions({ availableProducts, product })
  const resetFormToDefaults = useProductFormEffects({ form, product, watchedValues })
  const formActions = useProductFormActions({
    handleSubmit: form.handleSubmit,
    onSubmit,
    packagingClassValue: watchedValues.packagingClassValue,
    product,
    resetFormToDefaults,
    setMeasurementMode: form.setMeasurementMode,
    setSelectedPreset: form.setSelectedPreset,
    setValue: form.setValue,
  })

  return {
    appendComboItem: form.appendComboItem,
    ...watchedValues,
    comboComponentOptions: formOptions.comboComponentOptions,
    comboFields: form.comboFields,
    comboItemsRootError: extractComboRootError(form.errors),
    componentProductsById: formOptions.componentProductsById,
    control: form.control,
    errors: form.errors,
    ...formActions,
    manualMeasurementMode: form.measurementMode === customMeasurementOption,
    measurementMode: form.measurementMode,
    packagingPresetOptions: formOptions.packagingPresetOptions,
    register: form.register,
    removeComboItem: form.removeComboItem,
    selectedPreset: form.selectedPreset,
    selectedPresetIsManual: form.selectedPreset === manualPackagingOption,
    setValue: form.setValue,
  }
}

export type ProductFormController = ReturnType<typeof useProductFormController>
