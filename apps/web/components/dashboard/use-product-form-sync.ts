'use client'

import { useCallback, useEffect } from 'react'
import type { UseFormReset, UseFormSetValue } from 'react-hook-form'
import type { ProductRecord } from '@contracts/contracts'
import { findPackagingPresetByLabel, getMeasurementOption, manualPackagingOption } from '@/lib/product-packaging'
import { isKitchenCategory } from '@/lib/is-kitchen-category'
import type { ProductFormInputValues } from '@/lib/validation'
import { buildProductResetValues, emptyValues } from './product-form.model'
import type { ProductFormBase } from './use-product-form-base'
import type { ProductFormWatchedValues } from './use-product-form-values'

type KitchenAutoToggleParams = Readonly<{
  categoryValue: string
  requiresKitchenValue: boolean
  setValue: UseFormSetValue<ProductFormInputValues>
}>

type ProductResetSyncParams = Readonly<{
  product: ProductRecord | null
  reset: UseFormReset<ProductFormInputValues>
  setMeasurementMode: (mode: string) => void
  setSelectedPreset: (preset: string) => void
}>

type ProductFormEffectsParams = Readonly<{
  form: Pick<ProductFormBase, 'reset' | 'setMeasurementMode' | 'setSelectedPreset' | 'setValue'>
  product: ProductRecord | null
  watchedValues: Pick<ProductFormWatchedValues, 'categoryValue' | 'requiresKitchenValue'>
}>

export function useKitchenAutoToggle({ categoryValue, requiresKitchenValue, setValue }: KitchenAutoToggleParams) {
  useEffect(() => {
    if (!categoryValue) {
      return
    }
    if (isKitchenCategory(categoryValue) && !requiresKitchenValue) {
      setValue('requiresKitchen', true, { shouldDirty: true })
    }
  }, [categoryValue, requiresKitchenValue, setValue])
}

export function useProductResetSync({ product, reset, setMeasurementMode, setSelectedPreset }: ProductResetSyncParams) {
  const resetFormToDefaults = useCallback(() => {
    reset(emptyValues)
    setSelectedPreset('')
    setMeasurementMode('UN')
  }, [reset, setMeasurementMode, setSelectedPreset])

  useEffect(() => {
    if (!product) {
      resetFormToDefaults()
      return
    }

    const matchedPreset = findPackagingPresetByLabel(product.packagingClass)

    reset(buildProductResetValues(product))
    setSelectedPreset(matchedPreset?.key ?? manualPackagingOption)
    setMeasurementMode(getMeasurementOption(product.measurementUnit))
  }, [product, reset, resetFormToDefaults, setMeasurementMode, setSelectedPreset])

  return resetFormToDefaults
}

export function useProductFormEffects({ form, product, watchedValues }: ProductFormEffectsParams) {
  const resetFormToDefaults = useProductResetSync({
    product,
    reset: form.reset,
    setMeasurementMode: form.setMeasurementMode,
    setSelectedPreset: form.setSelectedPreset,
  })
  useKitchenAutoToggle({
    categoryValue: watchedValues.categoryValue,
    requiresKitchenValue: watchedValues.requiresKitchenValue,
    setValue: form.setValue,
  })

  return resetFormToDefaults
}
