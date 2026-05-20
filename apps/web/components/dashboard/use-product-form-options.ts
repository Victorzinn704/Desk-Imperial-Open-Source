'use client'

import { useMemo } from 'react'
import type { ProductRecord } from '@contracts/contracts'
import { manualPackagingOption, productPackagingPresets } from '@/lib/product-packaging'

type UseProductFormOptionsParams = Readonly<{
  availableProducts: ProductRecord[]
  product: ProductRecord | null
}>

export function useProductFormOptions({ availableProducts, product }: UseProductFormOptionsParams) {
  const componentProducts = useMemo(
    () => availableProducts.filter((item) => item.active && item.id !== product?.id),
    [availableProducts, product?.id],
  )
  const componentProductsById = useMemo(
    () => new Map(componentProducts.map((item) => [item.id, item])),
    [componentProducts],
  )
  const comboComponentOptions = useMemo(
    () => [
      { label: 'Selecione um componente', value: '' },
      ...componentProducts.map((item) => ({
        label: `${item.name} (${item.unitsPerPackage} und/caixa)`,
        value: item.id,
      })),
    ],
    [componentProducts],
  )
  const packagingPresetOptions = useMemo(
    () => [
      { label: 'Selecione uma classe padrão', value: '' },
      ...productPackagingPresets.map((preset) => ({
        label: preset.label,
        value: preset.key,
      })),
      { label: 'Outro', value: manualPackagingOption },
    ],
    [],
  )

  return {
    comboComponentOptions,
    componentProductsById,
    packagingPresetOptions,
  }
}
