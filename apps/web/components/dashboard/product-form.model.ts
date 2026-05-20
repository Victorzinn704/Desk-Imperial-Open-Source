import type { ProductRecord } from '@contracts/contracts'
import { manualPackagingOption, productPackagingPresets } from '@/lib/product-packaging'
import type { ProductFormInputValues } from '@/lib/validation'

export const emptyValues: ProductFormInputValues = {
  name: '',
  barcode: '',
  brand: '',
  category: '',
  packagingClass: '',
  measurementUnit: 'UN',
  measurementValue: 1,
  unitsPerPackage: 1,
  isCombo: false,
  comboDescription: '',
  comboItems: [],
  description: '',
  unitCost: 0,
  unitPrice: 0,
  currency: 'BRL',
  stockPackages: 0,
  stockLooseUnits: 0,
  requiresKitchen: false,
  lowStockThreshold: null,
}

export function applyPackagingPreset(
  presetKey: string,
  currentPackagingClass: string,
  setValue: (
    name: keyof ProductFormInputValues,
    value: unknown,
    opts?: { shouldDirty?: boolean; shouldValidate?: boolean },
  ) => void,
  setMeasurementMode: (mode: string) => void,
) {
  if (!presetKey) {
    setValue('packagingClass', '', { shouldDirty: true, shouldValidate: true })
    return
  }

  if (presetKey === manualPackagingOption) {
    if (!currentPackagingClass) {
      setValue('packagingClass', '', { shouldDirty: true, shouldValidate: true })
    }
    return
  }

  const preset = productPackagingPresets.find((entry) => entry.key === presetKey)
  if (!preset) {
    return
  }

  setValue('packagingClass', preset.label, { shouldDirty: true, shouldValidate: true })
  setValue('measurementUnit', preset.measurementUnit, { shouldDirty: true, shouldValidate: true })
  setValue('measurementValue', preset.measurementValue, { shouldDirty: true, shouldValidate: true })
  setValue('unitsPerPackage', preset.unitsPerPackage, { shouldDirty: true, shouldValidate: true })
  setMeasurementMode(preset.measurementUnit)
}

export function buildProductResetValues(product: ProductRecord): ProductFormInputValues {
  return {
    name: product.name,
    barcode: product.barcode ?? '',
    brand: product.brand ?? '',
    category: product.category,
    packagingClass: product.packagingClass,
    measurementUnit: product.measurementUnit,
    measurementValue: product.measurementValue,
    unitsPerPackage: product.unitsPerPackage,
    isCombo: product.isCombo ?? false,
    comboDescription: product.comboDescription ?? '',
    comboItems:
      product.comboItems?.map((item) => ({
        productId: item.componentProductId,
        quantityPackages: item.quantityPackages,
        quantityUnits: item.quantityUnits,
      })) ?? [],
    description: product.description ?? '',
    unitCost: product.originalUnitCost,
    unitPrice: product.originalUnitPrice,
    currency: product.currency,
    stockPackages: product.stockPackages,
    stockLooseUnits: product.stockLooseUnits,
    requiresKitchen: product.requiresKitchen ?? false,
    lowStockThreshold: product.lowStockThreshold ?? null,
  }
}

export function extractComboRootError(errors: { comboItems?: { message?: string } }): string | undefined {
  return typeof errors.comboItems?.message === 'string' ? errors.comboItems.message : undefined
}

export function stockLooseUnitsHint(unitsPerPackage: number): string {
  return unitsPerPackage > 1
    ? `Use para unidades soltas. Aqui o máximo natural é ${unitsPerPackage - 1} und antes de virar outra caixa/fardo.`
    : 'Se esse item entra solto no estoque, deixe caixa/fardo em 0 e registre tudo aqui.'
}
