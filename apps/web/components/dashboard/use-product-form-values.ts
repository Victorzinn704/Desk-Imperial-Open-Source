'use client'

import { type Control, useWatch } from 'react-hook-form'
import { buildStockTotalUnits } from '@/lib/product-packaging'
import type { ProductFormInputValues, ProductFormValues } from '@/lib/validation'

export function useProductFormValues(control: Control<ProductFormInputValues, undefined, ProductFormValues>) {
  const packagingClassValue = useWatch({ control, name: 'packagingClass' }) ?? ''
  const measurementUnitValue = useWatch({ control, name: 'measurementUnit' }) ?? ''
  const measurementValue = Number(useWatch({ control, name: 'measurementValue' }) ?? 1)
  const unitsPerPackage = Number(useWatch({ control, name: 'unitsPerPackage' }) ?? 1)
  const isComboValue = Boolean(useWatch({ control, name: 'isCombo' }))
  const stockPackages = Number(useWatch({ control, name: 'stockPackages' }) ?? 0)
  const stockLooseUnits = Number(useWatch({ control, name: 'stockLooseUnits' }) ?? 0)
  const requiresKitchenValue = Boolean(useWatch({ control, name: 'requiresKitchen' }))
  const categoryValue = useWatch({ control, name: 'category' }) ?? ''

  return {
    calculatedStockTotal: buildStockTotalUnits(stockPackages, stockLooseUnits, unitsPerPackage),
    categoryValue,
    isComboValue,
    measurementUnitValue,
    measurementValue,
    packagingClassValue,
    requiresKitchenValue,
    stockLooseUnits,
    unitsPerPackage,
  }
}

export type ProductFormWatchedValues = ReturnType<typeof useProductFormValues>
