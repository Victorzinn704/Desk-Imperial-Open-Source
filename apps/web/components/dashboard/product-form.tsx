'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ProductRecord } from '@contracts/contracts'
import { currencyOptions } from '@/lib/currency'
import { buildStockTotalUnits, formatMeasurement } from '@/lib/product-packaging'
import {
  customMeasurementOption,
  findPackagingPresetByLabel,
  getMeasurementOption,
  manualPackagingOption,
  measurementUnitOptions,
  productPackagingPresets,
} from '@/lib/product-packaging'
import { productSchema, type ProductFormInputValues, type ProductFormValues } from '@/lib/validation'
import { isKitchenCategory } from '@/lib/is-kitchen-category'
import { Button } from '@/components/shared/button'
import { InputField } from '@/components/shared/input-field'
import { SelectField } from '@/components/shared/select-field'

const emptyValues: ProductFormInputValues = {
  name: '',
  brand: '',
  category: '',
  packagingClass: '',
  measurementUnit: 'UN',
  measurementValue: 1,
  unitsPerPackage: 1,
  description: '',
  unitCost: 0,
  unitPrice: 0,
  currency: 'BRL',
  stockPackages: 0,
  stockLooseUnits: 0,
  requiresKitchen: false,
}

export function ProductForm({
  product,
  onSubmit,
  onCancelEdit,
  loading,
}: Readonly<{
  product: ProductRecord | null
  onSubmit: (values: ProductFormValues) => void
  onCancelEdit: () => void
  loading?: boolean
}>) {
  const [selectedPreset, setSelectedPreset] = useState('')
  const [measurementMode, setMeasurementMode] = useState('UN')
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductFormInputValues, undefined, ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: emptyValues,
  })

  const packagingClassValue = watch('packagingClass')
  const measurementUnitValue = watch('measurementUnit')
  const measurementValue = Number(watch('measurementValue') ?? 1)
  const unitsPerPackage = Number(watch('unitsPerPackage') ?? 1)
  const stockPackages = Number(watch('stockPackages') ?? 0)
  const stockLooseUnits = Number(watch('stockLooseUnits') ?? 0)
  const requiresKitchenValue = watch('requiresKitchen')
  const categoryValue = watch('category')

  // Auto-toggle requiresKitchen when category name suggests food/prep
  useEffect(() => {
    if (!categoryValue) return
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

  useEffect(() => {
    if (!product) {
      reset(emptyValues)
      setSelectedPreset('')
      setMeasurementMode('UN')
      return
    }

    const matchedPreset = findPackagingPresetByLabel(product.packagingClass)
    const nextMeasurementMode = getMeasurementOption(product.measurementUnit)

    reset({
      name: product.name,
      brand: product.brand ?? '',
      category: product.category,
      packagingClass: product.packagingClass,
      measurementUnit: product.measurementUnit,
      measurementValue: product.measurementValue,
      unitsPerPackage: product.unitsPerPackage,
      description: product.description ?? '',
      unitCost: product.originalUnitCost,
      unitPrice: product.originalUnitPrice,
      currency: product.currency,
      stockPackages: product.stockPackages,
      stockLooseUnits: product.stockLooseUnits,
      requiresKitchen: product.requiresKitchen ?? false,
    })
    setSelectedPreset(matchedPreset?.key ?? manualPackagingOption)
    setMeasurementMode(nextMeasurementMode)
  }, [product, reset])

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

    if (!presetKey) {
      setValue('packagingClass', '', { shouldDirty: true, shouldValidate: true })
      return
    }

    if (presetKey === manualPackagingOption) {
      if (!packagingClassValue) {
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

  const handleMeasurementModeChange = (nextValue: string) => {
    setMeasurementMode(nextValue)

    if (nextValue === customMeasurementOption) {
      setValue('measurementUnit', '', { shouldDirty: true, shouldValidate: true })
      return
    }

    setValue('measurementUnit', nextValue, { shouldDirty: true, shouldValidate: true })
  }

  return (
    <div className="imperial-card p-7">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            {product ? 'Editar produto' : 'Novo produto'}
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">
            {product ? 'Atualize os dados do portfólio.' : 'Cadastre um item para o dashboard.'}
          </h2>
        </div>
        {product ? (
          <Button onClick={onCancelEdit} size="sm" type="button" variant="ghost">
            Cancelar
          </Button>
        ) : null}
      </div>

      <form
        className="mt-6 space-y-5"
        onSubmit={handleSubmit((values) => {
          onSubmit(values)
          if (!product) {
            reset(emptyValues)
            setSelectedPreset('')
            setMeasurementMode('UN')
          }
        })}
      >
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
            error={errors.category?.message}
            label="Categoria"
            placeholder="Bebidas"
            {...register('category')}
          />
          <SelectField
            error={!selectedPresetIsManual ? errors.packagingClass?.message : undefined}
            hint="Escolha um perfil pronto ou use Outro para criar um formato próprio."
            label="Classe de cadastro"
            onChange={(event) => handlePresetChange(event.currentTarget.value)}
            options={packagingPresetOptions}
            value={selectedPreset}
          />
        </div>

        {selectedPresetIsManual ? (
          <InputField
            error={errors.packagingClass?.message}
            hint="Descreva como esse item entra no estoque: caixa, fardo, pacote ou outro formato."
            label="Classe personalizada"
            placeholder="Ex.: Caixa com 10 und de 1kg"
            {...register('packagingClass')}
          />
        ) : (
          <>
            <div className="imperial-card-soft px-4 py-4 text-sm text-[var(--text-soft)]">
              <p className="font-medium text-white">Classe ativa</p>
              <p className="mt-2">
                {packagingClassValue || 'Selecione um dos padrões para preencher automaticamente.'}
              </p>
            </div>
            <input type="hidden" value={packagingClassValue} {...register('packagingClass')} />
          </>
        )}

        <div className="grid gap-5 sm:grid-cols-[1.1fr_0.9fr_0.9fr]">
          <SelectField
            error={manualMeasurementMode ? undefined : errors.measurementUnit?.message}
            hint="Use ml, L, kg, g, unidade ou crie outra medida."
            label="Medida"
            onChange={(event) => handleMeasurementModeChange(event.currentTarget.value)}
            options={measurementUnitOptions}
            value={measurementMode}
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

        <div className="imperial-card-soft px-4 py-4 text-sm text-[var(--text-soft)]">
          <p className="font-medium text-white">Leitura rápida do cadastro</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="imperial-card-stat px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">Cada unidade</p>
              <p className="mt-2 text-base font-semibold text-white">
                {formatMeasurement(measurementValue, measurementUnitValue || 'UN')}
              </p>
            </div>
            <div className="imperial-card-stat px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">Cada caixa/fardo</p>
              <p className="mt-2 text-base font-semibold text-white">{unitsPerPackage} und</p>
            </div>
            <div className="imperial-card-stat px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">Estoque calculado</p>
              <p className="mt-2 text-base font-semibold text-white">{calculatedStockTotal} und</p>
            </div>
          </div>
        </div>

        {manualMeasurementMode ? (
          <InputField
            error={errors.measurementUnit?.message}
            label="Outra unidade de medida"
            placeholder="Ex.: pacote, saco, porção"
            {...register('measurementUnit')}
          />
        ) : (
          <input type="hidden" value={measurementUnitValue} {...register('measurementUnit')} />
        )}

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
            hint={
              unitsPerPackage > 1
                ? `Use para unidades soltas. Aqui o máximo natural é ${unitsPerPackage - 1} und antes de virar outra caixa/fardo.`
                : 'Se esse item entra solto no estoque, deixe caixa/fardo em 0 e registre tudo aqui.'
            }
            label="Unidades avulsas em estoque"
            step="1"
            type="number"
            {...register('stockLooseUnits')}
          />
        </div>

        <div className="imperial-card-soft flex items-center justify-between gap-4 px-4 py-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-white">Envia para a cozinha</p>
              {categoryValue && isKitchenCategory(categoryValue) && (
                <span className="rounded-full border border-[rgba(155,132,96,0.3)] bg-[rgba(155,132,96,0.1)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--accent,#9b8460)]">
                  auto
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-[var(--text-soft)]">
              Ative para que os pedidos desse item entrem automaticamente na fila da cozinha (KDS).
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={requiresKitchenValue}
            onClick={() => setValue('requiresKitchen', !requiresKitchenValue, { shouldDirty: true })}
            className="relative shrink-0 h-6 w-11 rounded-full transition-colors"
            style={{ background: requiresKitchenValue ? 'var(--accent, #9b8460)' : 'rgba(255,255,255,0.12)' }}
          >
            <span
              className="absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform"
              style={{ transform: requiresKitchenValue ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </button>
        </div>

        <Button fullWidth loading={loading} size="lg" type="submit">
          {product ? 'Salvar alterações' : 'Cadastrar produto'}
        </Button>
      </form>
    </div>
  )
}
