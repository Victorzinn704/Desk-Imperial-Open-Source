import { currencyOptions } from '@/lib/currency'
import { isKitchenCategory } from '@/lib/is-kitchen-category'
import { InputField } from '@/components/shared/input-field'
import { SelectField } from '@/components/shared/select-field'
import type { ProductFormController } from './use-product-form-controller'
import { stockLooseUnitsHint } from './product-form.model'
import { ProductSectionHeader } from './product-form-fields'

type ProductOperationSectionProps = Readonly<{
  appearance: 'default' | 'embedded'
  controller: ProductFormController
}>

type OperationSectionFieldProps = Readonly<{
  errors: ProductFormController['errors']
  register: ProductFormController['register']
}>

type OperationStockFieldsProps = Readonly<{
  errors: ProductFormController['errors']
  register: ProductFormController['register']
  unitsPerPackage: ProductFormController['unitsPerPackage']
}>

type OperationKitchenToggleProps = Readonly<{
  categoryValue: ProductFormController['categoryValue']
  isEmbedded: boolean
  requiresKitchenValue: ProductFormController['requiresKitchenValue']
  setValue: ProductFormController['setValue']
}>

function getOperationSectionClassName(isEmbedded: boolean) {
  return isEmbedded ? 'space-y-5 border-t border-dashed border-[var(--border)] pt-6' : 'space-y-5'
}

function OperationSectionHeader({ isEmbedded }: Readonly<{ isEmbedded: boolean }>) {
  if (!isEmbedded) {
    return null
  }

  return (
    <ProductSectionHeader
      description="Preço, custo e estoque ficam agrupados para leitura operacional e decisão rápida."
      eyebrow="Operação"
      title="Preço e estoque"
    />
  )
}

function OperationDescriptionField({ errors, register }: OperationSectionFieldProps) {
  return (
    <InputField
      error={errors.description?.message}
      hint="Use uma descrição curta e objetiva."
      label="Descrição"
      placeholder="Produto base para operação e simulação financeira."
      {...register('description')}
    />
  )
}

function OperationPricingFields({ errors, register }: OperationSectionFieldProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-3">
      <InputField
        error={errors.unitCost?.message}
        label="Custo unitário"
        step="0.01"
        type="number"
        {...register('unitCost')}
      />
      <InputField
        error={errors.unitPrice?.message}
        label="Preço unitário"
        step="0.01"
        type="number"
        {...register('unitPrice')}
      />
      <SelectField error={errors.currency?.message} label="Moeda" options={currencyOptions} {...register('currency')} />
    </div>
  )
}

function OperationStockFields({ errors, register, unitsPerPackage }: OperationStockFieldsProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <InputField
        error={errors.stockPackages?.message}
        hint="Se comprou uma caixa ou fardo fechado, registre aqui."
        label="Caixas / fardos em estoque"
        step="1"
        type="number"
        {...register('stockPackages')}
      />
      <InputField
        error={errors.stockLooseUnits?.message}
        hint={stockLooseUnitsHint(unitsPerPackage)}
        label="Unidades avulsas em estoque"
        step="1"
        type="number"
        {...register('stockLooseUnits')}
      />
    </div>
  )
}

function OperationLowStockField({ errors, register }: OperationSectionFieldProps) {
  return (
    <InputField
      error={errors.lowStockThreshold?.message}
      hint="Quando o estoque chegar nesse número (ou abaixo), o produto aparece como alerta no dashboard. Deixe em branco para desativar."
      label="Limite de estoque baixo (opcional)"
      placeholder="Ex.: 20"
      step="1"
      type="number"
      {...register('lowStockThreshold')}
    />
  )
}

function OperationKitchenToggle({
  categoryValue,
  isEmbedded,
  requiresKitchenValue,
  setValue,
}: OperationKitchenToggleProps) {
  return (
    <div
      className={
        isEmbedded
          ? 'grid gap-3 border-t border-dashed border-[var(--border)] pt-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center'
          : 'imperial-card-soft flex items-center justify-between gap-4 px-4 py-4'
      }
    >
      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-[var(--text-primary)]">Envia para a cozinha</p>
          {categoryValue && isKitchenCategory(categoryValue) ? (
            <span className="rounded-full border border-[var(--accent-soft)] bg-[var(--accent-soft)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--accent,#008cff)]">
              auto
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-xs text-[var(--text-soft)]">
          Ative para que os pedidos desse item entrem automaticamente na fila da cozinha (KDS).
        </p>
      </div>
      <button
        aria-checked={requiresKitchenValue}
        className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
        role="switch"
        style={{ background: requiresKitchenValue ? 'var(--accent, #008cff)' : 'var(--surface-muted)' }}
        type="button"
        onClick={() => setValue('requiresKitchen', !requiresKitchenValue, { shouldDirty: true })}
      >
        <span
          className="absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform"
          style={{ transform: requiresKitchenValue ? 'translateX(20px)' : 'translateX(0)' }}
        />
      </button>
    </div>
  )
}

export function ProductOperationSection({ appearance, controller }: ProductOperationSectionProps) {
  const { categoryValue, errors, register, requiresKitchenValue, setValue, unitsPerPackage } = controller
  const isEmbedded = appearance === 'embedded'

  return (
    <section className={getOperationSectionClassName(isEmbedded)}>
      <OperationSectionHeader isEmbedded={isEmbedded} />
      <OperationDescriptionField errors={errors} register={register} />
      <OperationPricingFields errors={errors} register={register} />
      <OperationStockFields errors={errors} register={register} unitsPerPackage={unitsPerPackage} />
      <OperationLowStockField errors={errors} register={register} />
      <OperationKitchenToggle
        categoryValue={categoryValue}
        isEmbedded={isEmbedded}
        requiresKitchenValue={requiresKitchenValue}
        setValue={setValue}
      />
    </section>
  )
}
