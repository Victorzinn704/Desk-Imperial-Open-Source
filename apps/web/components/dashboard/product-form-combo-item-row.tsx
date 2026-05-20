import { useWatch } from 'react-hook-form'
import { InputField } from '@/components/shared/input-field'
import { SelectField } from '@/components/shared/select-field'
import type { ProductFormController } from './use-product-form-controller'

export type ProductComboItemRowProps = Readonly<{
  comboComponentOptions: ProductFormController['comboComponentOptions']
  componentProductsById: ProductFormController['componentProductsById']
  control: ProductFormController['control']
  errors: ProductFormController['errors']
  index: number
  isEmbedded: boolean
  register: ProductFormController['register']
  removeComboItem: ProductFormController['removeComboItem']
}>

function getComboItemClassName(isEmbedded: boolean) {
  return isEmbedded
    ? 'space-y-2 rounded-[12px] border border-dashed border-[var(--border)] px-3 py-3'
    : 'space-y-2 rounded-[12px] border border-[var(--border)] bg-[var(--surface-muted)] p-3'
}

function useComboItemEquivalentLabel({
  componentProductsById,
  control,
  index,
}: Pick<ProductComboItemRowProps, 'componentProductsById' | 'control' | 'index'>) {
  const selectedProductId = useWatch({ control, name: `comboItems.${index}.productId` as const })
  const selectedProduct = selectedProductId ? componentProductsById.get(selectedProductId) : null
  const quantityPackages = Number(useWatch({ control, name: `comboItems.${index}.quantityPackages` as const }) ?? 0)
  const quantityUnits = Number(useWatch({ control, name: `comboItems.${index}.quantityUnits` as const }) ?? 0)
  const unitsPerPackage = Math.max(1, selectedProduct?.unitsPerPackage ?? 1)
  const totalUnits = quantityPackages * unitsPerPackage + quantityUnits

  return selectedProduct
    ? `${selectedProduct.name}: ${totalUnits} und equivalentes`
    : 'Selecione um produto para calcular o equivalente.'
}

function ComboQuantityFields({
  errors,
  index,
  register,
}: Pick<ProductComboItemRowProps, 'errors' | 'index' | 'register'>) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <InputField
        error={errors.comboItems?.[index]?.quantityPackages?.message}
        label="Caixas / fardos"
        step="1"
        type="number"
        {...register(`comboItems.${index}.quantityPackages` as const)}
      />
      <InputField
        error={errors.comboItems?.[index]?.quantityUnits?.message}
        label="Unidades avulsas"
        step="1"
        type="number"
        {...register(`comboItems.${index}.quantityUnits` as const)}
      />
    </div>
  )
}

function ComboItemFooter({
  equivalentLabel,
  index,
  removeComboItem,
}: Readonly<{
  equivalentLabel: string
  index: number
  removeComboItem: ProductFormController['removeComboItem']
}>) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs text-[var(--text-soft)]">{equivalentLabel}</p>
      <button
        className="rounded-[8px] border border-[rgba(248,113,113,0.35)] px-2.5 py-1 text-[11px] font-semibold text-[#f87171] transition hover:bg-[rgba(248,113,113,0.12)]"
        type="button"
        onClick={() => removeComboItem(index)}
      >
        Remover
      </button>
    </div>
  )
}

export function ProductComboItemRow({
  comboComponentOptions,
  componentProductsById,
  control,
  errors,
  index,
  isEmbedded,
  register,
  removeComboItem,
}: ProductComboItemRowProps) {
  const equivalentLabel = useComboItemEquivalentLabel({ componentProductsById, control, index })

  return (
    <div className={getComboItemClassName(isEmbedded)}>
      <SelectField
        error={errors.comboItems?.[index]?.productId?.message}
        label={`Componente ${index + 1}`}
        options={comboComponentOptions}
        {...register(`comboItems.${index}.productId` as const)}
      />
      <ComboQuantityFields errors={errors} index={index} register={register} />
      <ComboItemFooter equivalentLabel={equivalentLabel} index={index} removeComboItem={removeComboItem} />
    </div>
  )
}
