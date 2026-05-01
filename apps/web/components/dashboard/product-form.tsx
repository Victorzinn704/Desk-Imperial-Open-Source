'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ProductRecord } from '@contracts/contracts'
import { currencyOptions } from '@/lib/currency'
import {
  buildStockTotalUnits,
  customMeasurementOption,
  findPackagingPresetByLabel,
  formatMeasurement,
  getMeasurementOption,
  manualPackagingOption,
  measurementUnitOptions,
  productPackagingPresets,
} from '@/lib/product-packaging'
import { type ProductFormInputValues, type ProductFormValues, productSchema } from '@/lib/validation'
import { isKitchenCategory } from '@/lib/is-kitchen-category'
import { Button } from '@/components/shared/button'
import { InputField } from '@/components/shared/input-field'
import { SelectField } from '@/components/shared/select-field'

const emptyValues: ProductFormInputValues = {
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

function applyPackagingPreset(
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
  if (!preset) {return}

  setValue('packagingClass', preset.label, { shouldDirty: true, shouldValidate: true })
  setValue('measurementUnit', preset.measurementUnit, { shouldDirty: true, shouldValidate: true })
  setValue('measurementValue', preset.measurementValue, { shouldDirty: true, shouldValidate: true })
  setValue('unitsPerPackage', preset.unitsPerPackage, { shouldDirty: true, shouldValidate: true })
  setMeasurementMode(preset.measurementUnit)
}

function buildProductResetValues(product: ProductRecord): ProductFormInputValues {
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

function extractComboRootError(errors: { comboItems?: { message?: string } }): string | undefined {
  return typeof errors.comboItems?.message === 'string' ? errors.comboItems.message : undefined
}

function stockLooseUnitsHint(unitsPerPackage: number): string {
  return unitsPerPackage > 1
    ? `Use para unidades soltas. Aqui o máximo natural é ${unitsPerPackage - 1} und antes de virar outra caixa/fardo.`
    : 'Se esse item entra solto no estoque, deixe caixa/fardo em 0 e registre tudo aqui.'
}

function PackagingClassField({
  isManual,
  error,
  value,
  register,
  appearance = 'default',
}: {
  isManual: boolean
  error?: string
  value: string
  register: ReturnType<typeof useForm<ProductFormInputValues>>['register']
  appearance?: 'default' | 'embedded'
}) {
  if (isManual) {
    return (
      <InputField
        error={error}
        hint="Descreva como esse item entra no estoque: caixa, fardo, pacote ou outro formato."
        label="Classe personalizada"
        placeholder="Ex.: Caixa com 10 und de 1kg"
        {...register('packagingClass')}
      />
    )
  }
  return (
    <>
      {appearance === 'embedded' ? (
        <div className="grid gap-3 border-t border-dashed border-[var(--border)] pt-4 sm:grid-cols-2">
          <InlineReading label="classe ativa" value={value || 'Selecione um padrão para preencher automaticamente.'} />
          <InlineReading label="origem" value="perfil pronto de cadastro" />
        </div>
      ) : (
        <div className="imperial-card-soft px-4 py-4 text-sm text-[var(--text-soft)]">
          <p className="font-medium text-[var(--text-primary)]">Classe ativa</p>
          <p className="mt-2">{value || 'Selecione um dos padrões para preencher automaticamente.'}</p>
        </div>
      )}
      <input type="hidden" value={value} {...register('packagingClass')} />
    </>
  )
}

function MeasurementUnitField({
  isManual,
  error,
  value,
  register,
}: {
  isManual: boolean
  error?: string
  value: string
  register: ReturnType<typeof useForm<ProductFormInputValues>>['register']
}) {
  if (isManual) {
    return (
      <InputField
        error={error}
        label="Outra unidade de medida"
        placeholder="Ex.: pacote, saco, porção"
        {...register('measurementUnit')}
      />
    )
  }
  return <input type="hidden" value={value} {...register('measurementUnit')} />
}

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
  const [selectedPreset, setSelectedPreset] = useState('')
  const [measurementMode, setMeasurementMode] = useState('UN')
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<ProductFormInputValues, undefined, ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: emptyValues,
  })
  const { fields: comboFields, append: appendComboItem, remove: removeComboItem } = useFieldArray({
    control,
    name: 'comboItems',
  })

  const packagingClassValue = watch('packagingClass')
  const measurementUnitValue = watch('measurementUnit')
  const measurementValue = Number(watch('measurementValue') ?? 1)
  const unitsPerPackage = Number(watch('unitsPerPackage') ?? 1)
  const isComboValue = watch('isCombo')
  const stockPackages = Number(watch('stockPackages') ?? 0)
  const stockLooseUnits = Number(watch('stockLooseUnits') ?? 0)
  const requiresKitchenValue = watch('requiresKitchen')
  const categoryValue = watch('category')
  const comboItemsRootError = extractComboRootError(errors)
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

  // Auto-toggle requiresKitchen when category name suggests food/prep
  useEffect(() => {
    if (!categoryValue) {return}
    const shouldBeKitchen = isKitchenCategory(categoryValue)
    // Only auto-set to true — never force to false (user override respected)
    if (shouldBeKitchen && !requiresKitchenValue) {
      setValue('requiresKitchen', true, { shouldDirty: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryValue])

  const selectedPresetIsManual = selectedPreset === manualPackagingOption
  const manualMeasurementMode = measurementMode === customMeasurementOption
  const calculatedStockTotal = buildStockTotalUnits(stockPackages, stockLooseUnits, unitsPerPackage)
  const isEmbedded = appearance === 'embedded'

  const resetFormToDefaults = useCallback(() => {
    reset(emptyValues)
    setSelectedPreset('')
    setMeasurementMode('UN')
  }, [reset])

  useEffect(() => {
    if (!product) {
      resetFormToDefaults()
      return
    }

    const matchedPreset = findPackagingPresetByLabel(product.packagingClass)
    const nextMeasurementMode = getMeasurementOption(product.measurementUnit)

    reset(buildProductResetValues(product))
    setSelectedPreset(matchedPreset?.key ?? manualPackagingOption)
    setMeasurementMode(nextMeasurementMode)
  }, [product, reset, resetFormToDefaults])

  const packagingPresetOptions = [
    { label: 'Selecione uma classe padrão', value: '' },
    ...productPackagingPresets.map((preset) => ({
      label: preset.label,
      value: preset.key,
    })),
    { label: 'Outro', value: manualPackagingOption },
  ]

  const handlePresetChange = (presetKey: string) => {
    setSelectedPreset(presetKey)
    applyPackagingPreset(presetKey, packagingClassValue, setValue, setMeasurementMode)
  }

  const handleMeasurementModeChange = (nextValue: string) => {
    setMeasurementMode(nextValue)
    const unit = nextValue === customMeasurementOption ? '' : nextValue
    setValue('measurementUnit', unit, { shouldDirty: true, shouldValidate: true })
  }

  return (
    <div className={isEmbedded ? 'min-w-0' : 'imperial-card p-7'}>
      {isEmbedded ? null : (
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              {product ? 'Editar produto' : 'Novo produto'}
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
              {product ? 'Atualize os dados do portfólio.' : 'Cadastre um item para o dashboard.'}
            </h2>
          </div>
          {product ? (
            <Button size="sm" type="button" variant="ghost" onClick={onCancelEdit}>
              Cancelar
            </Button>
          ) : null}
        </div>
      )}

      <form
        className={isEmbedded ? 'space-y-8' : 'mt-6 space-y-5'}
        onSubmit={handleSubmit((values) => {
          onSubmit(values)
          if (!product) {resetFormToDefaults()}
        })}
      >
        <section className="space-y-5">
          {isEmbedded ? (
            <ProductSectionHeader
              description="Nome, categoria e classe de cadastro entram primeiro, sem abrir blocos visuais desnecessários."
              eyebrow="Identidade"
              title="Base do produto"
            />
          ) : null}

          <div className="grid gap-5 sm:grid-cols-2">
            <InputField error={errors.name?.message} label="Nome" placeholder="Produto Alpha" {...register('name')} />
            <InputField
              error={errors.brand?.message}
              label="Marca"
              placeholder="Coca-Cola, Brahma, Guarana..."
              {...register('brand')}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <InputField
              error={errors.barcode?.message}
              hint="Aceita EAN com 8, 12, 13 ou 14 dígitos."
              inputMode="numeric"
              label="Código de barras"
              placeholder="7891234567890"
              {...register('barcode')}
            />
            <InputField
              error={errors.category?.message}
              label="Categoria"
              placeholder="Bebidas"
              {...register('category')}
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField
              error={!selectedPresetIsManual ? errors.packagingClass?.message : undefined}
              hint="Escolha um perfil pronto ou use Outro para criar um formato próprio."
              label="Classe de cadastro"
              options={packagingPresetOptions}
              value={selectedPreset}
              onChange={(event) => handlePresetChange(event.currentTarget.value)}
            />
          </div>

          <PackagingClassField
            appearance={appearance}
            error={errors.packagingClass?.message}
            isManual={selectedPresetIsManual}
            register={register}
            value={packagingClassValue}
          />
        </section>

        <section className={isEmbedded ? 'space-y-5 border-t border-dashed border-[var(--border)] pt-6' : 'space-y-5'}>
          {isEmbedded ? (
            <ProductSectionHeader
              description="A estrutura de medida e embalagem fica num bloco contínuo, com leitura rápida do impacto no estoque."
              eyebrow="Estrutura"
              title="Medidas e embalagem"
            />
          ) : null}

          <div className="grid gap-5 sm:grid-cols-[1.1fr_0.9fr_0.9fr]">
            <SelectField
              error={manualMeasurementMode ? undefined : errors.measurementUnit?.message}
              hint="Use ml, L, kg, g, unidade ou crie outra medida."
              label="Medida"
              options={measurementUnitOptions}
              value={measurementMode}
              onChange={(event) => handleMeasurementModeChange(event.currentTarget.value)}
            />
            <InputField
              error={errors.measurementValue?.message}
              hint="Ex.: cada lata tem 350 ml, cada garrafa tem 2 L, cada pacote tem 1 kg."
              label="Conteúdo por unidade"
              placeholder="350"
              step="0.01"
              type="number"
              {...register('measurementValue')}
            />
            <InputField
              error={errors.unitsPerPackage?.message}
              hint="Quantidade dentro da caixa, fardo ou pacote."
              label="Qtde por caixa/fardo"
              step="1"
              type="number"
              {...register('unitsPerPackage')}
            />
          </div>

          <div
            className={
              isEmbedded
                ? 'grid gap-3 border-t border-dashed border-[var(--border)] pt-4 sm:grid-cols-3'
                : 'imperial-card-soft px-4 py-4 text-sm text-[var(--text-soft)]'
            }
          >
            {isEmbedded ? (
              <>
                <InlineReading label="cada unidade" value={formatMeasurement(measurementValue, measurementUnitValue || 'UN')} />
                <InlineReading label="cada caixa/fardo" value={`${unitsPerPackage} und`} />
                <InlineReading label="estoque calculado" value={`${calculatedStockTotal} und`} />
              </>
            ) : (
              <>
                <p className="font-medium text-[var(--text-primary)]">Leitura rápida do cadastro</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div className="imperial-card-stat px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">Cada unidade</p>
                    <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">
                      {formatMeasurement(measurementValue, measurementUnitValue || 'UN')}
                    </p>
                  </div>
                  <div className="imperial-card-stat px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">Cada caixa/fardo</p>
                    <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">{unitsPerPackage} und</p>
                  </div>
                  <div className="imperial-card-stat px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">Estoque calculado</p>
                    <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">{calculatedStockTotal} und</p>
                  </div>
                </div>
              </>
            )}
          </div>

          <MeasurementUnitField
            error={errors.measurementUnit?.message}
            isManual={manualMeasurementMode}
            register={register}
            value={measurementUnitValue}
          />
        </section>

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
            className="relative shrink-0 h-6 w-11 rounded-full transition-colors"
            role="switch"
            style={{ background: isComboValue ? 'var(--accent, #008cff)' : 'var(--surface-muted)' }}
            type="button"
            onClick={() => setValue('isCombo', !isComboValue, { shouldDirty: true, shouldValidate: true })}
          >
            <span
              className="absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform"
              style={{ transform: isComboValue ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </button>
        </div>

        {isComboValue ? (
          <section
            className={
              isEmbedded
                ? 'space-y-4 border-t border-dashed border-[var(--border)] pt-6'
                : 'imperial-card-soft space-y-4 px-4 py-4'
            }
          >
            <InputField
              error={errors.comboDescription?.message}
              hint="Descreva rapidamente o que vem no combo para o operador."
              label="Descrição do combo"
              placeholder="Ex.: 1 hambúrguer + 1 batata + 1 refrigerante lata"
              {...register('comboDescription')}
            />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[var(--text-primary)]">Componentes do combo</p>
                <button
                  className="rounded-[10px] border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-soft)]"
                  type="button"
                  onClick={() =>
                    appendComboItem({
                      productId: '',
                      quantityPackages: 0,
                      quantityUnits: 1,
                    })
                  }
                >
                  Adicionar item
                </button>
              </div>

              {comboItemsRootError ? <p className="text-xs text-[var(--danger)]">{comboItemsRootError}</p> : null}

              {comboFields.length === 0 ? (
                <div className="rounded-[12px] border border-dashed border-[var(--border)] px-4 py-3 text-xs text-[var(--text-soft)]">
                  Adicione os produtos que fazem parte do combo para habilitar a conversão por métrica.
                </div>
              ) : null}

              {comboFields.map((field, index) => {
                const selectedProductId = watch(`comboItems.${index}.productId` as const)
                const selectedProduct = selectedProductId ? componentProductsById.get(selectedProductId) : null
                const quantityPackages = Number(watch(`comboItems.${index}.quantityPackages` as const) ?? 0)
                const quantityUnits = Number(watch(`comboItems.${index}.quantityUnits` as const) ?? 0)
                const unitsPerPackageForComponent = Math.max(1, selectedProduct?.unitsPerPackage ?? 1)
                const totalUnitsForComponent = quantityPackages * unitsPerPackageForComponent + quantityUnits

                return (
                  <div
                    className={
                      isEmbedded
                        ? 'space-y-2 rounded-[12px] border border-dashed border-[var(--border)] px-3 py-3'
                        : 'space-y-2 rounded-[12px] border border-[var(--border)] bg-[var(--surface-muted)] p-3'
                    }
                    key={field.id}
                  >
                    <SelectField
                      error={errors.comboItems?.[index]?.productId?.message}
                      label={`Componente ${index + 1}`}
                      options={comboComponentOptions}
                      {...register(`comboItems.${index}.productId` as const)}
                    />
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
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-[var(--text-soft)]">
                        {selectedProduct
                          ? `${selectedProduct.name}: ${totalUnitsForComponent} und equivalentes`
                          : 'Selecione um produto para calcular o equivalente.'}
                      </p>
                      <button
                        className="rounded-[8px] border border-[rgba(248,113,113,0.35)] px-2.5 py-1 text-[11px] font-semibold text-[#f87171] transition hover:bg-[rgba(248,113,113,0.12)]"
                        type="button"
                        onClick={() => removeComboItem(index)}
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ) : null}

        <section className={isEmbedded ? 'space-y-5 border-t border-dashed border-[var(--border)] pt-6' : 'space-y-5'}>
          {isEmbedded ? (
            <ProductSectionHeader
              description="Preço, custo e estoque ficam agrupados para leitura operacional e decisão rápida."
              eyebrow="Operação"
              title="Preço e estoque"
            />
          ) : null}

          <InputField
            error={errors.description?.message}
            hint="Use uma descrição curta e objetiva."
            label="Descrição"
            placeholder="Produto base para operação e simulação financeira."
            {...register('description')}
          />

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
            <SelectField
              error={errors.currency?.message}
              label="Moeda"
              options={currencyOptions}
              {...register('currency')}
            />
          </div>

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

          <InputField
            error={errors.lowStockThreshold?.message}
            hint="Quando o estoque chegar nesse número (ou abaixo), o produto aparece como alerta no dashboard. Deixe em branco para desativar."
            label="Limite de estoque baixo (opcional)"
            placeholder="Ex.: 20"
            step="1"
            type="number"
            {...register('lowStockThreshold')}
          />

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
                {categoryValue && isKitchenCategory(categoryValue) && (
                  <span className="rounded-full border border-[var(--accent-soft)] bg-[var(--accent-soft)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--accent,#008cff)]">
                    auto
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-[var(--text-soft)]">
                Ative para que os pedidos desse item entrem automaticamente na fila da cozinha (KDS).
              </p>
            </div>
            <button
              aria-checked={requiresKitchenValue}
              className="relative shrink-0 h-6 w-11 rounded-full transition-colors"
              role="switch"
            style={{ background: requiresKitchenValue ? 'var(--accent, #008cff)' : 'var(--surface-muted)' }}
              type="button"
              onClick={() => setValue('requiresKitchen', !requiresKitchenValue, { shouldDirty: true })}
            >
              <span
                className="absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform"
                style={{ transform: requiresKitchenValue ? 'translateX(20px)' : 'translateX(0)' }}
              />
            </button>
          </div>
        </section>

        {isEmbedded ? (
          <div className="flex flex-col-reverse gap-3 border-t border-dashed border-[var(--border)] pt-6 sm:flex-row sm:items-center sm:justify-end">
            <Button type="button" variant="ghost" onClick={onCancelEdit}>
              Cancelar
            </Button>
            <Button loading={loading} size="lg" type="submit">
              {product ? 'Salvar alterações' : 'Cadastrar produto'}
            </Button>
          </div>
        ) : (
          <Button fullWidth loading={loading} size="lg" type="submit">
            {product ? 'Salvar alterações' : 'Cadastrar produto'}
          </Button>
        )}
      </form>
    </div>
  )
}

function ProductSectionHeader({
  eyebrow,
  title,
  description,
}: Readonly<{
  eyebrow: string
  title: string
  description: string
}>) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">{eyebrow}</p>
      <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
      <p className="text-sm leading-6 text-[var(--text-soft)]">{description}</p>
    </div>
  )
}

function InlineReading({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">{label}</p>
      <p className="text-sm font-medium text-[var(--text-primary)]">{value}</p>
    </div>
  )
}
