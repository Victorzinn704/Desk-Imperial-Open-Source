import { InputField } from '@/components/shared/input-field'
import { ProductComboItemRow } from './product-form-combo-item-row'
import type { ProductFormController } from './use-product-form-controller'

type ProductComboSectionProps = Readonly<{
  appearance: 'default' | 'embedded'
  controller: ProductFormController
}>

export function ProductComboToggle({ appearance, controller }: ProductComboSectionProps) {
  const { isComboValue, setValue } = controller
  const isEmbedded = appearance === 'embedded'

  return (
    <div
      className={
        isEmbedded
          ? 'grid gap-3 border-t border-dashed border-[var(--border)] pt-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center'
          : 'imperial-card-soft flex items-center justify-between gap-4 px-4 py-4'
      }
    >
      <div>
        <p className="text-sm font-medium text-[var(--text-primary)]">Produto do tipo combo</p>
        <p className="mt-0.5 text-xs text-[var(--text-soft)]">
          Ative para montar composição de itens por caixa/unidade para venda em combo no PDV.
        </p>
      </div>
      <button
        aria-checked={isComboValue}
        className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
        role="switch"
        style={{ background: isComboValue ? 'var(--accent, #008cff)' : 'var(--surface-muted)' }}
        type="button"
        onClick={() => setValue('isCombo', !isComboValue, { shouldDirty: true, shouldValidate: true })}
      >
        <span
          className="absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform"
          style={{ transform: isComboValue ? 'translateX(20px)' : 'translateX(0)' }}
        />
      </button>
    </div>
  )
}

function ComboItemsHeader({
  appendComboItem,
}: Readonly<{ appendComboItem: ProductFormController['appendComboItem'] }>) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm font-medium text-[var(--text-primary)]">Componentes do combo</p>
      <button
        className="rounded-[10px] border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-soft)]"
        type="button"
        onClick={() => appendComboItem({ productId: '', quantityPackages: 0, quantityUnits: 1 })}
      >
        Adicionar item
      </button>
    </div>
  )
}

function ComboItemsEmptyState({ comboFields }: Pick<ProductFormController, 'comboFields'>) {
  if (comboFields.length > 0) {
    return null
  }

  return (
    <div className="rounded-[12px] border border-dashed border-[var(--border)] px-4 py-3 text-xs text-[var(--text-soft)]">
      Adicione os produtos que fazem parte do combo para habilitar a conversão por métrica.
    </div>
  )
}

function ComboItemsList({
  controller,
  isEmbedded,
}: Readonly<{ controller: ProductFormController; isEmbedded: boolean }>) {
  return (
    <>
      {controller.comboFields.map((field, index) => (
        <ProductComboItemRow
          comboComponentOptions={controller.comboComponentOptions}
          componentProductsById={controller.componentProductsById}
          control={controller.control}
          errors={controller.errors}
          index={index}
          isEmbedded={isEmbedded}
          key={field.id}
          register={controller.register}
          removeComboItem={controller.removeComboItem}
        />
      ))}
    </>
  )
}

function ComboItemsEditor({
  controller,
  isEmbedded,
}: Readonly<{ controller: ProductFormController; isEmbedded: boolean }>) {
  return (
    <div className="space-y-3">
      <ComboItemsHeader appendComboItem={controller.appendComboItem} />
      {controller.comboItemsRootError ? (
        <p className="text-xs text-[var(--danger)]">{controller.comboItemsRootError}</p>
      ) : null}
      <ComboItemsEmptyState comboFields={controller.comboFields} />
      <ComboItemsList controller={controller} isEmbedded={isEmbedded} />
    </div>
  )
}

export function ProductComboSection({ appearance, controller }: ProductComboSectionProps) {
  const isEmbedded = appearance === 'embedded'

  if (!controller.isComboValue) {
    return null
  }

  return (
    <section
      className={
        isEmbedded
          ? 'space-y-4 border-t border-dashed border-[var(--border)] pt-6'
          : 'imperial-card-soft space-y-4 px-4 py-4'
      }
    >
      <InputField
        error={controller.errors.comboDescription?.message}
        hint="Descreva rapidamente o que vem no combo para o operador."
        label="Descrição do combo"
        placeholder="Ex.: 1 hambúrguer + 1 batata + 1 refrigerante lata"
        {...controller.register('comboDescription')}
      />
      <ComboItemsEditor controller={controller} isEmbedded={isEmbedded} />
    </section>
  )
}
