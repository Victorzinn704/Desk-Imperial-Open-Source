'use client'

import type { ProductRecord } from '@contracts/contracts'
import type { ProductFormValues } from '@/lib/validation'
import { useProductFormController } from './use-product-form-controller'
import { ProductComboSection, ProductComboToggle } from './product-form-combo-section'
import { ProductIdentitySection } from './product-form-identity-section'
import { ProductFormActions, ProductFormHeader } from './product-form-layout'
import { ProductOperationSection } from './product-form-operation-section'
import { ProductStructureSection } from './product-form-structure-section'

export function ProductForm({
  product,
  availableProducts,
  onSubmit,
  onCancelEdit,
  loading,
  appearance = 'default',
}: Readonly<{
  product: ProductRecord | null
  availableProducts: ProductRecord[]
  onSubmit: (values: ProductFormValues) => void
  onCancelEdit: () => void
  loading?: boolean
  appearance?: 'default' | 'embedded'
}>) {
  const controller = useProductFormController({ availableProducts, onSubmit, product })
  const isEmbedded = appearance === 'embedded'

  return (
    <div className={isEmbedded ? 'min-w-0' : 'imperial-card p-7'}>
      <ProductFormHeader isEmbedded={isEmbedded} product={product} onCancelEdit={onCancelEdit} />

      <form
        className={isEmbedded ? 'space-y-8' : 'mt-6 space-y-5'}
        onSubmit={(event) => void controller.submitForm(event)}
      >
        <ProductIdentitySection appearance={appearance} controller={controller} />
        <ProductStructureSection appearance={appearance} controller={controller} />
        <ProductComboToggle appearance={appearance} controller={controller} />
        <ProductComboSection appearance={appearance} controller={controller} />
        <ProductOperationSection appearance={appearance} controller={controller} />
        <ProductFormActions isEmbedded={isEmbedded} loading={loading} product={product} onCancelEdit={onCancelEdit} />
      </form>
    </div>
  )
}
